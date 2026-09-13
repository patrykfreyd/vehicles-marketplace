/** Corner-radius scale (Plan 04 §4), in px — shared by both platforms. */
export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export type RadiusKey = keyof typeof radius;
