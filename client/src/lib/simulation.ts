import { useState, useEffect, useCallback } from "react";

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

export interface Draft {
  workerId: string;
  content: string;
  status: "pending" | "streaming" | "complete";
}

export function useCouncilSimulation() {
  const [status, setStatus] = useState<SimulationState>("idle");
  const [round, setRound] = useState(0);
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [critique, setCritique] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [consensus, setConsensus] = useState<string | null>(null);

  const startSimulation = useCallback((userQuery: string) => {
    setQuery(userQuery);
    setStatus("thinking");
    setRound(1);
    setDrafts(WORKERS.map(w => ({ workerId: w.id, content: "", status: "pending" })));
    setCritique(null);
    setConsensus(null);
    setScore(0);
  }, []);

  // Simulation Loop
  useEffect(() => {
    if (status === "idle" || status === "consensus") return;

    let timeout: NodeJS.Timeout;

    if (status === "thinking") {
      // Simulate typing
      const interval = setInterval(() => {
        setDrafts(prev => prev.map(d => {
          if (d.content.length > 150) return { ...d, status: "complete" };
          // Add random char simulation
          return { ...d, content: d.content + "• ", status: "streaming" };
        }));
      }, 50);

      timeout = setTimeout(() => {
        clearInterval(interval);
        setDrafts(prev => prev.map(d => ({ ...d, status: "complete", content: getMockContent(d.workerId, round) })));
        setStatus("judging");
      }, 3000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }

    if (status === "judging") {
      timeout = setTimeout(() => {
        const newScore = round === 1 ? 65 : 92;
        setScore(newScore);
        setCritique(
          round === 1 
            ? "The proposals lack concrete timelines. The Skeptic needs to be less pessimistic, and the Visionary needs to ground their ideas in reality."
            : "Excellent consensus reached. The plan is actionable, innovative, and risk-aware."
        );
        
        if (round < 2) {
          setTimeout(() => {
             setRound(prev => prev + 1);
             setStatus("thinking");
             // Reset drafts for next round visually (keep content but maybe dim it? or clear it. Let's clear for effect)
             setDrafts(WORKERS.map(w => ({ workerId: w.id, content: "", status: "pending" })));
          }, 4000);
        } else {
          setStatus("consensus");
          setConsensus("After reviewing all perspectives, the Council recommends a hybrid approach: Start with the Realist's immediate action plan to mitigate initial risks (Skeptic's concern), while allocating 20% of resources to the Visionary's experimental features for long-term growth.");
        }
      }, 3000);
      return () => clearTimeout(timeout);
    }

  }, [status, round]);

  return {
    status,
    round,
    query,
    drafts,
    critique,
    score,
    consensus,
    startSimulation
  };
}

function getMockContent(workerId: string, round: number): string {
  const worker = WORKERS.find(w => w.id === workerId);
  if (!worker) return "";

  if (round === 1) {
    if (worker.role === "Analyst") return "Identifying critical failure points. The proposed timeline assumes zero friction, which is statistically improbable. We need a 20% buffer.";
    if (worker.role === "Creative") return "What if we inverted the user journey? Instead of a dashboard, we build a sentient companion interface that predicts needs before they arise.";
    if (worker.role === "Pragmatist") return "We can use existing libraries for 80% of this. Let's ship an MVP in 2 weeks by cutting the 'sentient' features and focusing on core utility.";
  } else {
    if (worker.role === "Analyst") return "Revised: Including the 20% buffer makes this viable. I still have concerns about the companion interface complexity, but the MVP approach mitigates risk.";
    if (worker.role === "Creative") return "Revised: I agree to the MVP, but we must include 'delight' moments in the onboarding to retain the soul of the companion concept.";
    if (worker.role === "Pragmatist") return "Revised: Agreed. MVP scope locked. We will prioritize the standard dashboard but add the 'delight' animations suggested by the Visionary as low-cost high-impact items.";
  }
  return "";
}
