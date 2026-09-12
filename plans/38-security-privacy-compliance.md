# Plan 38 — Security & Privacy Compliance

Status: Draft
Depends on: nearly everything — this is the capstone plan that collects
every privacy/security item deferred across the entire series
Blocks: nothing structurally downstream; this is the last plan in the
index

## 1. Objective

This plan has two jobs. First, **collect every privacy/security decision
this plan series deferred** along the way — account deletion (Plan 07),
consent-gating (Plan 27), IP-address collection (Plans 24/31), analytics
retention (Plan 27) — into one coherent, actually-implemented compliance
system. Second, produce something no single prior plan could: a complete
**sub-processor registry**, since this series has introduced a new
third-party data processor in almost every phase without any one place
listing them all together.

"Done" means: a user can request their data and request deletion (with a
correct, carefully-reasoned answer to what happens to *other people's*
data that references them), a cookie/consent banner actually gates the
marketing-tracking Plan 27 flagged, analytics data is actually deleted
past its retention window (not just documented as a policy), and every
third-party processor this project uses is named in one registry.

**Explicit limit on this plan's authority**: this document can specify
mechanisms correctly, but it is not a substitute for real legal review.
Several open questions below exist specifically because they're legal
judgment calls this plan shouldn't make unilaterally.

## 2. Compliance debt collected from prior plans

| Plan | What it deferred here |
|---|---|
| Plan 07 §9 | Account deletion / GDPR data-erasure flow |
| Plan 24 §8 | `User.registrationIp`/`Listing.createdFromIp` — "a light PII collection point, worth flagging" |
| Plan 27 §3 | Consent gating for marketing-attribution tracking — "a real legal question... flagged rather than asserted as settled" |
| Plan 27 §3 | Raw analytics retention default (24 months) — "flagged as open question since retention is ultimately a compliance/business decision" |
| Plan 31 §8 | Same IP-collection flag, for fraud-detection purposes |

Every one of these gets resolved concretely below — not re-deferred
again.

## 3. New decisions this plan needs to fix

| Decision | Recommendation | Why |
|---|---|---|
| Account deletion vs. shared records | **Anonymize, don't hard-delete, records another user has a legitimate interest in.** Deleting a user replaces their name/attribution in messages, reviews, and conversation history with "Deleted User" while preserving the *other* party's side of that data; their own listings/vehicles are hard-deleted (or anonymized if a completed transaction record needs retention — see next row) | Genuinely deleting a shared conversation because one party requested erasure would violate the *other* party's legitimate interest in their own message history — this is the standard, correct pattern for the "shared record" erasure problem GDPR practitioners actually deal with, not a shortcut |
| Retention exceptions | Financial records (Plan 34 purchases/invoices) and confirmed fraud records (Plan 31) are retained per legal/tax requirements **even after account deletion**, anonymized where the retained fact doesn't require identity (e.g. "a purchase occurred" survives; "who specifically made it" doesn't, beyond what tax law requires) | The right to erasure isn't absolute — it's balanced against other legal obligations (UK tax record retention, fraud-prevention record-keeping); this plan implements that balance explicitly rather than either over-deleting (breaking tax compliance) or under-deleting (ignoring the erasure request) |
| Consent mechanism | A cookie/consent banner (Plan 04 components) plus a `ConsentRecord` table, gating **specifically** the marketing-attribution capture Plan 27 already identified as the sensitive part — not gating core product-functionality analytics | Resolves Plan 27's deferred question concretely: essential/functional tracking needed to run the marketplace proceeds without a blocking prompt; marketing/UTM attribution capture waits for explicit consent |
| Retention enforcement | A scheduled job that actually **deletes/anonymizes** `analytics_events` older than the retention window — not just a documented policy nobody enforces | A retention policy that exists only in a document isn't real compliance — this plan makes Plan 27's stated 24-month default an enforced, scheduled deletion |
| Secrets management | **Reaffirm** Plan 02/35's existing server-side `.env` approach as sufficient for this stage — add file-permission lockdown (`chmod 600`, root-only) and a documented (manual) secret-rotation checklist, rather than introducing a dedicated secrets-manager platform | A full secrets-management platform (Vault, cloud KMS) would be disproportionate infrastructure for this stage, per the project's own repeated cost/complexity philosophy — the improvement needed is discipline, not new infra |
| Dependency vulnerability scanning | Add a `pnpm audit`/Dependabot step to Plan 35's CI pipeline | Cheap, standard, catches known-vulnerable dependencies before they reach Production |
| Breach response | A documented incident-response runbook (`docs/security-incident-runbook.md`), **distinct** from Plan 36's disaster-recovery runbook — a data breach and a data-loss disaster are different scenarios requiring different first steps (breach: contain, assess scope, consider the 72-hour ICO notification clock; disaster: restore from backup) | Conflating these two runbooks would mean the wrong first steps get taken under pressure — worth keeping them explicitly separate documents |
| Professional security review | **Recommended before real launch with real user financial/personal data** — a genuine third-party penetration test or security audit, which this planning document cannot itself substitute for | Honest about the limits of what a dev-plan document can verify — the security decisions across Plans 05/07 (helmet, CORS, rate limiting, auth) are reasonable engineering defaults, not a substitute for an actual professional review before handling real money and real personal data at scale |

