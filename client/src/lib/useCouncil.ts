import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  status: "pending" | "complete";
}

export interface HistoryItem {
  id: string;
  query: string;
  result: string;
  date: string;
  score: number;
}

interface RoundResponse {
  sessionId: number;
  drafts: { workerId: string; content: string }[];
  evaluation: {
    synthesis: string;
    critique: string;
    score: number;
    stop: boolean;
  };
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
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);

  const { data: history = [] } = useQuery<HistoryItem[]>({
    queryKey: ["/api/council/history"],
    queryFn: async () => {
      const res = await fetch("/api/council/history");
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
    staleTime: 30000,
  });

  const mutation = useMutation({
    mutationFn: async (payload: { 
      query: string; 
      previousCritique?: string | null;
      sessionId?: number | null;
      roundNumber?: number;
    }) => {
      const res = await fetch("/api/council/run-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to run council round");
      }
      
      return res.json() as Promise<RoundResponse>;
    },
    onSuccess: (data, variables) => {
      if (data.sessionId) {
        setCurrentSessionId(data.sessionId);
      }
      
      setDrafts(data.drafts.map((d) => ({ ...d, status: "complete" as const })));
      setCritique(data.evaluation.critique);
      setScore(data.evaluation.score);
      setStatus("judging");

      const currentRoundNum = variables.roundNumber || 1;

      if (data.evaluation.stop || data.evaluation.score >= 90 || currentRoundNum >= 3) {
        setTimeout(() => {
          setStatus("consensus");
          setConsensus(data.evaluation.synthesis);
          queryClient.invalidateQueries({ queryKey: ["/api/council/history"] });
        }, 2000);
      } else {
        setTimeout(() => {
          const nextRound = currentRoundNum + 1;
          setRound(nextRound);
          setStatus("thinking");
          setDrafts(WORKERS.map(w => ({ workerId: w.id, content: "", status: "pending" as const })));
          mutation.mutate({ 
            query: variables.query, 
            previousCritique: data.evaluation.critique,
            sessionId: data.sessionId,
            roundNumber: nextRound
          });
        }, 4000);
      }
    },
    onError: (err: Error) => {
      console.error(err);
      setError(err.message);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setStatus("idle");
    }
  });

  const startSimulation = useCallback((userQuery: string) => {
    setError(null);
    setQuery(userQuery);
    setStatus("thinking");
    setRound(1);
    setConsensus(null);
    setScore(0);
    setCritique(null);
    setCurrentSessionId(null);
    setDrafts(WORKERS.map(w => ({ workerId: w.id, content: "", status: "pending" as const })));
    mutation.mutate({ query: userQuery, sessionId: null, roundNumber: 1 });
  }, [mutation]);

  const reset = useCallback(() => {
    setStatus("idle");
    setQuery("");
    setDrafts([]);
    setConsensus(null);
    setScore(0);
    setCritique(null);
    setRound(0);
    setError(null);
    setCurrentSessionId(null);
  }, []);

  const loadHistory = useCallback((item: HistoryItem) => {
    setQuery(item.query);
    setConsensus(item.result);
    setScore(item.score);
    setStatus("consensus");
    setDrafts([]);
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
    startSimulation,
    reset,
    history,
    loadHistory,
    isPending: mutation.isPending
  };
}
