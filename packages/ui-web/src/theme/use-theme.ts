'use client';

import { useTheme as useNextTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { colorThemes, type ColorTokens, type ThemeName } from '@vehicles-marketplace/design-tokens';

/** Re-exported as-is: `theme` is the explicit preference ('system' | 'light' | 'dark'), `setTheme` writes it, `resolvedTheme` is what's actually rendered. */
export { useNextTheme as useTheme };

const noopSubscribe = () => () => {};
/** True once mounted on the client — an external-store read (not effect + setState) so it needs no cascading re-render and no lint suppression. */
function useIsMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * The active theme's raw token *values* (hex strings, not CSS vars) — for
 * the rare case a component needs an actual color rather than a Tailwind
 * class (an inline SVG `fill`, a `<canvas>` draw call, Storybook's toolbar
 * preview). Most components should just use `bg-*`/`text-*` classes
 * against tokens.css instead, which need no theme-aware JS at all.
 *
 * Returns the light palette during SSR/first paint (before hydration knows
 * the resolved theme) to avoid a hydration mismatch — matches next-themes'
 * own guidance for anything read off `resolvedTheme` on first render.
 */
export function useColorTokens(): ColorTokens {
  const { resolvedTheme } = useNextTheme();
  const mounted = useIsMounted();

  const themeName: ThemeName = mounted && resolvedTheme === 'dark' ? 'dark' : 'light';
  return colorThemes[themeName];
}