## 4. Sub-processor registry (this plan's concrete deliverable)

Every third-party service that processes personal data, introduced one
at a time across this entire plan series, collected here for the first
time in one place:

| Processor | Introduced in | Data involved |
|---|---|---|
| Resend | Plan 07 | Email addresses, transactional email content |
| Google (OAuth login) | Plan 07 | Email/profile data for social login |
| DVLA (UK Government) | Plan 10 | Vehicle registration lookups |
| DVSA (UK Government) | Plan 15 | MOT history lookups |
| Anthropic (Claude API) | Plan 14 | Search queries, advert content, message drafts sent for AI processing |
| postcodes.io | Plan 13 | Postcode/location data for geocoding |
| Twilio (or equivalent SMS) | Plan 30 | Phone numbers, OTP messages |
| Companies House (UK Government) | Plan 33 | Business registration data |
| Stripe | Plan 34 | Payment card data (PCI scope stays with Stripe), billing details |
| Expo (push notifications) | Plans 24/35 | Device push tokens |
| GitHub Container Registry | Plan 35 | No personal data (deployment artifacts only) |
| Backblaze B2 | Plan 36 | Encrypted backups of all Production personal data |
| healthchecks.io | Plan 36 | No personal data (a bare success ping) |

A real Data Processing Agreement should exist with each processor
handling personal data before real launch — flagged explicitly in open
question 1, since confirming DPAs are in place is a legal/business task,
not something this plan can verify on its own.

## 5. Data model

```prisma
model ConsentRecord {
  id             String   @id
  userId         String?  @map("user_id")       // nullable pre-registration
  anonymousId    String?  @map("anonymous_id")
  analyticsConsent Boolean @map("analytics_consent")
  marketingConsent Boolean @map("marketing_consent")
  policyVersion  String   @map("policy_version")
  consentedAt    DateTime @default(now()) @map("consented_at")

  @@map("consent_records")
}
```

Account deletion is implemented as a service method (not a raw `DELETE`)
that: anonymizes the user's messages/reviews (§3), hard-deletes their own
vehicles/listings/saved items, retains anonymized financial/fraud records
per §3's exceptions, and revokes all sessions (reusing Plan 32's existing
ban-session-invalidation mechanism for the revocation step).

## 6. Out of scope for this plan

- Legal sign-off on any of the judgment calls in §3 — flagged for real
  legal review, not decided unilaterally here
- A professional penetration test — recommended, not performed by this
  plan
- Formal DPAs with each sub-processor in §4 — a legal/procurement task
  this plan surfaces but doesn't execute

## 7. Acceptance criteria

- [ ] Requesting account deletion correctly anonymizes shared records
      (messages, reviews) while hard-deleting the user's own data, and
      retains only the legally-required anonymized financial/fraud
      records.
- [ ] The consent banner correctly gates Plan 27's marketing-attribution
      capture specifically, without blocking core product analytics.
- [ ] The retention-enforcement job actually deletes/anonymizes fixture
      `analytics_events` older than the configured window.
- [ ] Server `.env` files have correct restrictive permissions verified
      on a Test deployment.
- [ ] `pnpm audit` (or Dependabot) is wired into Plan 35's CI pipeline and
      fails the build on a critical vulnerability.
- [ ] The sub-processor registry (§4) and both runbooks
      (`docs/security-incident-runbook.md`,
      distinct from Plan 36's `docs/restore-runbook.md`) exist and are
      reviewed.
- [ ] `pnpm lint`/`typecheck`/`build`/`test` remain green.

## 8. Open questions for you

1. Do you have (or need to arrange) real legal review of the erasure/
   retention approach in §3, and DPAs with the sub-processors in §4,
   before real launch?
2. Confirm the 24-month analytics retention default from Plan 27 (now
   actually enforced by this plan), or would you like it tuned?
3. Is a professional security review/penetration test budgeted for before
   real launch, or is that a decision to revisit closer to that point?
