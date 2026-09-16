'use client';

/**
 * plans/10-dvla-lookup-seller-matching.md §6 — the reusable UI step this
 * plan delivers (Plan 20 assembles it into the full "Sell your car" wizard,
 * per §1/§7). Implements the whole registration → Make/year/engine/fuel →
 * Model autocomplete → ranked Derivative shortlist → confirm flow behind
 * one component, so Plan 20 only needs to mount `<VehicleLookupFlow>` and
 * handle its `onConfirmed`/`onManualFallback` callbacks.
 *
 * "Or enter manually" (always visible, §6) and "I'm not sure" (the
 * derivative shortlist's own escape hatch) both call `onManualFallback`
 * rather than rendering catalogue browsing UI themselves — a generic
 * Make → Model → Generation → Derivative browser doesn't exist yet as a
 * reusable component (it's Plan 20's to build), so this only guarantees the
 * *contract* §2's flow diagram requires: manual entry always skips the DVLA
 * call/matching entirely, at any point in this flow.
 */
import { useEffect, useState, type ComponentProps } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import type { createApiClient } from '@vehicles-marketplace/api-client';
import {
  DvlaLookupRequestSchema,
  type ApiError,
  type ConfirmVehicleLookupResponse,
  type DerivativeCandidate,
  type DvlaLookupRequest,
  type DvlaLookupResult,
  type ModelCandidate,
} from '@vehicles-marketplace/validation';
import {
  applyApiFieldErrors,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  FormField,
  Input,
  showApiErrorToast,
  Skeleton,
} from '@vehicles-marketplace/ui-web';

type ApiClient = ReturnType<typeof createApiClient>;

export interface VehicleLookupFlowProps {
  apiClient: ApiClient;
  /** Fired once the seller confirms a derivative (top-ranked or otherwise) — never for a manual-fallback exit, which goes through `onManualFallback` instead. */
  onConfirmed?: (result: ConfirmVehicleLookupResponse) => void;
  /**
   * Fired the moment the seller chooses (or is forced into) manual
   * matching — from the registration step's "or enter manually" link, an
   * unresolved catalogue Make, an empty shortlist, or the derivative
   * shortlist's "I'm not sure". `lookupId` is present whenever a DVLA call
   * already happened (absent only for "or enter manually" from the very
   * first screen, before any lookup exists).
   */
  onManualFallback?: (context: { lookupId?: string; reason: string }) => void;
}

type Phase =
  | { step: 'registration' }
  | { step: 'model'; lookup: DvlaLookupResult }
  | { step: 'derivative'; lookup: DvlaLookupResult; modelId: string; modelName: string }
  | { step: 'confirmed'; result: ConfirmVehicleLookupResponse };

export function VehicleLookupFlow({
  apiClient,
  onConfirmed,
  onManualFallback,
}: VehicleLookupFlowProps) {
  const [phase, setPhase] = useState<Phase>({ step: 'registration' });

  function manual(reason: string, lookupId?: string) {
    onManualFallback?.({ lookupId, reason });
  }

  switch (phase.step) {
    case 'registration':
      return (
        <RegistrationStep
          apiClient={apiClient}
          onFound={(lookup) => setPhase({ step: 'model', lookup })}
          onManual={() => manual('Seller chose "or enter manually" before any lookup')}
        />
      );
    case 'model':
      return (
        <ModelStep
          apiClient={apiClient}
          lookup={phase.lookup}
          onSelected={(modelId, modelName) =>
            setPhase({ step: 'derivative', lookup: phase.lookup, modelId, modelName })
          }
          onManual={(reason) => manual(reason, phase.lookup.id)}
        />
      );
    case 'derivative':
      return (
        <DerivativeStep
          apiClient={apiClient}
          lookup={phase.lookup}
          modelId={phase.modelId}
          modelName={phase.modelName}
          onConfirmed={(result) => {
            setPhase({ step: 'confirmed', result });
            onConfirmed?.(result);
          }}
          onManual={(reason) => manual(reason, phase.lookup.id)}
        />
      );
    case 'confirmed':
      return <ConfirmedSummary result={phase.result} />;
  }
}

