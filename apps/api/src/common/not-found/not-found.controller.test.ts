import { describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { NotFoundFallbackController } from './not-found.controller';

describe('NotFoundFallbackController', () => {
  it('throws a NotFoundException for any unmatched route, so it flows through ApiExceptionFilter', () => {
    expect(() => new NotFoundFallbackController().handle()).toThrow(NotFoundException);
  });
});
