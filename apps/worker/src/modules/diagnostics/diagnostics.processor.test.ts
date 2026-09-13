import { describe, expect, it } from 'vitest';
import type { Job } from 'bullmq';
import { DiagnosticsProcessor, type DiagnosticsJobData } from './diagnostics.processor';

describe('DiagnosticsProcessor', () => {
  it('echoes the job’s nonce back with a processedAt timestamp', async () => {
    const processor = new DiagnosticsProcessor();
    const job = { data: { nonce: 'abc-123' } } as Job<DiagnosticsJobData>;

    const result = await processor.process(job);

    expect(result.nonce).toBe('abc-123');
    expect(new Date(result.processedAt).toString()).not.toBe('Invalid Date');
  });
});
