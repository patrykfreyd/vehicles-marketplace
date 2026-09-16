'use client';

/**
 * plans/10-dvla-lookup-seller-matching.md §6 demo route — mounts the
 * reusable `<VehicleLookupFlow>` standalone, before Plan 20's full "Sell
 * your car" wizard exists to host it (same spirit as
 * apps/web/app/dev/components/page.tsx for Plan 04's components). Every
 * route under this module requires an authenticated, verified-email
 * session (§5) — log in at /login with a verified account first, same as
 * /admin's pages.
 *
 * Try the fixture registrations from `apps/api`'s `FakeDvlaClient`:
 * `YA22GZX` (found — a BMW), `NF00TFD` (not found), `ER00ROR` (simulated
 * DVLA outage).
 */
import { showToast } from '@vehicles-marketplace/ui-web';
import { VehicleLookupFlow } from '../../_components/vehicle-lookup/vehicle-lookup-flow';
import { apiClient } from '../../_lib/api-client';

export default function VehicleLookupDemoPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-semibold text-text">Vehicle lookup (Plan 10 demo)</h1>
      <VehicleLookupFlow
        apiClient={apiClient}
        onConfirmed={(result) =>
          showToast(
            'success',
            result.predictionAccepted
              ? 'Matched automatically — top suggestion confirmed'
              : 'Vehicle confirmed',
          )
        }
        onManualFallback={({ reason }) =>
          showToast('info', `Would hand off to manual catalogue browsing: ${reason}`)
        }
      />
    </main>
  );
}
