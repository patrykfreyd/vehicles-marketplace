/**
 * Runtime config loader/validator. Plan 02 owns the real environment
 * variable contract (.env.example, secrets, per-environment behavior) —
 * this file just proves the load-and-validate pattern with one real,
 * trivial field so later plans extend `EnvSchema` instead of inventing
 * their own ad hoc `process.env` reads.
 */
import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof EnvSchema>;

/** Parses and validates `process.env` (or a supplied object) against `EnvSchema`. */
export function loadEnv(env: Record<string, string | undefined> = process.env): Env {
  return EnvSchema.parse(env);
}
