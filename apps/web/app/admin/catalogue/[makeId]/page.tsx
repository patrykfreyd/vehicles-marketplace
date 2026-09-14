'use client';

/**
 * plans/09-catalogue-import-tooling-admin.md §7 — manufacturer detail:
 * model list with per-model/generation completeness and status counts
 * (Complete / In Progress / Warning), matching the idea doc's tree example.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  showApiErrorToast,
} from '@vehicles-marketplace/ui-web';
import type { ManufacturerDetail } from '@vehicles-marketplace/catalogue-types';
import { apiClient } from '../../../_lib/api-client';

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'APPROVED') return 'success';
  if (status === 'DEPRECATED') return 'neutral';
  if (status === 'SOURCE_CONFIRMED') return 'success';
  if (status === 'REVIEW_REQUIRED') return 'error';
  return 'warning';
}

export default function ManufacturerDetailPage() {
  const params = useParams<{ makeId: string }>();
  const makeId = params.makeId;
  const [detail, setDetail] = useState<ManufacturerDetail | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .GET('/api/v1/catalogue-admin/manufacturers/{makeId}', { params: { path: { makeId } } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          showApiErrorToast(error);
          setDetail(null);
          return;
        }
        setDetail(data as ManufacturerDetail);
      });
    return () => {
      cancelled = true;
    };
  }, [makeId]);

  if (detail === undefined) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (detail === null) {
    return <EmptyState title="Manufacturer not found" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/catalogue" className="text-sm text-primary underline">
          ← Manufacturers
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-text">{detail.name}</h1>
      </div>

      {detail.models.length === 0 ? (
        <EmptyState title="No models yet" />
      ) : (
        detail.models.map((model) => (
          <Card key={model.id}>
            <CardHeader>
              <CardTitle>{model.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {model.generations.map((generation) => (
                <div key={generation.id} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text">{generation.code}</span>
                    <span className="text-xs text-textMuted">
                      {generation.productionStartYear}
                      {generation.productionEndYear
                        ? `–${generation.productionEndYear}`
                        : '–present'}
                    </span>
                    {generation.warningCount > 0 ? (
                      <Badge variant="error">Warning</Badge>
                    ) : generation.completeCount === generation.derivativeCount &&
                      generation.derivativeCount > 0 ? (
                      <Badge variant="success">Complete</Badge>
                    ) : (
                      <Badge variant="warning">In Progress</Badge>
                    )}
                    <span className="text-xs text-textMuted">
                      {generation.averageCompleteness}% avg
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 pl-4">
                    {generation.derivatives.map((derivative) => (
                      <Link
                        key={derivative.id}
                        href={`/admin/catalogue/${makeId}/derivatives/${derivative.id}`}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-surface"
                      >
                        <span className="text-text">{derivative.name}</span>
                        <span className="flex items-center gap-2">
                          {derivative.hasOpenIssue ? <Badge variant="error">Issue</Badge> : null}
                          <Badge variant={statusVariant(derivative.status)}>
                            {derivative.status}
                          </Badge>
                          <span className="text-textMuted">{derivative.completenessScore}%</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
