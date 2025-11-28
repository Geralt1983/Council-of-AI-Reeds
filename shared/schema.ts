import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Council Session Schema
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  status: text("status").notNull(), // "thinking" | "judging" | "consensus"
  currentRound: integer("current_round").notNull().default(1),
  maxRounds: integer("max_rounds").notNull().default(2),
  finalConsensus: text("final_consensus"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const drafts = pgTable("drafts", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  workerId: text("worker_id").notNull(), // "worker-a" | "worker-b" | "worker-c"
  round: integer("round").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const evaluations = pgTable("evaluations", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  round: integer("round").notNull(),
  score: integer("score").notNull(),
  critique: text("critique").notNull(),
  synthesis: text("synthesis").notNull(),
  shouldStop: integer("should_stop").notNull().default(0), // 0 or 1 (boolean)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert Schemas
export const insertSessionSchema = createInsertSchema(sessions).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertDraftSchema = createInsertSchema(drafts).omit({ 
  id: true, 
  createdAt: true 
});

export const insertEvaluationSchema = createInsertSchema(evaluations).omit({ 
  id: true, 
  createdAt: true 
});

// Types
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type Draft = typeof drafts.$inferSelect;
export type InsertDraft = z.infer<typeof insertDraftSchema>;

export type Evaluation = typeof evaluations.$inferSelect;
export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;
