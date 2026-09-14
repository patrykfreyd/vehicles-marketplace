'use client';

/**
 * plans/09-catalogue-import-tooling-admin.md §7/§9 — every `/admin/*`
 * screen is gated by `isAdmin`: fully inaccessible as a non-admin user
 * (redirected home before any admin content renders), reachable as an
 * admin. The real enforcement is server-side (`AdminGuard` on every
 * `catalogue-admin` route, §7) — this is the client-side UX half, so a
 * non-admin never even sees the shell flash before being sent away.
 *
 * `useSession()`'s `isPending` gate mirrors the pattern
 * `apps/mobile/app/_layout.tsx` already uses for session restoration on
 * cold start (Plan 07 §7) — redirect only once we actually know the
 * session state, never while it's still loading.
 */
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Spinner } from '@vehicles-marketplace/ui-web';
import { useSession } from '../_lib/auth-client';

function isAdminUser(user: unknown): boolean {
  return Boolean(user && typeof user === 'object' && 'isAdmin' in user && user.isAdmin === true);
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const admin = isAdminUser(session?.user);

  useEffect(() => {
    if (!isPending && !admin) {
      router.replace('/');
    }
  }, [isPending, admin, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Not rendering admin content for a non-admin, even momentarily, while
  // the redirect above takes effect — this is the "fully inaccessible"
  // half of §9's acceptance criterion.
  if (!admin) return null;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between border-b border-border pb-4">
        <Link href="/admin/catalogue" className="text-lg font-semibold text-text">
          Catalogue Admin
        </Link>
        <Link href="/" className="text-sm text-textMuted hover:text-text">
          Back to site
        </Link>
      </header>
      <main>{children}</main>
    </div>
  );
}
