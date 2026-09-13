'use client';

/**
 * The one thin wrapper around Sonner (Plan 04 §7) — calling code never
 * imports `sonner` directly, so swapping the underlying library later (or
 * keeping web/mobile call sites identical) only touches this file.
 */
import { toast as sonnerToast, Toaster as SonnerToaster } from 'sonner';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ShowToastOptions {
  description?: string;
  durationMs?: number;
}

/**
 * Fires a transient toast. Every success confirmation, non-blocking error,
 * and background-job result should go through this — never `window.alert`.
 * The one exception is a destructive confirmation, which needs an explicit
 * yes/no and belongs in `<ConfirmDialog>` instead (§7).
 */
export function showToast(
  variant: ToastVariant,
  message: string,
  options?: ShowToastOptions,
): void {
  sonnerToast[variant](message, {
    description: options?.description,
    duration: options?.durationMs,
  });
}

/**
 * Mount once near the app root (inside `<ThemeProvider>` so it can read
 * `next-themes`' resolved theme). `richColors` gives each variant its
 * semantic tint out of the box; positioning/duration defaults are Sonner's
 * own, which are already sane.
 */
export function Toaster() {
  return <SonnerToaster richColors closeButton position="bottom-right" theme="system" />;
}
