import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().default("file:./.data/keymaster.db"),
  CLASSIFIER_MODEL: z.string().default("claude-haiku-4-5"),
  CLARITY_MODEL: z.string().default("claude-haiku-4-5"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  cached = schema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    CLASSIFIER_MODEL: process.env.CLASSIFIER_MODEL,
    CLARITY_MODEL: process.env.CLARITY_MODEL,
  });
  return cached;
}
