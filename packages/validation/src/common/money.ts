/**
 * Money is always an integer count of minor units (pence) — never a float —
 * to avoid rounding bugs in price comparisons/filters. Fields carrying a
 * value validated by this schema are always named with a `Pence` suffix
 * (e.g. `pricePence`), per plans/03-shared-types-validation.md §3.
 */
import { z } from 'zod';

export const MoneyPenceSchema = z
  .number()
  .int('Amount must be a whole number of pence')
  .nonnegative('Amount cannot be negative');

export type MoneyPence = z.infer<typeof MoneyPenceSchema>;
