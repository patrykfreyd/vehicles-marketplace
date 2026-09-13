/**
 * Throwaway schema for Plan 04's `/dev/components` demo route (§10: "this
 * plan's demo form uses a throwaway schema just to prove the pattern" —
 * not a real domain entity, which is why it lives under `demo/` rather
 * than alongside the enum/common schemas above it).
 *
 * `email` exercises the sync branch of §6 (format/required, validated
 * instantly by Zod on every keystroke); `username` exercises the async
 * branch — the demo route debounces a simulated "is this taken?" check and
 * reports it through the same `<FormField>` error slot via `setError`,
 * since a real uniqueness check can't be expressed as a synchronous Zod
 * rule.
 */
import { z } from 'zod';

export const DemoContactFormSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-z0-9_]+$/i, 'Letters, numbers, and underscores only'),
});

export type DemoContactFormValues = z.infer<typeof DemoContactFormSchema>;

/** Usernames the demo's simulated async check treats as already taken. */
export const DEMO_TAKEN_USERNAMES = ['admin', 'test', 'taken'];
