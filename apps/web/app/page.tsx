import { createHealthCheck } from '@vehicles-marketplace/validation';
import { buildHealthMessage } from './_lib/health-message';

export default function HomePage() {
  const health = createHealthCheck();

  return (
    <main>
      <h1>Vehicles Marketplace</h1>
      <p>{buildHealthMessage(health)}</p>
    </main>
  );
}
