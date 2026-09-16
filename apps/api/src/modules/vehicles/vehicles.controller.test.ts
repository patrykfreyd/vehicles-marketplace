import { describe, expect, it } from 'vitest';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { VehiclesController } from './vehicles.controller';

describe('VehiclesController', () => {
  it('gates the whole controller with EmailVerifiedGuard — every route is part of the sell flow (§8)', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, VehiclesController) as
      unknown[] | undefined;
    expect(guards).toContain(EmailVerifiedGuard);
  });
});
