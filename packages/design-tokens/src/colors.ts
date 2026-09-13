/**
 * Color tokens — placeholder palette pulled from the mockup boards (Plan 04
 * §4/§12: confirmed close enough to lock in for V1; a finished brand
 * decision is out of scope, see §10).
 *
 * Every color below is checked for WCAG AA contrast against every
 * background it's actually painted on (see contrast.test.ts) — no value
 * here was picked by eyeballing.
 *
 * `success`/`warning`/`error`/`info` double as *fills* (a solid Toast or
 * Badge background) and their `*Foreground` sibling is the text/icon color
 * that stays legible on that fill. This is the one place the two themes
 * genuinely diverge in more than raw hex: light mode's warning/success
 * hues are light enough that only dark text clears 4.5:1 on them, while
 * every dark-mode fill is pastel-lightened for legibility against a near-
 * black page — so *every* dark-mode foreground is the theme's own
 * `background` (its darkest color), not white. Reusing `background` here
 * (rather than inventing a new near-black) keeps the palette's actual hex
 * count unchanged.
 */
export const light = {
  background: '#FFFFFF',
  surface: '#F5F6F7',
  text: '#111417',
  textMuted: '#5B6470',
  border: '#E2E5E9',
  // `border` alone (1.26:1 on `background`) is a deliberately subtle
  // divider/card-outline color and never the *only* cue that a control is
  // interactive, so WCAG 1.4.11 (non-text contrast) doesn't apply to it.
  // Inputs/checkboxes/radios/selects — where the outline IS load-bearing —
  // use `borderStrong` instead, which does clear 1.4.11's 3:1 against
  // `background` (see contrast.test.ts).
  borderStrong: '#7E86A0',
  primary: '#2151FF', // matches the mockups' blue CTA buttons
  primaryForeground: '#FFFFFF',
  success: '#16A34A',
  successForeground: '#111417',
  warning: '#D97706',
  warningForeground: '#111417',
  // A hair darker than the mockups' #DC2626 — that value cleared AA on
  // `background` (4.83:1) but fell just short on `surface` (4.46:1, below
  // the 4.5:1 minimum); this still reads as the same red.
  error: '#D62020',
  errorForeground: '#FFFFFF',
  info: '#2563EB',
  infoForeground: '#FFFFFF',
} as const;

export const dark = {
  background: '#0B0D10', // matches the mockups' dark navy/black
  surface: '#15181C',
  text: '#F4F5F6',
  textMuted: '#9AA3AD',
  border: '#262B31',
  borderStrong: '#666D78',
  primary: '#5C82FF',
  primaryForeground: '#0B0D10',
  success: '#22C55E',
  successForeground: '#0B0D10',
  warning: '#F59E0B',
  warningForeground: '#0B0D10',
  error: '#EF4444',
  errorForeground: '#0B0D10',
  info: '#3B82F6',
  infoForeground: '#0B0D10',
} as const;

// A structural (not literal) shape: `light`/`dark` stay `as const` for
// precise literal inference at their own call sites, but `ColorTokens` is
// what code that's generic over "either theme" (colorThemes, the contrast
// test, ui-web/ui-mobile's useTheme()) should be typed against.
export interface ColorTokens {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  primary: string;
  primaryForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  error: string;
  errorForeground: string;
  info: string;
  infoForeground: string;
}
export type ColorToken = keyof ColorTokens;
export type ThemeName = 'light' | 'dark';

export const colorThemes: Record<ThemeName, ColorTokens> = { light, dark };

/** The four feedback colors shared by toasts (§7) and inline field errors (§6) — one palette for all feedback. */
export const feedbackColorKeys = ['success', 'warning', 'error', 'info'] as const;
export type FeedbackColorKey = (typeof feedbackColorKeys)[number];
