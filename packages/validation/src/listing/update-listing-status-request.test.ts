import { describe, expect, it } from 'vitest';
import { UpdateListingStatusRequestSchema } from './update-listing-status-request';

describe('UpdateListingStatusRequestSchema', () => {
  it('accepts a valid status', () => {
    expect(UpdateListingStatusRequestSchema.safeParse({ status: 'LIVE' }).success).toBe(true);
  });

  it('rejects an unknown status', () => {
    expect(UpdateListingStatusRequestSchema.safeParse({ status: 'EXPIRED' }).success).toBe(false);
  });

  it('rejects a missing status', () => {
    expect(UpdateListingStatusRequestSchema.safeParse({}).success).toBe(false);
  });
});
