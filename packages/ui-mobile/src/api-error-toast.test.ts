import type { ApiError } from '@vehicles-marketplace/validation';
import { showToast } from './toast';
import { showApiErrorToast } from './api-error-toast';

jest.mock('./toast', () => ({ showToast: jest.fn() }));

const showToastMock = showToast as jest.Mock;

describe('showApiErrorToast', () => {
  beforeEach(() => {
    showToastMock.mockClear();
  });

  it('toasts message when there are no fieldErrors', () => {
    const error: ApiError = { code: 'INTERNAL', message: 'Something went wrong' };

    showApiErrorToast(error);

    expect(showToastMock).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith('error', 'Something went wrong');
  });

  it('does not toast when fieldErrors is present — those render inline instead', () => {
    const error: ApiError = {
      code: 'VALIDATION',
      message: 'Validation failed',
      fieldErrors: { email: ['Already registered'] },
    };

    showApiErrorToast(error);

    expect(showToastMock).not.toHaveBeenCalled();
  });

  it('toasts when fieldErrors is present but empty', () => {
    const error: ApiError = { code: 'VALIDATION', message: 'Validation failed', fieldErrors: {} };

    showApiErrorToast(error);

    expect(showToastMock).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith('error', 'Validation failed');
  });
});
