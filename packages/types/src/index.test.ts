import { describe, expect, it } from 'vitest';
import type {
  ApiError,
  CurrentUser,
  FuelType,
  HealthStatus,
  Id,
  PageResponse,
  UserId,
} from './index';

describe('types', () => {
  it('allows a HealthStatus value to be assigned', () => {
    const status: HealthStatus = 'ok';
    expect(status).toBe('ok');
  });

  it('treats a branded Id as a plain string at runtime', () => {
    const userId = 'user_1' as Id<'User'>;
    expect(typeof userId).toBe('string');
  });

  it('re-exports validation-derived types usable without importing zod', () => {
    const error: ApiError = { code: 'NOT_FOUND', message: 'Not found.' };
    const fuel: FuelType = 'ELECTRIC';
    const page: PageResponse<string> = {
      items: ['a'],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    };
    expect(error.code).toBe('NOT_FOUND');
    expect(fuel).toBe('ELECTRIC');
    expect(page.items).toEqual(['a']);
  });

  it('accepts a UserId-branded CurrentUser (Plan 07)', () => {
    const userId = 'usr_01HZX82K7Q4M' as UserId;
    const currentUser: CurrentUser = {
      id: userId,
      email: 'jane@example.com',
      emailVerified: false,
      displayName: null,
      isAdmin: false,
    };
    expect(currentUser.id).toBe(userId);
  });
});
