import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/** A loading placeholder (§8) — a pulsing block shaped like the content it stands in for. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-border', className)}
      {...props}
    />
  );
}
