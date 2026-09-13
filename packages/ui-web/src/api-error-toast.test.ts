import { describe, expect, it, vi } from 'vitest';
import type { ApiError } from '@vehicles-marketplace/validation';

const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock('./toast', () => ({ showToast }));

const { showApiErrorToast } = await import('./api-error-toast');

describe('showApiErrorToast', () => {
  it('toasts message when there are no fieldErrors', () => {
    showToast.mockClear();
    const error: ApiError = { code: 'INTERNAL', message: 'Something went wrong' };

    showApiErrorToast(error);

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith('error', 'Something went wrong');
  });

  it('does not toast when fieldErrors is present — those render inline instead', () => {
    showToast.mockClear();
    const error: ApiError = {
      code: 'VALIDATION',
      message: 'Validation failed',
      fieldErrors: { email: ['Already registered'] },
    };

    showApiErrorToast(error);

    expect(showToast).not.toHaveBeenCalled();
  });

  it('toasts when fieldErrors is present but empty', () => {
    showToast.mockClear();
    const error: ApiError = { code: 'VALIDATION', message: 'Validation failed', fieldErrors: {} };

    showApiErrorToast(error);

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith('error', 'Validation failed');
  });
});
