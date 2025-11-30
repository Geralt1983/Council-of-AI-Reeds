import { useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export type SimulationState = "idle" | "thinking" | "judging" | "consensus";

export interface Worker {
  id: string;
  name: string;
  role: string;
  color: string;
  avatar: string;
  description: string;
}

export const WORKERS: Worker[] = [
  {
    id: "worker-a",
    name: "The Skeptic",
    role: "Analyst",
    color: "var(--worker-a)",
    avatar: "🔍",
    description: "Looks for logical inconsistencies and risks."
  },
  {
    id: "worker-b",
    name: "The Visionary",
    role: "Creative",
    color: "var(--worker-b)",
    avatar: "🎨",
    description: "Proposes novel, out-of-the-box ideas."
  },
  {
    id: "worker-c",
    name: "The Realist",
    role: "Pragmatist",
    color: "var(--worker-c)",
    avatar: "⚙️",
    description: "Focuses on efficiency and actionable steps."
  }
];

export interface DraftDisplay {
  workerId: string;
  content: string;
  status: "pending" | "streaming" | "complete";
}

export interface HistoryItem {
  id: string;
  query: string;
  result: string;
  date: string;
  score: number;
}

export function useCouncilSimulation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [status, setStatus] = useState<SimulationState>("idle");
  const [round, setRound] = useState(0);
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<DraftDisplay[]>([]);
  const [critique, setCritique] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [consensus, setConsensus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const sessionIdRef = useRef<number | null>(null);
  const queryRef = useRef<string>("");

  const { data: history = [] } = useQuery<HistoryItem[]>({
    queryKey: ["/api/council/history"],
    queryFn: async () => {
      const res = await fetch("/api/council/history");
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
    staleTime: 30000,
  });

  const canInput = status === "idle" || status === "consensus";
  const isFollowUpReady = status === "consensus" && sessionIdRef.current !== null;

  const runStream = async (payload: { 
    query: string; 
    previousCritique?: string | null;
    sessionId?: number | null;
    roundNumber: number;
  }) => {
    try {
      const response = await fetch("/api/council/run-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      setDrafts(WORKERS.map(w => ({ workerId: w.id, content: "", status: "streaming" as const })));
      setStatus("thinking");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            let data;
            try {
              data = JSON.parse(line.slice(6));
            } catch (parseErr) {
              console.error("Failed to parse SSE data:", parseErr);
              continue;
            }

            if (data.type === "error") {
              setError(data.message || "An error occurred");
              toast({ title: "Error", description: data.message || "Stream error", variant: "destructive" });
              setStatus("idle");
              reader.cancel();
              return;
            }

            if (data.type === "session_created") {
              sessionIdRef.current = data.sessionId;
            }
            
            if (data.type === "worker_chunk") {
              setDrafts(prev => prev.map(d => 
                d.workerId === data.workerId 
                  ? { ...d, content: d.content + data.chunk, status: "streaming" as const } 
                  : d
              ));
            }

            if (data.type === "workers_complete") {
              setDrafts(prev => prev.map(d => ({ ...d, status: "complete" as const })));
            }

            if (data.type === "judge_thinking") {
              setStatus("judging");
            }

            if (data.type === "judge_result") {
              const { synthesis, critique: judgeCritique, score: judgeScore, stop } = data.evaluation;
              
              if (data.sessionId) {
                sessionIdRef.current = data.sessionId;
              }
              
              setCritique(judgeCritique);
              setScore(judgeScore);
              
              const currentRoundNum = payload.roundNumber;
              const shouldFinalize = stop || judgeScore >= 90 || currentRoundNum >= 3;
              
              if (shouldFinalize) {
                setStatus("consensus");
                setConsensus(synthesis);
                queryClient.invalidateQueries({ queryKey: ["/api/council/history"] });
              } else {
                setTimeout(() => {
                  const nextRound = currentRoundNum + 1;
                  setRound(nextRound);
                  runStream({ 
                    query: queryRef.current, 
                    previousCritique: judgeCritique, 
                    sessionId: sessionIdRef.current, 
                    roundNumber: nextRound 
                  });
                }, 3000);
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Stream failed:", err);
      setError(err.message || "Stream connection lost");
      toast({ title: "Error", description: err.message || "Stream connection lost", variant: "destructive" });
      setStatus("idle");
    }
  };

  const submitQuery = useCallback((userQuery: string) => {
    const isFollowUp = status === "consensus" && sessionIdRef.current !== null;
    const sessionToUse = isFollowUp ? sessionIdRef.current : null;
    
    setError(null);
    setQuery(userQuery);
    queryRef.current = userQuery;
    setStatus("thinking");
    setRound(1);
    setScore(0);
    setCritique(null);
    setConsensus(null);
    setDrafts(WORKERS.map(w => ({ workerId: w.id, content: "", status: "pending" as const })));
    
    if (!isFollowUp) {
      sessionIdRef.current = null;
    }

    runStream({ 
      query: userQuery, 
      sessionId: sessionToUse, 
      roundNumber: 1 
    });
  }, [status]);

  const reset = useCallback(() => {
    setStatus("idle");
    setQuery("");
    queryRef.current = "";
    setDrafts([]);
    setConsensus(null);
    setScore(0);
    setCritique(null);
    setRound(0);
    setError(null);
    sessionIdRef.current = null;
  }, []);

  const loadHistory = useCallback((item: HistoryItem) => {
    setQuery(item.query);
    setConsensus(item.result);
    setScore(item.score);
    setStatus("consensus");
    setDrafts([]);
    sessionIdRef.current = null;
  }, []);

  return {
    status,
    round,
    query,
    drafts,
    critique,
    score,
    consensus,
    error,
    submitQuery,
    startSimulation: submitQuery,
    reset,
    history,
    loadHistory,
    canInput,
    isFollowUpReady,
    isPending: status === "thinking" || status === "judging"
  };
}
