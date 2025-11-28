import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateWorkerResponse, judgeResponses } from "./lib/openai";
import { insertSessionSchema, insertDraftSchema, insertEvaluationSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Create a new council session
  app.post("/api/sessions", async (req, res) => {
    try {
      const { query, maxRounds = 2 } = req.body;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query is required" });
      }

      const session = await storage.createSession({
        query,
        status: "thinking",
        currentRound: 1,
        maxRounds,
        finalConsensus: null,
      });

      res.json(session);
    } catch (error: any) {
      console.error("Error creating session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate worker drafts for a round
  app.post("/api/sessions/:id/workers", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const { previousCritique } = req.body;

      // Generate drafts from all 3 workers in parallel
      const workerIds = ["worker-a", "worker-b", "worker-c"];
      const draftPromises = workerIds.map(async (workerId) => {
        const content = await generateWorkerResponse(
          workerId,
          session.query,
          previousCritique
        );
        
        return await storage.createDraft({
          sessionId,
          workerId,
          round: session.currentRound,
          content,
        });
      });

      const drafts = await Promise.all(draftPromises);
      await storage.updateSessionStatus(sessionId, "judging");

      res.json(drafts);
    } catch (error: any) {
      console.error("Error generating worker drafts:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Judge evaluates the drafts
  app.post("/api/sessions/:id/judge", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const drafts = await storage.getDraftsBySessionAndRound(
        sessionId,
        session.currentRound
      );

      if (drafts.length !== 3) {
        return res.status(400).json({ error: "All worker drafts must be submitted first" });
      }

      const workerResponses = drafts.map((d) => ({
        workerId: d.workerId,
        content: d.content,
      }));

      const evaluation = await judgeResponses(session.query, workerResponses);

      const savedEvaluation = await storage.createEvaluation({
        sessionId,
        round: session.currentRound,
        score: evaluation.score,
        critique: evaluation.critique,
        synthesis: evaluation.synthesis,
        shouldStop: evaluation.shouldStop ? 1 : 0,
      });

      // Determine next state
      if (evaluation.shouldStop || session.currentRound >= session.maxRounds) {
        await storage.updateSessionConsensus(sessionId, evaluation.synthesis);
      } else {
        await storage.updateSessionStatus(sessionId, "thinking", session.currentRound + 1);
      }

      res.json(savedEvaluation);
    } catch (error: any) {
      console.error("Error judging drafts:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get session with all drafts and evaluations
  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Get all drafts and evaluations for this session
      const allDrafts = [];
      const allEvaluations = [];
      
      for (let round = 1; round <= session.currentRound; round++) {
        const roundDrafts = await storage.getDraftsBySessionAndRound(sessionId, round);
        const roundEval = await storage.getEvaluationBySessionAndRound(sessionId, round);
        
        allDrafts.push(...roundDrafts);
        if (roundEval) allEvaluations.push(roundEval);
      }

      res.json({
        session,
        drafts: allDrafts,
        evaluations: allEvaluations,
      });
    } catch (error: any) {
      console.error("Error fetching session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
