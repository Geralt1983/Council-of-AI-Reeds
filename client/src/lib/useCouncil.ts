import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
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
  const [status, setStatus] = useState<SimulationState>("idle");
  const [round, setRound] = useState(0);
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<DraftDisplay[]>([]);
  const [critique, setCritique] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [consensus, setConsensus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const mutation = useMutation({
    mutationFn: async (payload: { query: string; previousCritique?: string | null }) => {
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
      setDrafts(data.drafts.map((d) => ({ ...d, status: "complete" as const })));
      setCritique(data.evaluation.critique);
      setScore(data.evaluation.score);
      setStatus("judging");

      if (data.evaluation.stop || data.evaluation.score >= 90 || round >= 2) {
        setTimeout(() => {
          setStatus("consensus");
          setConsensus(data.evaluation.synthesis);
          
          const newItem: HistoryItem = {
            id: Date.now().toString(),
            query: query,
            result: data.evaluation.synthesis,
            date: new Date().toLocaleDateString(),
            score: data.evaluation.score
          };
          setHistory(prev => [newItem, ...prev]);
        }, 2000);
      } else {
        setTimeout(() => {
          const nextRound = round + 1;
          setRound(nextRound);
          setStatus("thinking");
          setDrafts(WORKERS.map(w => ({ workerId: w.id, content: "", status: "pending" as const })));
          mutation.mutate({ query: variables.query, previousCritique: data.evaluation.critique });
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
    setDrafts(WORKERS.map(w => ({ workerId: w.id, content: "", status: "pending" as const })));
    mutation.mutate({ query: userQuery });
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
