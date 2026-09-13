/**
 * Semantic elevation (Plan 04 §4) — a shadow on web, `elevation`/shadow
 * props on mobile, same three levels on both. Colors are fixed black-alpha
 * values rather than theme-tokens: a shadow is a scene-light cue, not a
 * semantic surface color, so it doesn't need a dark-mode variant — it just
 * reads as more subtle against a dark background, which is correct.
 */
export const webShadow = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.06)',
  md: '0 4px 8px -2px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
  lg: '0 12px 24px -4px rgb(0 0 0 / 0.14), 0 4px 8px -4px rgb(0 0 0 / 0.08)',
} as const;

/**
 * React Native has no `box-shadow` — iOS reads the four `shadow*` props,
 * Android reads `elevation` alone, so every level carries both.
 */
export const nativeElevation = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 8,
  },
} as const;

export type ElevationKey = keyof typeof webShadow;
