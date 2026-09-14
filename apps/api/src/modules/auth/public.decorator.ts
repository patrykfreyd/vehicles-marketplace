/**
 * plans/07-authentication-authorization.md §5 — `AuthGuard` is registered
 * globally; every route requires a valid session by default. `@Public()`
 * opts a route out explicitly, so exposing something is a conscious choice,
 * not the reverse.
 */
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
