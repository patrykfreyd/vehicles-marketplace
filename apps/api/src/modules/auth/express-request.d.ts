// Augments Express's Request with the field `AuthGuard` attaches (§5:
// "`@CurrentUser()` resolves to a typed object pulled from the verified
// session") and `current-user.decorator.ts` reads back. Ambient — picked up
// automatically by tsconfig's default `include`, no explicit import needed.
import type { CurrentUser } from '@vehicles-marketplace/validation';

declare global {
  namespace Express {
    interface Request {
      user?: CurrentUser;
    }
  }
}

export {};
