import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import type { Auth } from './auth-instance';

function buildContext(request: object, isPublic: boolean) {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(isPublic),
  } as unknown as Reflector;
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, reflector };
}

describe('AuthGuard', () => {
  it('allows a @Public() route through without checking the session', async () => {
    const getSession = vi.fn();
    const auth = { api: { getSession } } as unknown as Auth;
    const { context, reflector } = buildContext({ headers: {} }, true);

    const guard = new AuthGuard(auth, reflector);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(getSession).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when there is no session', async () => {
    const auth = { api: { getSession: vi.fn().mockResolvedValue(null) } } as unknown as Auth;
    const { context, reflector } = buildContext({ headers: {} }, false);

    const guard = new AuthGuard(auth, reflector);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches the mapped CurrentUser to the request and allows the route through', async () => {
    const session = {
      user: {
        id: 'usr_1',
        email: 'jane@example.com',
        emailVerified: true,
        name: 'Jane',
        isAdmin: false,
      },
    };
    const auth = { api: { getSession: vi.fn().mockResolvedValue(session) } } as unknown as Auth;
    const request: { headers: Record<string, string>; user?: unknown } = { headers: {} };
    const { context, reflector } = buildContext(request, false);

    const guard = new AuthGuard(auth, reflector);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'usr_1',
      email: 'jane@example.com',
      emailVerified: true,
      displayName: 'Jane',
      isAdmin: false,
    });
  });
});
