// Throwaway stub — see listings.controller.ts's top comment. Plan 11 owns
// the real ListingsModule.
import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';

@Module({
  controllers: [ListingsController],
})
export class ListingsModule {}
