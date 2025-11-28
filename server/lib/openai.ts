import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const WORKER_PERSONAS = {
  "worker-a": {
    name: "The Skeptic",
    systemPrompt: "You are a SKEPTICAL analyst. Look for facts, logical inconsistencies, and potential risks. Be critical but constructive. Your job is to identify what could go wrong and what's missing from the analysis."
  },
  "worker-b": {
    name: "The Visionary",
    systemPrompt: "You are a CREATIVE thinker. Look for novel solutions, out-of-the-box ideas, and innovative approaches. Your job is to push boundaries and imagine possibilities others might miss."
  },
  "worker-c": {
    name: "The Realist",
    systemPrompt: "You are a PRAGMATIC realist. Focus on what is actionable, efficient, and immediately implementable. Your job is to create practical, step-by-step solutions that work in the real world."
  }
};

export async function generateWorkerResponse(
  workerId: string,
  query: string,
  previousCritique?: string
): Promise<string> {
  const persona = WORKER_PERSONAS[workerId as keyof typeof WORKER_PERSONAS];
  if (!persona) throw new Error(`Unknown worker: ${workerId}`);

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: persona.systemPrompt },
    { role: "user", content: query }
  ];

  if (previousCritique) {
    messages.push({
      role: "user",
      content: `CRITICAL FEEDBACK FROM JUDGE: ${previousCritique}. Please refine your answer based on this feedback.`
    });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Using gpt-4o-mini for workers (fast/cheap)
    messages,
  });

  return response.choices[0].message.content || "";
}

export async function judgeResponses(
  query: string,
  workerResponses: { workerId: string; content: string }[]
): Promise<{
  synthesis: string;
  critique: string;
  score: number;
  shouldStop: boolean;
}> {
  const combined = workerResponses
    .map((r) => {
      const persona = WORKER_PERSONAS[r.workerId as keyof typeof WORKER_PERSONAS];
      return `--- ${persona.name} ---\n${r.content}`;
    })
    .join("\n\n");

  const judgePrompt = `You are the Chief Editor. You have received three drafts answering the user's query: "${query}".

Drafts:
${combined}

Your goal is to reach consensus.
1. Synthesize the best parts of all three into a coherent summary.
2. Provide specific critique on what is missing or conflicting.
3. Rate the current quality (0-100).

Return ONLY valid JSON in this format:
{
  "synthesis": "The summary of the best points...",
  "critique": "Instructions for the workers on how to improve...",
  "score": 85,
  "shouldStop": false
}

Set shouldStop to true if the score is above 90.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    messages: [{ role: "user", content: judgePrompt }],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");

  return {
    synthesis: result.synthesis || "",
    critique: result.critique || "",
    score: result.score || 0,
    shouldStop: result.shouldStop || false,
  };
}
