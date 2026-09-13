import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DIAGNOSTICS_QUEUE } from './diagnostics.constants';
import { DiagnosticsProcessor } from './diagnostics.processor';

@Module({
  imports: [BullModule.registerQueue({ name: DIAGNOSTICS_QUEUE })],
  providers: [DiagnosticsProcessor],
})
export class DiagnosticsModule {}