function PlateInput(props: ComponentProps<typeof Input>) {
  // A light nod to the mockups' registration-plate-styled input — not a
  // pixel-accurate UK plate, just enough to read as one.
  return (
    <Input
      {...props}
      placeholder={props.placeholder ?? 'YA22 GZX'}
      className="border-2 border-black bg-[#FFD93D] text-center font-mono text-2xl font-bold uppercase tracking-[0.2em] text-black placeholder:text-black/40 dark:border-white/70"
      autoCapitalize="characters"
      autoComplete="off"
      spellCheck={false}
    />
  );
}

function RegistrationStep({
  apiClient,
  onFound,
  onManual,
}: {
  apiClient: ApiClient;
  onFound: (lookup: DvlaLookupResult) => void;
  onManual: () => void;
}) {
  const form = useForm<DvlaLookupRequest>({
    resolver: zodResolver(DvlaLookupRequestSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { registration: '' },
  });

  const onSubmit = form.handleSubmit(async ({ registration }) => {
    const { data, error, response } = await apiClient.POST('/api/v1/vehicle-lookup/dvla', {
      body: { registration },
    });

    if (error) {
      const apiError = error as ApiError;
      if (apiError.fieldErrors && Object.keys(apiError.fieldErrors).length > 0) {
        applyApiFieldErrors<DvlaLookupRequest>(form.setError, apiError.fieldErrors);
        return;
      }
      // §6: a "not found" DVLA response is a field-level error under the
      // input (with the manual fallback offered right below it, already
      // always visible) — everything else (rate-limited, DVLA outage) is a
      // transient service problem, shown as a toast instead.
      //
      // `response` is always a real Fetch `Response` at runtime, but
      // openapi-fetch types it from the OpenAPI spec's *documented* response
      // statuses only (this endpoint documents just its 201) — narrowing on
      // `error` collapses that to `never` here, so it's cast back to the one
      // type it's actually guaranteed to be.
      if ((response as Response).status === 404) {
        form.setError('registration', { type: 'server', message: apiError.message });
        return;
      }
      showApiErrorToast(apiError);
      return;
    }

    onFound(data as DvlaLookupResult);
  });

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Find my car</CardTitle>
        <CardDescription>
          Enter your registration and we&apos;ll pull up the details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <FormField<DvlaLookupRequest>
              name="registration"
              label="Registration"
              render={(field) => <PlateInput {...field} />}
            />
            <Button
              type="submit"
              loading={form.formState.isSubmitting}
              disabled={!form.formState.isValid}
            >
              Find my car
            </Button>
            <button
              type="button"
              onClick={onManual}
              className="text-center text-sm text-primary underline"
            >
              Or enter details manually
            </button>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}

function ModelStep({
  apiClient,
  lookup,
  onSelected,
  onManual,
}: {
  apiClient: ApiClient;
  lookup: DvlaLookupResult;
  onSelected: (modelId: string, modelName: string) => void;
  onManual: (reason: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [models, setModels] = useState<ModelCandidate[] | undefined>(undefined);

  useEffect(() => {
    if (!lookup.matchedMakeId) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      apiClient
        .GET('/api/v1/vehicle-lookup/{id}/model-candidates', {
          params: {
            path: { id: lookup.id },
            query: { makeId: lookup.matchedMakeId as string, ...(query ? { q: query } : {}) },
          },
        })
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error) {
            showApiErrorToast(error as ApiError);
            setModels([]);
            return;
          }
          setModels(data.items as ModelCandidate[]);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [apiClient, lookup.id, lookup.matchedMakeId, query]);

  if (!lookup.matchedMakeId) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>We need a bit more detail</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title={`"${lookup.make}" isn't in our catalogue yet`}
            description="Let's find your car by browsing the catalogue instead."
            action={
              <Button onClick={() => onManual(`DVLA make "${lookup.make}" has no catalogue match`)}>
                Browse manually
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>What model is your {lookup.make}?</CardTitle>
        <CardDescription>
          {lookup.yearOfManufacture ? `${lookup.yearOfManufacture} · ` : ''}
          {lookup.fuel ?? 'Unknown fuel'}
          {lookup.engineCapacityCc ? ` · ${lookup.engineCapacityCc}cc` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input
          placeholder="Start typing a model…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {models === undefined ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : models.length === 0 ? (
          <EmptyState title="No matching models found" />
        ) : (
          <div className="flex flex-col gap-2">
            {models.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => onSelected(model.id, model.name)}
                className="rounded-md border border-border p-3 text-left text-sm text-text transition-colors hover:bg-surface"
              >
                {model.name}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => onManual("Seller's model isn't in the list")}
          className="text-center text-sm text-primary underline"
        >
          None of these — enter manually
        </button>
      </CardContent>
    </Card>
  );
}

function DerivativeStep({
  apiClient,
  lookup,
  modelId,
  modelName,
  onConfirmed,
  onManual,
}: {
  apiClient: ApiClient;
  lookup: DvlaLookupResult;
  modelId: string;
  modelName: string;
  onConfirmed: (result: ConfirmVehicleLookupResponse) => void;
  onManual: (reason: string) => void;
}) {
  const [candidates, setCandidates] = useState<DerivativeCandidate[] | undefined>(undefined);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .GET('/api/v1/vehicle-lookup/{id}/derivative-candidates', {
        params: { path: { id: lookup.id }, query: { modelId } },
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          showApiErrorToast(error as ApiError);
          setCandidates([]);
          return;
        }
        setCandidates(data.items as DerivativeCandidate[]);
      });
    return () => {
      cancelled = true;
    };
  }, [apiClient, lookup.id, modelId]);

  async function confirm(derivativeId: string, matchedManually: boolean) {
    setConfirming(derivativeId);
    const { data, error } = await apiClient.POST('/api/v1/vehicle-lookup/{id}/confirm', {
      params: { path: { id: lookup.id } },
      body: { derivativeId, matchedManually },
    });
    setConfirming(null);
    if (error) {
      showApiErrorToast(error as ApiError);
      return;
    }
    onConfirmed(data as ConfirmVehicleLookupResponse);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Which {modelName} is it?</CardTitle>
        <CardDescription>Pick the closest match — you can fine-tune details later.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {candidates === undefined ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : candidates.length === 0 ? (
          <EmptyState
            title="No close matches"
            description="We couldn't confidently rank any derivative for this model."
            action={
              <Button onClick={() => onManual('No ranked derivative candidates')}>
                Browse manually
              </Button>
            }
          />
        ) : (
          candidates.map((candidate, index) => (
            <div key={candidate.id} className="rounded-md border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-text">{candidate.name}</p>
                  <p className="text-sm text-textMuted">
                    {candidate.generationCode} · {candidate.fuel}
                    {candidate.engineCapacityCc ? ` · ${candidate.engineCapacityCc}cc` : ''}
                    {candidate.powerBhp ? ` · ${candidate.powerBhp}bhp` : ''}
                  </p>
                </div>
                {index === 0 && candidate.withinTolerance ? (
                  <Badge variant="success">Best match</Badge>
                ) : null}
              </div>
              <Button
                className="mt-3 w-full"
                variant={index === 0 ? 'primary' : 'secondary'}
                loading={confirming === candidate.id}
                disabled={confirming !== null}
                onClick={() => confirm(candidate.id, false)}
              >
                This is my car
              </Button>
            </div>
          ))
        )}
        <button
          type="button"
          onClick={() => onManual("Seller wasn't sure which derivative matched")}
          className="text-center text-sm text-primary underline"
        >
          I&apos;m not sure — browse manually
        </button>
      </CardContent>
    </Card>
  );
}

function ConfirmedSummary({ result }: { result: ConfirmVehicleLookupResponse }) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Got it!</CardTitle>
        <CardDescription>
          We&apos;ve matched your car — next, tell us more about it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Badge variant={result.predictionAccepted ? 'success' : 'neutral'}>
          {result.predictionAccepted ? 'Matched automatically' : 'Confirmed by you'}
        </Badge>
      </CardContent>
    </Card>
  );
}
