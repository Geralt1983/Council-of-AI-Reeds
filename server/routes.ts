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
    let { query, previousCritique, sessionId, roundNumber } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!query) {
      res.write(`data: ${JSON.stringify({ type: "error", message: "Query required" })}\n\n`);
      return res.end();
    }

    const currentRound = roundNumber || 1;

    try {
      if (!sessionId) {
        const session = await storage.createSession({
          query,
          status: "thinking",
          currentRound: 1,
          maxRounds: 3
        });
        sessionId = session.id;
        res.write(`data: ${JSON.stringify({ type: "session_created", sessionId })}\n\n`);
      } else {
        await storage.updateSessionStatus(sessionId, "thinking", currentRound);
      }

      console.log(`Streaming council round ${currentRound} for session ${sessionId}`);

      const workerDrafts: Record<string, string> = { 
        "worker-a": "", 
        "worker-b": "", 
        "worker-c": "" 
      };

      const workerPromises = Object.entries(WORKERS).map(async ([id, persona]) => {
        const messages: OpenAI.ChatCompletionMessageParam[] = [
          { role: "system", content: persona.prompt },
          { role: "user", content: query }
        ];
        
        if (previousCritique) {
          messages.push({ 
            role: "user", 
            content: `CRITICAL FEEDBACK FROM JUDGE: ${previousCritique}. Please refine your answer based on this.` 
          });
        }

        try {
          const stream = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages,
            stream: true,
            temperature: 0.9,
          });

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              workerDrafts[id] += content;
              res.write(`data: ${JSON.stringify({ type: "worker_chunk", workerId: id, chunk: content })}\n\n`);
            }
          }
        } catch (e) {
          console.error(`Error streaming ${id}:`, e);
          workerDrafts[id] = "I am currently unable to think due to an error.";
          res.write(`data: ${JSON.stringify({ type: "worker_chunk", workerId: id, chunk: workerDrafts[id] })}\n\n`);
        }
      });

      await Promise.all(workerPromises);

      res.write(`data: ${JSON.stringify({ type: "workers_complete" })}\n\n`);

      await storage.updateSessionStatus(sessionId, "judging", currentRound);
      res.write(`data: ${JSON.stringify({ type: "judge_thinking" })}\n\n`);

      const combinedDrafts = Object.entries(workerDrafts)
        .map(([id, text]) => `--- ${WORKERS[id as keyof typeof WORKERS].role} ---\n${text}`)
        .join("\n\n");

      const judgePrompt = `You are the Chief Editor. You have received three drafts answering the user's query: "${query}".
    
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

      const judgeResponse = await client.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: judgePrompt }],
        response_format: { type: "json_object" }
      });

      const evaluation = JSON.parse(judgeResponse.choices[0].message.content || "{}");

      await storage.createDrafts(Object.entries(workerDrafts).map(([workerId, content]) => ({
        sessionId,
        workerId,
        round: currentRound,
        content
      })));

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

      res.write(`data: ${JSON.stringify({ type: "judge_result", evaluation, sessionId })}\n\n`);

      console.log(`Council round ${currentRound} complete. Score: ${evaluation.score}. Finalized: ${shouldFinalize}`);

      res.end();

    } catch (error: any) {
      console.error("Stream Error:", error);
      res.write(`data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`);
      res.end();
    }
  });

  return httpServer;
}
