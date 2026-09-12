import { buildHealthMessage } from './health-message';

describe('buildHealthMessage', () => {
  it('includes the status and timestamp', () => {
    const message = buildHealthMessage({ status: 'ok', timestamp: '2026-01-01T00:00:00.000Z' });
    expect(message).toBe('Mobile app is alive. Health check: ok @ 2026-01-01T00:00:00.000Z');
  });
});
