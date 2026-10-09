# AI Search and Car Finder

Plan 14 implements `/ai-search`, `/car-finder` and a conventional `/search`
fallback on web and mobile. Both AI endpoints require an authenticated,
email-verified registered user. Conventional search remains public.

## Configuration

Set `OPENAI_API_KEY` on the API server. `OPENAI_SEARCH_MODEL` defaults to
`gpt-5.6-luna`, independently of catalogue and vision models. With a blank key,
AI requests fail gracefully; no fake recommendations are returned.

The model was selected from the [official model documentation](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
on 2026-10-08: $0.20 input / $1.20 output per million tokens. It is the current
cost-focused tier with strict function calling. API/account access must still
be available for that model. Low reasoning effort, 3,000 output-token cap,
20-second timeout and at most one retry apply to each phase. `store: false`
disables provider response storage. Model overrides must support these options.

## API and state

- `POST /api/v1/ai-search/message`
- `POST /api/v1/ai-search/car-finder/message`

Both accept `{ message, sessionId? }` and return `sessionId`, resolved `filters`,
and either a question or real inventory results/recommendations. Ordinary AI
Search also returns the search service's page and `searchId`. Finder returns
`recommendations`, `candidateCount`, `totalMatches` and `searchId`.

Redis stores `AI_SEARCH_SESSION:<uuid>` for 30 minutes after a successful turn,
including user ownership, feature, the last filters/criteria, and up to 12
history messages. Sessions cannot cross users or features. Missing/expired
sessions return 404; clients ask the user to start again rather than silently
losing previous requirements. A token-owned Redis lock prevents concurrent
turns from overwriting each other. Failed turns retain the last successful state.

An atomic Redis sorted-set limiter enforces **60 messages per rolling hour per
user**, shared across both features and API instances, in addition to the global
IP throttle. Email verification runs before this limiter or any provider call.

## Extraction and grounding

Shared Zod schemas generate strict tool JSON Schema. All tool properties are
required; nullable filter values mean “unchanged”. `clearFields` explicitly
removes a previous constraint. The merged filter passes the original search
schema's range checks before execution. Model output cannot control pagination,
sort, search IDs, or SQL. Code provides a bounded, read-only vocabulary of makes
and equipment and rejects invented identifiers. Unsupported requirements ask
for clarification rather than inventing catalogue fields or location coordinates.

AI receives no database capability. Only `SearchService` queries listings, keeping
its public visibility, approved-derivative and equipment AND rules. Finder ranks
the first 100 search matches and returns the best 10; the UI displays this scope.
This is a bounded candidate ranking, not an exhaustive inventory ranking.

Finder match scores are rounded normalized weighted scores (0–100):

| Priority      | Deterministic component                               |
| ------------- | ----------------------------------------------------- |
| Practicality  | 1 for an explicitly preferred body style, otherwise 0 |
| Performance   | `clamp(powerBhp / targetPowerBhp, 0, 1)`              |
| Affordability | `clamp(1 - pricePence / budgetPence, 0, 1)`           |
| Mileage       | `clamp(1 - mileageMiles / targetMileageMiles, 0, 1)`  |

Unknown measurements score zero. Nonzero priorities need their associated
preferences/targets; otherwise the next turn asks for them. Listing ID breaks
score ties. Budget and required equipment are hard filters. Fuel economy/running
costs, seating, condition and history are not inferred from body style or fuel;
the current search result contract does not provide those measurements.

For explanations, the second strict tool selects/order fact IDs from the ranked
results. Code renders the corresponding verified sentences. Unknown fact IDs
are discarded and unknown listings are never returned. No free-form model prose
can add unverified specs, equipment or history to an explanation. Missing valid
selections fall back to verified price/mileage facts. No explanation call is
made for empty inventory. This is stronger than prompt-only grounding.

## Failure handling and operations

Provider refusals, malformed/truncated output and timeouts are retried once,
then return 503. Web/mobile show a toast and release the pending state. Regular
filters retain the last successfully resolved constraints and remain available
without an AI call. Expired sessions, authentication and rate limits have
separate client messages. No client receives provider errors or credentials.

Each provider attempt emits `AI_CALL` with feature, phase, model, attempt,
latency, token counts, estimated USD cost and success. The default model's
uncached list price is a conservative estimate. Unknown usage or overridden
model prices are `null`, not zero or a fabricated estimate. Prompts, user IDs,
messages and API keys are not included. Plan 27 owns aggregation/reporting.

Tests use provider fixtures and injected services (no paid requests). They cover
the example filter shape, budget follow-ups, explicit removal, invalid ranges,
clarification, session ownership/expiry, verification, rate-limit rejection,
timeouts/retries, reproducible scores, fabricated explanation facts, and the web
failure-to-toast-to-regular-search path. A live provider extraction evaluation
and device/browser smoke test remain deployment checks.

## Validation on 2026-10-08

- Workspace lint and typecheck passed (17 package tasks each). Lint retains
  three existing React Hook Form compiler warnings in unrelated screens.
- Production build passed, including the new `/ai-search`, `/car-finder` and
  `/search` routes; the API build was rechecked after the final session changes.
- All 17 workspace test tasks passed using
  `pnpm exec turbo run test --concurrency=1 -- --maxWorkers=2`.
  Uncapped runs hit existing database-module test timeouts on this machine;
  no timeout assertions were weakened. Infrastructure-dependent suites retain
  their existing skips when database/Redis test configuration is absent.
- Added 25 tests covering the new schemas, provider, service, endpoint access
  and web conversation/fallback behavior. No live OpenAI request was made.
