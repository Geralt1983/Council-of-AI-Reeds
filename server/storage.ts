import { 
  type User, 
  type InsertUser,
  type Session,
  type InsertSession,
  type Draft,
  type InsertDraft,
  type Evaluation,
  type InsertEvaluation,
  users,
  sessions,
  drafts,
  evaluations
} from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import { eq, and, desc } from "drizzle-orm";

// Initialize database
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Session methods
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: number): Promise<Session | undefined>;
  updateSessionStatus(id: number, status: string, round?: number): Promise<void>;
  updateSessionConsensus(id: number, consensus: string): Promise<void>;
  
  // Draft methods
  createDraft(draft: InsertDraft): Promise<Draft>;
  getDraftsBySessionAndRound(sessionId: number, round: number): Promise<Draft[]>;
  
  // Evaluation methods
  createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation>;
  getEvaluationBySessionAndRound(sessionId: number, round: number): Promise<Evaluation | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Session methods
  async createSession(session: InsertSession): Promise<Session> {
    const result = await db.insert(sessions).values(session).returning();
    return result[0];
  }

  async getSession(id: number): Promise<Session | undefined> {
    const result = await db.select().from(sessions).where(eq(sessions.id, id));
    return result[0];
  }

  async updateSessionStatus(id: number, status: string, round?: number): Promise<void> {
    const updateData: any = { status, updatedAt: new Date() };
    if (round !== undefined) {
      updateData.currentRound = round;
    }
    await db.update(sessions).set(updateData).where(eq(sessions.id, id));
  }

  async updateSessionConsensus(id: number, consensus: string): Promise<void> {
    await db.update(sessions)
      .set({ finalConsensus: consensus, status: "consensus", updatedAt: new Date() })
      .where(eq(sessions.id, id));
  }

  // Draft methods
  async createDraft(draft: InsertDraft): Promise<Draft> {
    const result = await db.insert(drafts).values(draft).returning();
    return result[0];
  }

  async getDraftsBySessionAndRound(sessionId: number, round: number): Promise<Draft[]> {
    return await db.select().from(drafts)
      .where(and(eq(drafts.sessionId, sessionId), eq(drafts.round, round)))
      .orderBy(drafts.workerId);
  }

  // Evaluation methods
  async createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation> {
    const result = await db.insert(evaluations).values(evaluation).returning();
    return result[0];
  }

  async getEvaluationBySessionAndRound(sessionId: number, round: number): Promise<Evaluation | undefined> {
    const result = await db.select().from(evaluations)
      .where(and(eq(evaluations.sessionId, sessionId), eq(evaluations.round, round)));
    return result[0];
  }
}

export const storage = new DatabaseStorage();
