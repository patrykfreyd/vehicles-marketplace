import type { ApiError } from '@vehicles-marketplace/validation';
import { showToast } from './toast';

/**
 * Plan 04 §7: an `ApiError` with no `fieldErrors` is always toast-able
 * directly from its `message`. When `fieldErrors` IS present, this
 * deliberately does nothing — that error belongs on the form's inline
 * `<FormField>` errors (via RHF's `setError`, see `applyApiFieldErrors` in
 * `form-field.tsx`), and toasting it too would report the same problem
 * twice.
 */
export function showApiErrorToast(error: ApiError): void {
  if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
    return;
  }
  showToast('error', error.message);
}
