'use client';

import Link from 'next/link';
import { createHealthCheck } from '@vehicles-marketplace/validation';
import { Button } from '@vehicles-marketplace/ui-web';
import { buildHealthMessage } from './_lib/health-message';
import { authClient, useSession } from './_lib/auth-client';

export default function HomePage() {
  const health = createHealthCheck();
  const { data: session } = useSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
      <h1 className="text-2xl font-semibold">Vehicles Marketplace</h1>
      <p>{buildHealthMessage(health)}</p>
      {session ? (
        <>
          <p>Logged in as {session.user.email}</p>
          <Button variant="secondary" onClick={() => void authClient.signOut()}>
            Log out
          </Button>
        </>
      ) : (
        <div className="flex gap-4">
          <Link href="/login" className="text-primary underline">
            Log in
          </Link>
          <Link href="/register" className="text-primary underline">
            Create an account
          </Link>
        </div>
      )}
    </main>
  );
}
