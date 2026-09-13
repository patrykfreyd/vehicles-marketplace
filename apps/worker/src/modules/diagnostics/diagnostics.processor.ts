import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { DIAGNOSTICS_QUEUE } from './diagnostics.constants';

export interface DiagnosticsJobData {
  nonce: string;
}

export interface DiagnosticsJobResult {
  nonce: string;
  processedAt: string;
}

@Processor(DIAGNOSTICS_QUEUE)
export class DiagnosticsProcessor extends WorkerHost {
  async process(job: Job<DiagnosticsJobData>): Promise<DiagnosticsJobResult> {
    return { nonce: job.data.nonce, processedAt: new Date().toISOString() };
  }
}
