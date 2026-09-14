'use client';

/**
 * plans/09-catalogue-import-tooling-admin.md §7 — the derivative detail/
 * edit screen: every Level 2 field editable via `<FormField>` (same inline-
 * validation pattern every other form in the product uses), open
 * `CatalogueValidationIssue` rows shown inline, alias management, source
 * attachment, and the Approve/Reject/Merge status-transition actions (§6).
 * Every action fires a toast on success/failure (§7) — never `window.alert`.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import {
  UpdateDerivativeRequestSchema,
  type DerivativeDetail,
  type DuplicateGroupResponse,
  type UpdateDerivativeRequest,
} from '@vehicles-marketplace/catalogue-types';
import type { ApiError } from '@vehicles-marketplace/validation';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  applyApiFieldErrors,
  showApiErrorToast,
  showToast,
} from '@vehicles-marketplace/ui-web';
import { apiClient } from '../../../../../_lib/api-client';

const BODY_STYLES = [
  'HATCHBACK',
  'SALOON',
  'ESTATE',
  'COUPE',
  'CONVERTIBLE',
  'SUV',
  'MPV',
  'PICKUP',
];
const FUEL_TYPES = ['PETROL', 'DIESEL', 'HYBRID', 'PHEV', 'ELECTRIC', 'HYDROGEN'];
const CONFIGURATIONS = [
  'INLINE_3',
  'INLINE_4',
  'INLINE_5',
  'INLINE_6',
  'V6',
  'V8',
  'V10',
  'V12',
  'FLAT_4',
  'FLAT_6',
  'ELECTRIC_MOTOR',
];
const ASPIRATIONS = ['NATURALLY_ASPIRATED', 'TURBO', 'TWIN_TURBO', 'SUPERCHARGED', 'ELECTRIC'];
const TRANSMISSIONS = ['MANUAL', 'AUTOMATIC', 'DCT', 'CVT'] as const;
const DRIVETRAINS = ['FWD', 'RWD', 'AWD'];

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'APPROVED' || status === 'SOURCE_CONFIRMED') return 'success';
  if (status === 'DEPRECATED') return 'neutral';
  if (status === 'REVIEW_REQUIRED') return 'error';
  return 'warning';
}

function EnumSelect({
  field,
  options,
  placeholder,
}: {
  field: { value: unknown; onChange: (value: string) => void; invalid: boolean };
  options: string[];
  placeholder: string;
}) {
  return (
    <Select value={(field.value as string) ?? ''} onValueChange={field.onChange}>
      <SelectTrigger invalid={field.invalid}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function DerivativeDetailPage() {
  const params = useParams<{ makeId: string; derivativeId: string }>();
  const { makeId, derivativeId } = params;

  const [detail, setDetail] = useState<DerivativeDetail | null | undefined>(undefined);
  const [duplicates, setDuplicates] = useState<DuplicateGroupResponse[]>([]);
  const [newAlias, setNewAlias] = useState('');
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const form = useForm<UpdateDerivativeRequest>({
    resolver: zodResolver(UpdateDerivativeRequestSchema),
    mode: 'onChange',
  });

  const refresh = useCallback(async () => {
    const [{ data, error }, duplicatesResult] = await Promise.all([
      apiClient.GET('/api/v1/catalogue-admin/derivatives/{id}', {
        params: { path: { id: derivativeId } },
      }),
      apiClient.GET('/api/v1/catalogue-admin/manufacturers/{makeId}/duplicates', {
        params: { path: { makeId } },
      }),
    ]);
    if (error) {
      showApiErrorToast(error);
      setDetail(null);
      return;
    }
    const detailData = data as DerivativeDetail;
    setDetail(detailData);
    form.reset({
      name: detailData.name,
      specialEdition: detailData.specialEdition,
      bodyStyle: detailData.bodyStyle,
      doors: detailData.doors,
      seats: detailData.seats,
      fuel: detailData.fuel,
      engineCapacityCc: detailData.engineCapacityCc,
      cylinders: detailData.cylinders,
      configuration: detailData.configuration,
      aspiration: detailData.aspiration,
      engineFamily: detailData.engineFamily,
      powerBhp: detailData.powerBhp,
      torqueNm: detailData.torqueNm,
      transmissions: detailData.transmissions,
      drivetrain: detailData.drivetrain,
      drivetrainManufacturerName: detailData.drivetrainManufacturerName,
      zeroToSixtyTwoSeconds: detailData.zeroToSixtyTwoSeconds,
      topSpeedMph: detailData.topSpeedMph,
    });

    if (!duplicatesResult.error) {
      const groups = duplicatesResult.data.items as DuplicateGroupResponse[];
      setDuplicates(groups.filter((group) => group.items.some((item) => item.id === derivativeId)));
    }
    // `form` (from useForm()) is a stable object reference across renders —
    // safe to depend on here without causing extra refresh() re-creations.
  }, [derivativeId, makeId, form]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onSubmit = form.handleSubmit(async (values) => {
    const { data, error } = await apiClient.PATCH('/api/v1/catalogue-admin/derivatives/{id}', {
      params: { path: { id: derivativeId } },
      // `specialEdition`/`transmissions` are always populated from
      // `form.reset()` below, but the generated request type (built from
      // the Zod DTO's `.default()` fields) marks both non-optional —
      // spelled out explicitly so the request body's static type matches
      // what's actually always sent.
      body: {
        ...values,
        specialEdition: values.specialEdition ?? false,
        transmissions: values.transmissions ?? [],
      },
    });
    if (error) {
      // Plan 05's OpenAPI generation only documents each route's success
      // response (§7's `@ZodResponse` never registers an error schema —
      // `ApiExceptionFilter` shapes every failure at runtime, not per-route
      // metadata), so `error`'s generated static type is `never` here even
      // though the actual response body always matches `ApiErrorSchema`
      // (guaranteed by that same global filter) — asserted, not guessed.
      const apiError = error as ApiError;
      showApiErrorToast(apiError);
      if (apiError.fieldErrors) applyApiFieldErrors(form.setError, apiError.fieldErrors);
      return;
    }
    setDetail(data as DerivativeDetail);
    showToast('success', 'Derivative updated');
  });

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const approve = () =>
    runAction(async () => {
      const { data, error } = await apiClient.POST(
        '/api/v1/catalogue-admin/derivatives/{id}/approve',
        {
          params: { path: { id: derivativeId } },
        },
      );
      if (error) {
        showApiErrorToast(error);
        return;
      }
      setDetail(data as DerivativeDetail);
      showToast('success', 'Derivative approved');
    });

  const reject = () =>
    runAction(async () => {
      const { data, error } = await apiClient.POST(
        '/api/v1/catalogue-admin/derivatives/{id}/reject',
        {
          params: { path: { id: derivativeId } },
        },
      );
      setRejectConfirmOpen(false);
      if (error) {
        showApiErrorToast(error);
        return;
      }
      setDetail(data as DerivativeDetail);
      showToast('success', 'Derivative rejected');
    });

  const merge = (duplicateId: string) =>
    runAction(async () => {
      const { data, error } = await apiClient.POST(
        '/api/v1/catalogue-admin/derivatives/{id}/merge',
        {
          params: { path: { id: derivativeId } },
          body: { duplicateId },
        },
      );
      setMergeTarget(null);
      if (error) {
        showApiErrorToast(error);
        return;
      }
      setDetail(data as DerivativeDetail);
      showToast('success', 'Duplicate merged');
      void refresh();
    });

  const addAlias = () =>
    runAction(async () => {
      if (!newAlias.trim()) return;
      const { data, error } = await apiClient.POST(
        '/api/v1/catalogue-admin/derivatives/{id}/aliases',
        {
          params: { path: { id: derivativeId } },
          body: { alias: newAlias.trim() },
        },
      );
      if (error) {
        showApiErrorToast(error);
        return;
      }
      setDetail(data as DerivativeDetail);
      setNewAlias('');
      showToast('success', 'Alias added');
    });

  const removeAlias = (aliasId: string) =>
    runAction(async () => {
      const { error } = await apiClient.DELETE('/api/v1/catalogue-admin/aliases/{aliasId}', {
        params: { path: { aliasId } },
      });
      if (error) {
        showApiErrorToast(error);
        return;
      }
      showToast('success', 'Alias removed');
      void refresh();
    });

  const addSource = () =>
    runAction(async () => {
      if (!newSourceName.trim()) return;
      const { data, error } = await apiClient.POST(
        '/api/v1/catalogue-admin/derivatives/{id}/sources',
        {
          params: { path: { id: derivativeId } },
          body: { name: newSourceName.trim(), url: newSourceUrl.trim() || undefined },
        },
      );
      if (error) {
        showApiErrorToast(error);
        return;
      }
      setDetail(data as DerivativeDetail);
      setNewSourceName('');
      setNewSourceUrl('');
      showToast('success', 'Source attached');
    });

  const removeSource = (linkId: string) =>
    runAction(async () => {
      const { error } = await apiClient.DELETE('/api/v1/catalogue-admin/derivative-sources/{id}', {
        params: { path: { id: linkId } },
      });
      if (error) {
        showApiErrorToast(error);
        return;
      }
      showToast('success', 'Source removed');
      void refresh();
    });

  if (detail === undefined) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (detail === null) {
    return <EmptyState title="Derivative not found" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/admin/catalogue/${makeId}`} className="text-sm text-primary underline">
          ← {detail.makeName}
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-text">{detail.name}</h1>
          <Badge variant={statusVariant(detail.status)}>{detail.status}</Badge>
          <span className="text-sm text-textMuted">{detail.completenessScore}% complete</span>
        </div>
        <p className="text-sm text-textMuted">
          {detail.makeName} {detail.modelName} · {detail.generationCode}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => void approve()}
          disabled={busy || detail.status !== 'SOURCE_CONFIRMED'}
        >
          Approve
        </Button>
        <Button variant="destructive" onClick={() => setRejectConfirmOpen(true)} disabled={busy}>
          Reject
        </Button>
        {duplicates.length > 0 ? (
          <Button
            variant="secondary"
            onClick={() => {
              const group = duplicates[0]!;
              const other = group.items.find((item) => item.id !== derivativeId);
              if (other) setMergeTarget(other.id);
            }}
            disabled={busy}
          >
            Merge duplicate
          </Button>
        ) : null}
      </div>

      {detail.issues.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Open issues</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {detail.issues.map((issue) => (
              <div key={issue.id} className="flex items-center gap-2 text-sm">
                <Badge variant={issue.severity === 'ERROR' ? 'error' : 'warning'}>
                  {issue.severity}
                </Badge>
                <span className="text-text">{issue.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="aliases">Aliases</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardContent>
              <FormProvider {...form}>
                <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
                  <FormField<UpdateDerivativeRequest>
                    name="name"
                    label="Name"
                    render={(field) => <Input {...field} value={(field.value as string) ?? ''} />}
                  />
                  <FormField<UpdateDerivativeRequest>
                    name="bodyStyle"
                    label="Body style"
                    render={(field) => (
                      <EnumSelect field={field} options={BODY_STYLES} placeholder="Body style" />
                    )}
                  />
                  <FormField<UpdateDerivativeRequest>
                    name="fuel"
                    label="Fuel"
                    render={(field) => (
                      <EnumSelect field={field} options={FUEL_TYPES} placeholder="Fuel" />
                    )}
                  />
                  <FormField<UpdateDerivativeRequest>
                    name="drivetrain"
                    label="Drivetrain"
                    render={(field) => (
                      <EnumSelect field={field} options={DRIVETRAINS} placeholder="Drivetrain" />
                    )}
                  />
                  <FormField<UpdateDerivativeRequest>
                    name="configuration"
                    label="Engine configuration"
                    render={(field) => (
                      <EnumSelect
                        field={field}
                        options={CONFIGURATIONS}
                        placeholder="Configuration"
                      />
                    )}
                  />
                  <FormField<UpdateDerivativeRequest>
                    name="aspiration"
                    label="Aspiration"
                    render={(field) => (
                      <EnumSelect field={field} options={ASPIRATIONS} placeholder="Aspiration" />
                    )}
                  />
                  <FormField<UpdateDerivativeRequest>
                    name="engineFamily"
                    label="Engine family"
                    render={(field) => <Input {...field} value={(field.value as string) ?? ''} />}
                  />
                  <FormField<UpdateDerivativeRequest>
                    name="engineCapacityCc"
                    label="Engine capacity (cc)"
                    render={(field) => (
                      <Input
                        {...field}
                        type="number"
                        value={(field.value as number) ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                        }
                      />
                    )}
                  />
                  <FormField<UpdateDerivativeRequest>
                    name="cylinders"
                    label="Cylinders"
                    render={(field) => (
                      <Input
                        {...field}
                        type="number"
                        value={(field.value as number) ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                        }
                      />
                    )}
                  />
                  <FormField<UpdateDerivativeRequest>
                    name="powerBhp"
                    label="Power (bhp)"
                    render={(field) => (
                      <Input
                        {...field}
                        type="number"
                        value={(field.value as number) ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                        }
                      />
                    )}
                  />
                  <FormField<UpdateDerivativeRequest>
                    name="torqueNm"
                    label="Torque (Nm)"
                    render={(field) => (
                      <Input
                        {...field}
                        type="number"
                        value={(field.value as number) ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                        }
                      />
                    )}
                  />
                  <FormField<UpdateDerivativeRequest>
                    name="zeroToSixtyTwoSeconds"
                    label="0-62mph (s)"
                    render={(field) => (
                      <Input
                        {...field}
                        type="number"
                        step="0.1"
                        value={(field.value as number) ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                        }
                      />
                    )}
                  />
                  <FormField<UpdateDerivativeRequest>
                    name="topSpeedMph"
                    label="Top speed (mph)"
                    render={(field) => (
                      <Input
                        {...field}
                        type="number"
                        value={(field.value as number) ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                        }
                      />
                    )}
                  />
                  <FormField<UpdateDerivativeRequest>
                    name="drivetrainManufacturerName"
                    label="Drivetrain manufacturer name"
                    render={(field) => <Input {...field} value={(field.value as string) ?? ''} />}
                  />
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-sm font-medium text-text">Transmissions</span>
                    <div className="flex flex-wrap gap-4">
                      {TRANSMISSIONS.map((transmission) => {
                        const current = (form.watch('transmissions') ?? []) as string[];
                        const checked = current.includes(transmission);
                        return (
                          <label
                            key={transmission}
                            className="flex items-center gap-2 text-sm text-text"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => {
                                const next = value
                                  ? [...current, transmission]
                                  : current.filter((t) => t !== transmission);
                                form.setValue('transmissions', next as never, {
                                  shouldDirty: true,
                                });
                              }}
                            />
                            {transmission}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" loading={form.formState.isSubmitting}>
                      Save changes
                    </Button>
                  </div>
                </form>
              </FormProvider>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aliases">
          <Card>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {detail.aliasRecords.length === 0 ? (
                  <span className="text-sm text-textMuted">No aliases yet.</span>
                ) : (
                  detail.aliasRecords.map((record) => (
                    <Badge key={record.id} variant="neutral" className="flex items-center gap-2">
                      {record.alias}
                      <button
                        type="button"
                        aria-label={`Remove alias ${record.alias}`}
                        onClick={() => void removeAlias(record.id)}
                        className="text-textMuted hover:text-error"
                      >
                        ×
                      </button>
                    </Badge>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  placeholder="New alias"
                />
                <Button type="button" onClick={() => void addAlias()} disabled={busy}>
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources">
          <Card>
            <CardContent className="flex flex-col gap-3">
              {detail.sourceLinks.length === 0 ? (
                <span className="text-sm text-textMuted">No sources attached yet.</span>
              ) : (
                <div className="flex flex-col gap-2">
                  {detail.sourceLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="text-text">{link.source?.name}</p>
                        {link.source?.url ? (
                          <a
                            href={link.source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary underline"
                          >
                            {link.source.url}
                          </a>
                        ) : null}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => void removeSource(link.id)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="Source name"
                />
                <Input
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="URL (optional)"
                />
                <Button type="button" onClick={() => void addSource()} disabled={busy}>
                  Attach
                </Button>
              </div>
              <p className="text-xs text-textMuted">
                Attaching a source moves a REVIEW_REQUIRED derivative to SOURCE_CONFIRMED.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={rejectConfirmOpen}
        onOpenChange={setRejectConfirmOpen}
        title="Reject this derivative?"
        description="This marks the record DEPRECATED — it will not be shown to buyers."
        confirmLabel="Reject"
        onConfirm={() => void reject()}
        loading={busy}
      />

      <ConfirmDialog
        open={mergeTarget !== null}
        onOpenChange={(open) => !open && setMergeTarget(null)}
        title="Merge duplicate?"
        description="The duplicate's aliases and sources are combined into this record, and the duplicate is deprecated."
        confirmLabel="Merge"
        destructive={false}
        onConfirm={() => mergeTarget && void merge(mergeTarget)}
        loading={busy}
      />
    </div>
  );
}
