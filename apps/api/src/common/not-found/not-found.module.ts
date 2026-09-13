import { Module } from '@nestjs/common';
import { NotFoundFallbackController } from './not-found.controller';

@Module({ controllers: [NotFoundFallbackController] })
export class NotFoundFallbackModule {}
