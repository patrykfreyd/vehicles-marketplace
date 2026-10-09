'use client';

import { useState } from 'react';
import Link from 'next/link';
import { searchFilterSummary } from '@vehicles-marketplace/utils';
import { Button, Input, showToast } from '@vehicles-marketplace/ui-web';
import {
  AiMessageResponseSchema,
  SearchRequestSchema,
  SearchResponseSchema,
  type AiMessageResponse,
  type AiSearchFilter,
  type SearchResponse,
} from '@vehicles-marketplace/validation';
import { apiClient } from '../_lib/api-client';
import { useSession } from '../_lib/auth-client';

type Mode = 'search' | 'finder' | 'regular';
export function SearchExperience({ initialMode }: { initialMode: Mode }) {
  const { data: session, isPending } = useSession();
  return (
    <SearchForm
      key={session?.user.id ?? 'guest'}
      initialMode={initialMode}
      verified={Boolean(session?.user.emailVerified)}
      pending={isPending}
    />
  );
}

function SearchForm({
  initialMode,
  verified,
  pending,
}: {
  initialMode: Mode;
  verified: boolean;
  pending: boolean;
}) {
  const [mode, setMode] = useState(initialMode);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<Array<{ role: string; text: string }>>([]);
  const [answer, setAnswer] = useState<AiMessageResponse>();
  const [filters, setFilters] = useState<AiSearchFilter>({});
  const [regularResults, setRegularResults] = useState<SearchResponse>();
  const [busy, setBusy] = useState(false);

  function reset(next: Mode) {
    setMode(next);
    setAnswer(undefined);
    setConversation([]);
    setMessage('');
    setFilters({});
    setRegularResults(undefined);
  }

  async function submit(page = 1) {
    setBusy(true);
    try {
      if (mode === 'regular') {
        const parsed = SearchRequestSchema.safeParse({ ...filters, page });
        if (!parsed.success) {
          showToast('error', 'Check your price, year and mileage filters.');
          return;
        }
        const result = await apiClient.POST('/api/v1/search', {
          body: parsed.data,
          signal: AbortSignal.timeout(100_000),
        });
        if (!result.response.ok) {
          showToast('error', 'Search is unavailable. Please try again.');
          return;
        }
        setRegularResults(SearchResponseSchema.parse(result.data));
      } else {
        const result = await apiClient.POST(
          mode === 'finder' ? '/api/v1/ai-search/car-finder/message' : '/api/v1/ai-search/message',
          {
            body: { message, sessionId: answer?.sessionId },
            signal: AbortSignal.timeout(100_000),
          },
        );
        if (!result.response.ok) {
          if (result.response.status === 404) setAnswer(undefined);
          showToast(
            'error',
            result.response.status === 429
              ? 'You have reached 60 AI messages per hour. Try regular filters.'
              : result.response.status === 403
                ? 'Verify your email to use AI search.'
                : result.response.status === 401
                  ? 'Log in to use AI search.'
                  : result.response.status === 404
                    ? 'This conversation expired. Send your requirements again to start a new search.'
                    : 'AI Search is having trouble right now — try the regular filters.',
          );
          return;
        }
        const data = AiMessageResponseSchema.parse(result.data);
        setAnswer(data);
        setFilters(data.filters);
        setConversation((previous) => [
          ...previous,
          { role: 'You', text: message },
          {
            role: 'Assistant',
            text:
              data.clarifyingQuestion ??
              data.nextQuestion ??
              'Here are the matching listings. Tell me what you would like to change.',
          },
        ]);
        setMessage('');
      }
    } catch {
      showToast(
        'error',
        mode === 'regular'
          ? 'Search is unavailable. Please try again.'
          : 'AI Search is having trouble right now — try the regular filters.',
      );
    } finally {
      setBusy(false);
    }
  }

  const results = mode === 'regular' ? regularResults : answer?.results;
  const cards =
    results?.items ??
    (mode === 'finder' ? answer?.recommendations?.map((r) => r.listing) : undefined) ??
    [];
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <Link href="/">Vehicles Marketplace</Link>
      <h1 className="text-3xl font-semibold">
        {mode === 'finder' ? 'AI Car Finder' : mode === 'search' ? 'AI Search' : 'Search cars'}
      </h1>
      <nav className="flex flex-wrap gap-3" aria-label="Search modes">
        <Button variant="secondary" disabled={busy} onClick={() => reset('search')}>
          AI Search
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => reset('finder')}>
          Help me choose
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => {
            setMode('regular');
            setRegularResults(undefined);
          }}
        >
          Use regular filters
        </Button>
      </nav>
      {mode !== 'regular' && (
        <p>
          {mode === 'finder'
            ? 'Tell us your budget, everyday driving needs and what matters most. We will help you compare real listings.'
            : 'Describe your ideal car, then refine your search in your own words.'}{' '}
          Conversations expire after 30 minutes of inactivity.
        </p>
      )}
      {mode !== 'regular' && !verified ? (
        <p>
          {pending ? (
            'Checking your account…'
          ) : (
            <>
              AI features require a registered account with a verified email.{' '}
              <Link className="underline" href="/login">
                Log in
              </Link>{' '}
              or{' '}
              <Link className="underline" href="/register">
                register
              </Link>
              . Regular filters are available to everyone.
            </>
          )}
        </p>
      ) : (
        <>
          {mode !== 'regular' && (
            <div aria-live="polite" className="flex flex-col gap-3">
              {conversation.map((turn, index) => (
                <p key={index}>
                  <strong>{turn.role}:</strong> {turn.text}
                </p>
              ))}
            </div>
          )}
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {mode === 'regular' ? (
              <>
                <label>
                  Model or derivative
                  <Input
                    value={filters.query ?? ''}
                    onChange={(e) => setFilters({ ...filters, query: e.target.value || undefined })}
                  />
                </label>
                <label>
                  Maximum price (£)
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={filters.maxPricePence === undefined ? '' : filters.maxPricePence / 100}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        maxPricePence: e.target.value
                          ? Math.round(Number(e.target.value) * 100)
                          : undefined,
                      })
                    }
                  />
                </label>
                <label>
                  Earliest year
                  <Input
                    type="number"
                    min="1900"
                    max="2100"
                    value={filters.minYear ?? ''}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        minYear: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </label>
                <label>
                  Maximum mileage
                  <Input
                    type="number"
                    min="0"
                    value={filters.maxMileage ?? ''}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        maxMileage: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    setFilters({});
                    setRegularResults(undefined);
                  }}
                >
                  Clear all filters
                </Button>
              </>
            ) : (
              <label>
                Your message
                <Input
                  value={message}
                  maxLength={2000}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    mode === 'finder'
                      ? 'Help me choose a family car under £25,000…'
                      : 'A petrol estate under £30,000, automatic, 2021 or newer…'
                  }
                />
              </label>
            )}
            <Button type="submit" disabled={busy || (mode !== 'regular' && !message.trim())}>
              {busy ? 'Searching…' : mode === 'regular' ? 'Search' : 'Send'}
            </Button>
            {mode !== 'regular' && (
              <Button type="button" variant="secondary" disabled={busy} onClick={() => reset(mode)}>
                Start a new conversation
              </Button>
            )}
          </form>
        </>
      )}
      {Object.entries(filters).filter(([, v]) => v !== undefined).length > 0 && (
        <details>
          <summary>Current filters</summary>
          <ul>
            {searchFilterSummary(filters).map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </details>
      )}
      {mode === 'finder' && answer?.recommendations && (
        <p>
          Ranked {answer.candidateCount} of {answer.totalMatches} matching listings (up to 100
          recent matches). Scores reflect your stated priorities, not vehicle condition or a
          guarantee of suitability.
        </p>
      )}
      {(results || (mode === 'finder' && answer?.recommendations)) && (
        <p aria-live="polite">
          {cards.length
            ? `${results?.total ?? cards.length} results`
            : 'No matching listings. Try changing your requirements.'}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((car) => (
          <article key={car.listingId} className="rounded-lg border p-4">
            <h2 className="text-xl font-semibold">
              {car.makeName} {car.modelName} {car.derivativeName}
            </h2>
            <p>
              £{(car.pricePence / 100).toLocaleString('en-GB')} ·{' '}
              {car.mileageMiles.toLocaleString('en-GB')} miles
            </p>
            <p>
              {car.bodyStyle} · {car.fuel}
              {car.powerBhp !== null ? ` · ${car.powerBhp} bhp` : ''}
            </p>
            {mode === 'finder' &&
              answer?.recommendations
                ?.filter((r) => r.listing.listingId === car.listingId)
                .map((r) => (
                  <div key={car.listingId}>
                    <strong>{r.matchScore}% match</strong>
                    <p>{r.reasoning}</p>
                  </div>
                ))}
          </article>
        ))}
      </div>
      {results && mode === 'regular' && (
        <div className="flex gap-3">
          <Button
            disabled={busy || results.page <= 1}
            onClick={() => void submit(results.page - 1)}
          >
            Previous
          </Button>
          <span>
            Page {results.page} of {results.totalPages}
          </span>
          <Button
            disabled={busy || results.page >= results.totalPages}
            onClick={() => void submit(results.page + 1)}
          >
            Next
          </Button>
        </div>
      )}
      {results && mode !== 'regular' && results.totalPages > 1 && (
        <p>Use regular filters to browse all matching listings.</p>
      )}
    </main>
  );
}
