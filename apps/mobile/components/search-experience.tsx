import { useState } from 'react';
import { searchFilterSummary } from '@vehicles-marketplace/utils';
import { Link } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { Button, Input, rnStyle, showToast } from '@vehicles-marketplace/ui-mobile';
import {
  AiMessageResponseSchema,
  SearchRequestSchema,
  SearchResponseSchema,
  type AiMessageResponse,
  type AiSearchFilter,
  type SearchResponse,
} from '@vehicles-marketplace/validation';
import { apiClient } from '../lib/api-client';
import { useSession } from '../lib/auth-client';

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
  const [history, setHistory] = useState<string[]>([]);
  const [answer, setAnswer] = useState<AiMessageResponse>();
  const [filters, setFilters] = useState<AiSearchFilter>({});
  const [regularResults, setRegularResults] = useState<SearchResponse>();
  const [busy, setBusy] = useState(false);

  function reset(next: Mode) {
    setMode(next);
    setMessage('');
    setHistory([]);
    setAnswer(undefined);
    setFilters({});
    setRegularResults(undefined);
  }
  async function submit(page = 1) {
    setBusy(true);
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 100_000);
    try {
      if (mode === 'regular') {
        const parsed = SearchRequestSchema.safeParse({ ...filters, page });
        if (!parsed.success) {
          showToast('error', 'Check your price, year and mileage filters.');
          return;
        }
        const result = await apiClient.POST('/api/v1/search', {
          body: parsed.data,
          signal: abort.signal,
        });
        if (!result.response.ok) {
          showToast('error', 'Search is unavailable. Please try again.');
          return;
        }
        setRegularResults(SearchResponseSchema.parse(result.data));
      } else {
        const result = await apiClient.POST(
          mode === 'finder' ? '/api/v1/ai-search/car-finder/message' : '/api/v1/ai-search/message',
          { body: { message, sessionId: answer?.sessionId }, signal: abort.signal },
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
        setHistory((previous) => [
          ...previous,
          `You: ${message}`,
          data.clarifyingQuestion ??
            data.nextQuestion ??
            'Here are your matches. Tell me what you would like to change.',
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
      clearTimeout(timer);
      setBusy(false);
    }
  }
  const results = mode === 'regular' ? regularResults : answer?.results;
  const cards =
    results?.items ??
    (mode === 'finder' ? answer?.recommendations?.map((r) => r.listing) : undefined) ??
    [];
  return (
    <ScrollView
      contentContainerStyle={rnStyle({ padding: 20, gap: 16 })}
      keyboardShouldPersistTaps="handled"
    >
      <Text accessibilityRole="header">
        {mode === 'finder' ? 'AI Car Finder' : mode === 'search' ? 'AI Search' : 'Search cars'}
      </Text>
      <Button variant="secondary" disabled={busy} onPress={() => reset('search')}>
        AI Search
      </Button>
      <Button variant="secondary" disabled={busy} onPress={() => reset('finder')}>
        Help me choose
      </Button>
      <Button
        variant="secondary"
        disabled={busy}
        onPress={() => {
          setMode('regular');
          setRegularResults(undefined);
        }}
      >
        Use regular filters
      </Button>
      {mode !== 'regular' && (
        <Text>
          {mode === 'finder'
            ? 'Tell us your budget, everyday driving needs and priorities.'
            : 'Describe your ideal car, then refine your search.'}{' '}
          Conversations expire after 30 minutes of inactivity.
        </Text>
      )}
      {mode !== 'regular' && !verified ? (
        <View>
          <Text>
            {pending
              ? 'Checking your account…'
              : 'AI features require a registered account with a verified email. Regular filters are available to everyone.'}
          </Text>
          <Link href="/login">Log in</Link>
          <Link href="/register">Register</Link>
        </View>
      ) : (
        <>
          {mode !== 'regular' && history.map((text, i) => <Text key={i}>{text}</Text>)}
          {mode === 'regular' ? (
            <>
              <Text>Model or derivative</Text>
              <Input
                accessibilityLabel="Model or derivative"
                value={filters.query ?? ''}
                onChangeText={(query) => setFilters({ ...filters, query: query || undefined })}
              />
              <Text>Maximum price (£)</Text>
              <Input
                accessibilityLabel="Maximum price in pounds"
                keyboardType="numeric"
                value={
                  filters.maxPricePence === undefined ? '' : String(filters.maxPricePence / 100)
                }
                onChangeText={(value) =>
                  setFilters({
                    ...filters,
                    maxPricePence: value ? Math.round(Number(value) * 100) : undefined,
                  })
                }
              />
              <Text>Earliest year</Text>
              <Input
                accessibilityLabel="Earliest year"
                keyboardType="numeric"
                value={filters.minYear === undefined ? '' : String(filters.minYear)}
                onChangeText={(value) =>
                  setFilters({ ...filters, minYear: value ? Number(value) : undefined })
                }
              />
              <Text>Maximum mileage</Text>
              <Input
                accessibilityLabel="Maximum mileage"
                keyboardType="numeric"
                value={filters.maxMileage === undefined ? '' : String(filters.maxMileage)}
                onChangeText={(value) =>
                  setFilters({ ...filters, maxMileage: value ? Number(value) : undefined })
                }
              />
              <Button
                variant="secondary"
                disabled={busy}
                onPress={() => {
                  setFilters({});
                  setRegularResults(undefined);
                }}
              >
                Clear all filters
              </Button>
            </>
          ) : (
            <Input
              accessibilityLabel="Your message"
              value={message}
              maxLength={2000}
              onChangeText={setMessage}
              placeholder="A petrol estate under £30,000…"
              multiline
            />
          )}
          <Button
            disabled={busy || (mode !== 'regular' && !message.trim())}
            onPress={() => void submit()}
          >
            {busy ? 'Searching…' : mode === 'regular' ? 'Search' : 'Send'}
          </Button>
          {mode !== 'regular' && (
            <Button variant="secondary" disabled={busy} onPress={() => reset(mode)}>
              Start a new conversation
            </Button>
          )}
        </>
      )}
      {searchFilterSummary(filters).map((text) => (
        <Text key={text}>{text}</Text>
      ))}
      {mode === 'finder' && answer?.recommendations && (
        <Text>
          Ranked {answer.candidateCount} of {answer.totalMatches} matching listings (up to 100
          recent matches). Scores reflect stated priorities, not vehicle condition or guaranteed
          suitability.
        </Text>
      )}
      {(results || (mode === 'finder' && answer?.recommendations)) && (
        <Text accessibilityLiveRegion="polite">
          {cards.length
            ? `${results?.total ?? cards.length} results`
            : 'No matching listings. Try changing your requirements.'}
        </Text>
      )}
      {cards.map((car) => (
        <View
          key={car.listingId}
          style={rnStyle({ padding: 12, borderWidth: 1, borderRadius: 8, gap: 6 })}
        >
          <Text accessibilityRole="header">
            {car.makeName} {car.modelName} {car.derivativeName}
          </Text>
          <Text>
            £{(car.pricePence / 100).toLocaleString('en-GB')} ·{' '}
            {car.mileageMiles.toLocaleString('en-GB')} miles
          </Text>
          <Text>
            {car.bodyStyle} · {car.fuel}
            {car.powerBhp !== null ? ` · ${car.powerBhp} bhp` : ''}
          </Text>
          {mode === 'finder' &&
            answer?.recommendations
              ?.filter((r) => r.listing.listingId === car.listingId)
              .map((r) => (
                <Text key={car.listingId}>
                  {r.matchScore}% match. {r.reasoning}
                </Text>
              ))}
        </View>
      ))}
      {results && mode === 'regular' && (
        <>
          <Button
            disabled={busy || results.page <= 1}
            onPress={() => void submit(results.page - 1)}
          >
            Previous
          </Button>
          <Text>
            Page {results.page} of {results.totalPages}
          </Text>
          <Button
            disabled={busy || results.page >= results.totalPages}
            onPress={() => void submit(results.page + 1)}
          >
            Next
          </Button>
        </>
      )}
      {results && mode !== 'regular' && results.totalPages > 1 && (
        <Text>Use regular filters to browse all matching listings.</Text>
      )}
    </ScrollView>
  );
}
