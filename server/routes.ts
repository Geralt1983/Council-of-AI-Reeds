import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import { storage } from "./storage";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const WORKERS = {
  "worker-a": {
    role: "The Skeptic",
    prompt: `You are a BRUTAL RISK ANALYST. Your goal is to tear the user's idea apart to save them from failure.

RULES:
1. NO generic advice ("Do your research", "Consult a pro").
2. NO hedging ("This depends on factors...").
3. Focus purely on: Hidden costs, single points of failure, legal traps, and worst-case scenarios.
4. Be direct, cynical, and use short, punchy sentences.
5. If the idea is good, find the ONE thing that will kill it.
6. Keep it concise (3-4 sentences max).

Tone: Dr. House meets a Forensic Accountant.`
  },
  "worker-b": {
    role: "The Visionary",
    prompt: `You are a FUTURIST and ACCELERATIONIST. Your goal is to explode the scope of the user's idea.

RULES:
1. Ignore budget, laws, and current technical limitations.
2. Focus on: First principles, exponential growth, and "Zero to One" innovation.
3. Use analogies from history or sci-fi.
4. If the user asks for a feature, give them a platform. If they ask for a store, give them an economy.
5. Never say "It might be difficult."
6. Keep it concise (3-4 sentences max).

Tone: Steve Jobs meeting a Sci-Fi Author.`
  },
  "worker-c": {
    role: "The Realist",
    prompt: `You are a BOOTSTRAP FOUNDER with $0 budget. Your goal is execution. How do we launch THIS AFTERNOON?

RULES:
1. Cut 90% of the features. What is the MVP?
2. Focus on: Manual workarounds, "Wizard of Oz" tactics, and using existing tools (Zapier, Excel, Notion) instead of code.
3. Call out "Fake Work" (meetings, logos, planning).
4. Give a numbered list of steps for the next 24 hours.
5. Keep it concise (3-4 sentences max).

Tone: A tired but effective Senior Engineer.`
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
      let context = "";

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
        const existingSession = await storage.getSession(sessionId);
        if (existingSession?.finalConsensus) {
          context = `\n\nBACKGROUND CONTEXT (The Council previously decided): "${existingSession.finalConsensus}".\nThe user is now asking a follow-up question. Build on this context.`;
        }
        await storage.updateSessionStatus(sessionId, "thinking", currentRound);
      }

      console.log(`Streaming council round ${currentRound} for session ${sessionId}${context ? " (follow-up)" : ""}`);

      const workerDrafts: Record<string, string> = { 
        "worker-a": "", 
        "worker-b": "", 
        "worker-c": "" 
      };

      const workerPromises = Object.entries(WORKERS).map(async ([id, persona]) => {
        const systemPrompt = context ? persona.prompt + context : persona.prompt;
        const messages: OpenAI.ChatCompletionMessageParam[] = [
          { role: "system", content: systemPrompt },
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

      const judgePrompt = `You are the CHIEF STRATEGIST. Three advisors have analyzed the user's query: "${query}".
${context ? `\nPrevious Context: ${context}` : ""}

Drafts:
${combinedDrafts}

Your job is to synthesize a MASTER PLAN from these conflicting views.

RULES:
1. DO NOT simply summarize ("Worker A said X, Worker B said Y").
2. Pick a winner. Which perspective is most critical RIGHT NOW?
3. Combine the Visionary's goal with the Realist's steps, using the Skeptic's warnings as guardrails.
4. Be decisive. Give the user a clear next step.
5. If the responses are generic or unhelpful, call that out and demand specifics.
${context ? "6. Build on the previous consensus - don't repeat it, extend it." : ""}

Return ONLY valid JSON in this format:
{
    "synthesis": "The actionable master plan combining all perspectives...",
    "critique": "Specific instructions for improvement (if needed)...",
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
