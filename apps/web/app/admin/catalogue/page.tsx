'use client';

/**
 * plans/09-catalogue-import-tooling-admin.md §7 — the manufacturer list:
 * completeness % per manufacturer, sortable by the priority formula (§2/§34).
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Badge,
  Card,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  showApiErrorToast,
} from '@vehicles-marketplace/ui-web';
import type { ManufacturerSummary } from '@vehicles-marketplace/catalogue-types';
import type { ApiError } from '@vehicles-marketplace/validation';
import { apiClient } from '../../_lib/api-client';

type SortOption = 'priority' | 'completeness' | 'name';

function completenessVariant(value: number): 'success' | 'warning' | 'error' {
  if (value >= 90) return 'success';
  if (value >= 50) return 'warning';
  return 'error';
}

export default function CatalogueManufacturerListPage() {
  const [sort, setSort] = useState<SortOption>('priority');
  // `undefined` means "loading" — set back to it from the sort <Select>'s
  // own change handler (a user event, not an Effect), so the Effect below
  // never needs to call setState synchronously at its own top (React
  // Compiler's `react-hooks/set-state-in-effect` rule).
  const [manufacturers, setManufacturers] = useState<ManufacturerSummary[] | undefined>(undefined);
  const loading = manufacturers === undefined;

  useEffect(() => {
    let cancelled = false;
    apiClient
      .GET('/api/v1/catalogue-admin/manufacturers', { params: { query: { sort } } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          showApiErrorToast(error as ApiError);
          setManufacturers([]);
          return;
        }
        setManufacturers(data.items as ManufacturerSummary[]);
      });
    return () => {
      cancelled = true;
    };
  }, [sort]);

  const changeSort = (value: SortOption) => {
    setManufacturers(undefined);
    setSort(value);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">Manufacturers</h1>
        <Select value={sort} onValueChange={(value) => changeSort(value as SortOption)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">Sort: Priority</SelectItem>
            <SelectItem value="completeness">Sort: Completeness</SelectItem>
            <SelectItem value="name">Sort: Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !manufacturers || manufacturers.length === 0 ? (
        <EmptyState
          title="No manufacturers imported yet"
          description="Run `catalogue import <manufacturer>` from the CLI to populate the catalogue."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {manufacturers.map((make) => (
            <Link key={make.id} href={`/admin/catalogue/${make.id}`}>
              <Card className="flex items-center justify-between transition-colors hover:bg-surface">
                <div>
                  <p className="font-medium text-text">{make.name}</p>
                  <p className="text-sm text-textMuted">
                    {make.modelCount} model{make.modelCount === 1 ? '' : 's'} ·{' '}
                    {make.derivativeCount} derivative{make.derivativeCount === 1 ? '' : 's'}
                  </p>
                </div>
                <Badge variant={completenessVariant(make.averageCompleteness)}>
                  {make.averageCompleteness}%
                </Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
