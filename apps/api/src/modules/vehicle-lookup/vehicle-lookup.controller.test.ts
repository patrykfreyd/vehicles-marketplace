import { describe, expect, it } from 'vitest';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { DvlaLookupThrottleGuard } from './dvla-lookup-throttle.guard';
import { VehicleLookupController } from './vehicle-lookup.controller';

describe('VehicleLookupController', () => {
  it('guards every route with EmailVerifiedGuard (§5: "authenticated, verified-email user")', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, VehicleLookupController) as
      unknown[] | undefined;
    expect(guards).toContain(EmailVerifiedGuard);
  });

  it('additionally throttles POST /dvla with DvlaLookupThrottleGuard (§5)', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      VehicleLookupController.prototype.lookupDvla,
    ) as unknown[] | undefined;
    expect(guards).toContain(DvlaLookupThrottleGuard);
  });
});
