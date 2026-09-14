import { z } from 'zod';

/**
 * Shared password-strength rule (plans/07-authentication-authorization.md
 * §6: "Password field validates strength (min length, etc.) live"). Kept
 * intentionally simple — length plus one letter and one number — rather
 * than a byzantine character-class checklist; every message here is the one
 * that ends up rendered directly below the field, per Plan 03 §8.
 */
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-zA-Z]/, 'Password must include at least one letter')
  .regex(/[0-9]/, 'Password must include at least one number');
