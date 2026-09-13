import { describe, expect, it } from 'vitest';
import { DemoContactFormSchema } from './contact-form';

describe('DemoContactFormSchema', () => {
  it('accepts a valid email and username', () => {
    const result = DemoContactFormSchema.safeParse({
      email: 'buyer@example.com',
      username: 'buyer_1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed email', () => {
    const result = DemoContactFormSchema.safeParse({ email: 'not-an-email', username: 'buyer1' });
    expect(result.success).toBe(false);
  });

  it('rejects a username that is too short', () => {
    const result = DemoContactFormSchema.safeParse({ email: 'buyer@example.com', username: 'ab' });
    expect(result.success).toBe(false);
  });

  it('rejects a username with disallowed characters', () => {
    const result = DemoContactFormSchema.safeParse({
      email: 'buyer@example.com',
      username: 'buyer!',
    });
    expect(result.success).toBe(false);
  });
});
