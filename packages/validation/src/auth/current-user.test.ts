import { describe, expect, it } from 'vitest';
import { CurrentUserSchema } from './current-user';

const valid = {
  id: 'usr_01HZX82K7Q4M',
  email: 'jane@example.com',
  emailVerified: false,
  displayName: 'Jane',
  isAdmin: false,
};

describe('CurrentUserSchema', () => {
  it('accepts a fully-populated current user', () => {
    expect(CurrentUserSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a null displayName', () => {
    expect(CurrentUserSchema.safeParse({ ...valid, displayName: null }).success).toBe(true);
  });

  it('rejects a missing isAdmin', () => {
    const { isAdmin: _isAdmin, ...rest } = valid;
    expect(CurrentUserSchema.safeParse(rest).success).toBe(false);
  });
});
