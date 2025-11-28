import { useState, useEffect, useCallback } from "react";
import { createSession, generateWorkerDrafts, judgeSession } from "./api";
import type { Session, Draft, Evaluation } from "@shared/schema";

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

export function useCouncilSimulation() {
  const [status, setStatus] = useState<SimulationState>("idle");
  const [round, setRound] = useState(0);
  const [query, setQuery] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<DraftDisplay[]>([]);
  const [critique, setCritique] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [consensus, setConsensus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startSimulation = useCallback(async (userQuery: string) => {
    try {
      setError(null);
      setQuery(userQuery);
      setStatus("thinking");
      setRound(1);
      setDrafts(WORKERS.map(w => ({ workerId: w.id, content: "", status: "pending" })));
      setCritique(null);
      setConsensus(null);
      setScore(0);

      // Create session
      const session = await createSession(userQuery, 2);
      setSessionId(session.id);

      // Generate first round of drafts
      setDrafts(WORKERS.map(w => ({ workerId: w.id, content: "", status: "streaming" })));
      const workerDrafts = await generateWorkerDrafts(session.id);
      
      setDrafts(workerDrafts.map(d => ({
        workerId: d.workerId,
        content: d.content,
        status: "complete"
      })));

      setStatus("judging");
    } catch (err: any) {
      setError(err.message);
      setStatus("idle");
    }
  }, []);

  // Auto-judge when status changes to judging
  useEffect(() => {
    if (status !== "judging" || !sessionId) return;

    const runJudge = async () => {
      try {
        const evaluation = await judgeSession(sessionId);
        
        setScore(evaluation.score);
        setCritique(evaluation.critique);

        // Check if we should continue or stop
        if (evaluation.shouldStop === 1 || round >= 2) {
          setConsensus(evaluation.synthesis);
          setStatus("consensus");
        } else {
          // Move to next round
          setTimeout(async () => {
            setRound(round + 1);
            setStatus("thinking");
            setDrafts(WORKERS.map(w => ({ workerId: w.id, content: "", status: "streaming" })));

            const nextDrafts = await generateWorkerDrafts(sessionId, evaluation.critique);
            setDrafts(nextDrafts.map(d => ({
              workerId: d.workerId,
              content: d.content,
              status: "complete"
            })));

            setStatus("judging");
          }, 3000);
        }
      } catch (err: any) {
        setError(err.message);
      }
    };

    runJudge();
  }, [status, sessionId, round]);

  return {
    status,
    round,
    query,
    drafts,
    critique,
    score,
    consensus,
    error,
    startSimulation
  };
}
