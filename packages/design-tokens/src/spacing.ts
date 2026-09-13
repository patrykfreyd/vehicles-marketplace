/**
 * Spacing scale — 4px base unit (Plan 04 §4). Keys are the multiple of the
 * base unit (matches Tailwind's own numbering, e.g. `spacing[4]` === 16px
 * === Tailwind's `p-4`), values are the resolved px number so `ui-mobile`
 * can use them directly as RN style numbers with no unit suffix.
 */
export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export type SpacingKey = keyof typeof spacing;
