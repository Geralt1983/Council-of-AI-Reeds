import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import { storage } from "./storage";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const WORKERS = {
  "worker-a": {
    role: "The Skeptic",
    prompt: "You are a SKEPTICAL analyst. Look for facts, logical inconsistencies, and risks. Be harsh but constructive. Keep your response concise (2-3 sentences)."
  },
  "worker-b": {
    role: "The Visionary",
    prompt: "You are a CREATIVE thinker. Look for novel solutions, out-of-the-box ideas, and future possibilities. Ignore constraints. Keep your response concise (2-3 sentences)."
  },
  "worker-c": {
    role: "The Realist",
    prompt: "You are a PRAGMATIC realist. Focus on what is actionable, efficient, and can be implemented immediately with current resources. Keep your response concise (2-3 sentences)."
  }
};

async function getWorkerResponse(workerId: string, query: string, critique?: string) {
  const worker = WORKERS[workerId as keyof typeof WORKERS];
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: worker.prompt },
    { role: "user", content: query }
  ];

  if (critique) {
    messages.push({ 
      role: "user", 
      content: `CRITICAL FEEDBACK FROM JUDGE: ${critique}. Please refine your answer based on this.` 
    });
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
    });
    return response.choices[0].message.content || "";
  } catch (e) {
    console.error(`Error getting response for ${workerId}:`, e);
    return "I am currently unable to think due to an error.";
  }
}

async function getJudgeEvaluation(query: string, drafts: Record<string, string>) {
  const combinedDrafts = Object.entries(drafts)
    .map(([id, text]) => `--- ${WORKERS[id as keyof typeof WORKERS].role} ---\n${text}`)
    .join("\n\n");

  const prompt = `You are the Chief Editor. You have received three drafts answering the user's query: "${query}".
    
Drafts:
${combinedDrafts}

Your goal is to reach consensus.
1. Synthesize the best parts of all three into a summary.
2. Provide specific critique on what is missing or conflicting.
3. Rate the current quality (0-100).

Return ONLY valid JSON in this format:
{
    "synthesis": "The summary of the best points...",
    "critique": "Instructions for the workers on how to improve...",
    "score": 85,
    "stop": true or false (true if score > 90)
}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (e) {
    console.error("Error getting judge evaluation:", e);
    return { synthesis: "Error in judging.", critique: "Error.", score: 0, stop: true };
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  
  app.get("/api/council/history", async (req, res) => {
    try {
      const sessions = await storage.getAllSessions();
      
      const history = await Promise.all(sessions
        .filter(s => s.status === "consensus" && s.finalConsensus)
        .map(async (s) => {
          const latestEval = await storage.getEvaluationBySessionAndRound(s.id, s.currentRound);
          return {
            id: s.id.toString(),
            query: s.query,
            result: s.finalConsensus || "",
            date: s.createdAt ? new Date(s.createdAt).toLocaleString() : "",
            score: latestEval?.score || 0
          };
        }));
      
      res.json(history);
    } catch (error: any) {
      console.error("Error fetching history:", error);
      res.status(500).json({ message: error.message || "Failed to fetch history" });
    }
  });

  app.post("/api/council/run-round", async (req, res) => {
    try {
      let { query, previousCritique, sessionId, roundNumber } = req.body;

      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }

      const currentRound = roundNumber || 1;

      if (!sessionId) {
        const session = await storage.createSession({
          query,
          status: "thinking",
          currentRound: 1,
          maxRounds: 3
        });
        sessionId = session.id;
      } else {
        await storage.updateSessionStatus(sessionId, "thinking", currentRound);
      }

      console.log(`Running council round ${currentRound} for session ${sessionId}: "${query.substring(0, 50)}..."`);

      const workerPromises = Object.keys(WORKERS).map(async (id) => {
        const content = await getWorkerResponse(id, query, previousCritique);
        return { workerId: id, content };
      });

      const results = await Promise.all(workerPromises);
      
      await storage.createDrafts(results.map(r => ({
        sessionId,
        workerId: r.workerId,
        round: currentRound,
        content: r.content
      })));

      const draftsMap: Record<string, string> = {};
      results.forEach(r => draftsMap[r.workerId] = r.content);

      await storage.updateSessionStatus(sessionId, "judging", currentRound);

      const evaluation = await getJudgeEvaluation(query, draftsMap);

      await storage.createEvaluation({
        sessionId,
        round: currentRound,
        score: evaluation.score || 0,
        critique: evaluation.critique || "",
        synthesis: evaluation.synthesis || "",
        shouldStop: (evaluation.stop || evaluation.score >= 90) ? 1 : 0
      });

      const shouldFinalize = evaluation.stop || evaluation.score >= 90 || currentRound >= 3;
      
      if (shouldFinalize) {
        await storage.updateSessionConsensus(sessionId, evaluation.synthesis);
      }

      console.log(`Council round ${currentRound} complete. Score: ${evaluation.score}. Finalized: ${shouldFinalize}`);

      res.json({
        sessionId,
        drafts: results.map(r => ({ workerId: r.workerId, content: r.content, status: "complete" })),
        evaluation
      });

    } catch (error: any) {
      console.error("Council Error:", error);
      res.status(500).json({ message: error.message || "Internal Server Error" });
    }
  });

  return httpServer;
}
