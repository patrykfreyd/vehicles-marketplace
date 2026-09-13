import type { ApiError } from '@vehicles-marketplace/validation';
import { showToast } from './toast';

/**
 * Plan 04 §7 — see ui-web's api-error-toast.ts for the full rationale (this
 * is the same rule, mobile side): toast `message` when there's no
 * `fieldErrors`; defer to the form's inline `<FormField>` errors otherwise,
 * so the same problem is never reported twice.
 */
export function showApiErrorToast(error: ApiError): void {
  if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
    return;
  }
  showToast('error', error.message);
}
