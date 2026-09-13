import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn-style class helper: conditional classes via `clsx`, then dedupe conflicting Tailwind utilities via `tailwind-merge` (e.g. `cn('p-2', condition && 'p-4')` resolves to just `p-4`). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
