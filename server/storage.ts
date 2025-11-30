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
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq, and, desc } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL!);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: number): Promise<Session | undefined>;
  getAllSessions(): Promise<Session[]>;
  updateSessionStatus(id: number, status: string, round?: number): Promise<void>;
  updateSessionConsensus(id: number, consensus: string): Promise<void>;
  
  createDraft(draft: InsertDraft): Promise<Draft>;
  createDrafts(draftsList: InsertDraft[]): Promise<Draft[]>;
  getDraftsBySessionAndRound(sessionId: number, round: number): Promise<Draft[]>;
  
  createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation>;
  getEvaluationBySessionAndRound(sessionId: number, round: number): Promise<Evaluation | undefined>;
}

export class DatabaseStorage implements IStorage {
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

  async createSession(session: InsertSession): Promise<Session> {
    const result = await db.insert(sessions).values(session).returning();
    return result[0];
  }

  async getSession(id: number): Promise<Session | undefined> {
    const result = await db.select().from(sessions).where(eq(sessions.id, id));
    return result[0];
  }

  async getAllSessions(): Promise<Session[]> {
    return await db.select().from(sessions).orderBy(desc(sessions.createdAt));
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

  async createDraft(draft: InsertDraft): Promise<Draft> {
    const result = await db.insert(drafts).values(draft).returning();
    return result[0];
  }

  async createDrafts(draftsList: InsertDraft[]): Promise<Draft[]> {
    if (draftsList.length === 0) return [];
    const result = await db.insert(drafts).values(draftsList).returning();
    return result;
  }

  async getDraftsBySessionAndRound(sessionId: number, round: number): Promise<Draft[]> {
    return await db.select().from(drafts)
      .where(and(eq(drafts.sessionId, sessionId), eq(drafts.round, round)))
      .orderBy(drafts.workerId);
  }

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
