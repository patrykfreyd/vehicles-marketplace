import { describe, expect, it } from 'vitest';
import { toCurrentUser } from './current-user.mapper';

describe('toCurrentUser', () => {
  it("maps Better Auth's `name` field onto displayName", () => {
    const result = toCurrentUser({
      id: 'usr_1',
      email: 'jane@example.com',
      emailVerified: true,
      name: 'Jane',
      isAdmin: false,
    });
    expect(result).toEqual({
      id: 'usr_1',
      email: 'jane@example.com',
      emailVerified: true,
      displayName: 'Jane',
      isAdmin: false,
    });
  });

  it('defaults displayName to null and isAdmin to false when absent', () => {
    const result = toCurrentUser({ id: 'usr_2', email: 'a@example.com', emailVerified: false });
    expect(result.displayName).toBeNull();
    expect(result.isAdmin).toBe(false);
  });

  it('only treats a literal boolean true as admin', () => {
    const result = toCurrentUser({
      id: 'usr_3',
      email: 'a@example.com',
      emailVerified: false,
      isAdmin: 'true',
    });
    expect(result.isAdmin).toBe(false);
  });
});
