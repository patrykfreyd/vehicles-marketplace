import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import type Redis from 'ioredis';
import { AiSearchController } from './ai-search.controller';
import { AiSearchThrottleGuard, AI_RATE_LIMIT_SCRIPT } from './ai-search-throttle.guard';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { AuthGuard } from '../auth/auth.guard';
import type { Auth } from '../auth/auth-instance';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';

function context(user?: { id: string; emailVerified: boolean }): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user, headers: {} }) }),
    getHandler: () => AiSearchController.prototype.message,
    getClass: () => AiSearchController,
  } as unknown as ExecutionContext;
}
describe('AI endpoint access', () => {
  it('requires authentication plus verification before the paid-feature limiter on both routes', async () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AiSearchController) as unknown[];
    expect(guards).toEqual([EmailVerifiedGuard, AiSearchThrottleGuard]);
    for (const handler of [
      AiSearchController.prototype.message,
      AiSearchController.prototype.carFinder,
    ]) {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).not.toBe(true);
    }
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, AiSearchController)).not.toBe(true);
    const auth = new AuthGuard(
      { api: { getSession: vi.fn().mockResolvedValue(null) } } as unknown as Auth,
      new Reflector(),
    );
    await expect(auth.canActivate(context())).rejects.toThrow('Authentication required');
    expect(() =>
      new EmailVerifiedGuard().canActivate(context({ id: 'user', emailVerified: false })),
    ).toThrow('Verify your email');
    expect(new EmailVerifiedGuard().canActivate(context({ id: 'user', emailVerified: true }))).toBe(
      true,
    );
  });
  it('uses one atomic rolling-hour user bucket and rejects the 61st message', async () => {
    const evalScript = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    const guard = new AiSearchThrottleGuard({ eval: evalScript } as unknown as Redis);
    const ctx = context({ id: 'user', emailVerified: true });
    expect(await guard.canActivate(ctx)).toBe(true);
    await expect(guard.canActivate(ctx)).rejects.toThrow('60 AI messages per hour');
    expect(evalScript).toHaveBeenCalledWith(
      AI_RATE_LIMIT_SCRIPT,
      1,
      'AI_SEARCH_RATE:user',
      expect.any(Number),
      expect.any(String),
    );
    expect(AI_RATE_LIMIT_SCRIPT).toContain('>= 60');
  });
});
