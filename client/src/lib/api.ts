import type { Session, Draft, Evaluation } from "@shared/schema";

export async function createSession(query: string, maxRounds: number = 2): Promise<Session> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, maxRounds }),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create session");
  }
  
  return res.json();
}

export async function generateWorkerDrafts(
  sessionId: number,
  previousCritique?: string
): Promise<Draft[]> {
  const res = await fetch(`/api/sessions/${sessionId}/workers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ previousCritique }),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to generate worker drafts");
  }
  
  return res.json();
}

export async function judgeSession(sessionId: number): Promise<Evaluation> {
  const res = await fetch(`/api/sessions/${sessionId}/judge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to judge session");
  }
  
  return res.json();
}

export async function getSession(sessionId: number): Promise<{
  session: Session;
  drafts: Draft[];
  evaluations: Evaluation[];
}> {
  const res = await fetch(`/api/sessions/${sessionId}`);
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch session");
  }
  
  return res.json();
}
