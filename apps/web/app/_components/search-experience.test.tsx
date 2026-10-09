// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ButtonHTMLAttributes, InputHTMLAttributes } from 'react';
import { SearchExperience } from './search-experience';

const { post, toast, session } = vi.hoisted(() => ({
  post: vi.fn(),
  toast: vi.fn(),
  session: { verified: true },
}));
vi.mock('../_lib/api-client', () => ({ apiClient: { POST: post } }));
vi.mock('../_lib/auth-client', () => ({
  useSession: () => ({
    data: { user: { id: 'user', emailVerified: session.verified } },
    isPending: false,
  }),
}));
vi.mock('@vehicles-marketplace/ui-web', () => ({
  Button: ({
    variant: _variant,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => <button {...props} />,
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  showToast: toast,
}));
const results = {
  items: [],
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1,
  searchId: 'srch-real',
};
const sessionId = 'b687562f-1968-4321-81e4-f540f8a980f4';
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  session.verified = true;
});

describe('AI search experience', () => {
  it('recovers from provider failure with a toast, releases the spinner and retains filters for regular search', async () => {
    post.mockResolvedValueOnce({
      data: { sessionId, filters: { maxPricePence: 3000000, bodyStyle: ['ESTATE'] }, results },
      response: { status: 200, ok: true },
    });
    render(<SearchExperience initialMode="search" />);
    fireEvent.change(screen.getByLabelText('Your message'), {
      target: { value: 'estate under £30k' },
    });
    fireEvent.click(screen.getByText('Send'));
    await screen.findByText('No matching listings. Try changing your requirements.');
    post.mockResolvedValueOnce({
      error: { code: 'SERVICE_UNAVAILABLE' },
      response: { status: 503, ok: false },
    });
    fireEvent.change(screen.getByLabelText('Your message'), { target: { value: 'under £27k' } });
    fireEvent.click(screen.getByText('Send'));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('error', expect.stringContaining('regular filters')),
    );
    expect(screen.queryByText('Searching…')).toBeNull();
    expect(post.mock.calls[1]?.[1].body).toEqual({ sessionId, message: 'under £27k' });
    fireEvent.click(screen.getByText('Use regular filters'));
    expect((screen.getByLabelText('Maximum price (£)') as HTMLInputElement).value).toBe('30000');
    post.mockResolvedValueOnce({ data: results, response: { status: 200, ok: true } });
    fireEvent.click(screen.getByText('Search', { selector: 'button' }));
    await waitFor(() =>
      expect(post).toHaveBeenLastCalledWith(
        '/api/v1/search',
        expect.objectContaining({
          body: expect.objectContaining({ maxPricePence: 3000000, bodyStyle: ['ESTATE'] }),
        }),
      ),
    );
  });
  it('blocks AI for an unverified account but keeps conventional search usable', () => {
    session.verified = false;
    render(<SearchExperience initialMode="finder" />);
    expect(screen.queryByText('Send')).toBeNull();
    fireEvent.click(screen.getByText('Use regular filters'));
    expect(screen.getByLabelText('Maximum price (£)')).toBeTruthy();
  });
  it('renders a guided question and submits the answer in the same finder session', async () => {
    post.mockResolvedValue({
      data: { sessionId, filters: {}, nextQuestion: 'What is your rough budget?' },
      response: { status: 200, ok: true },
    });
    render(<SearchExperience initialMode="finder" />);
    fireEvent.change(screen.getByLabelText('Your message'), {
      target: { value: 'Help me choose' },
    });
    fireEvent.click(screen.getByText('Send'));
    await screen.findByText('What is your rough budget?', { exact: false });
    fireEvent.change(screen.getByLabelText('Your message'), { target: { value: '£25,000' } });
    fireEvent.click(screen.getByText('Send'));
    await waitFor(() =>
      expect(post).toHaveBeenLastCalledWith(
        '/api/v1/ai-search/car-finder/message',
        expect.objectContaining({ body: { sessionId, message: '£25,000' } }),
      ),
    );
  });
});
