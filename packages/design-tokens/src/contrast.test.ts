import { describe, expect, it } from 'vitest';
import { light, dark, type ColorTokens, type ThemeName } from './colors';
import { contrastRatio, AA_NORMAL_TEXT, AA_UI_COMPONENT } from './contrast';

/**
 * Enforces Plan 04 §11: "Every color in §4 meets WCAG AA contrast against
 * its paired background in both themes (checked with an automated
 * contrast tool as part of this plan, not left to manual eyeballing)."
 *
 * Each row is a real on-screen pairing, not every mathematically possible
 * combination — e.g. `success` is never rendered as small text directly on
 * `background`, only as a filled Toast/Badge with `successForeground` text,
 * so that's the pairing checked.
 */
const themes: Record<ThemeName, ColorTokens> = { light, dark };

describe.each(Object.entries(themes))('%s theme contrast', (_name, t) => {
  it.each([
    ['text on background', t.text, t.background],
    ['text on surface', t.text, t.surface],
    ['textMuted on background', t.textMuted, t.background],
    ['textMuted on surface', t.textMuted, t.surface],
    ['error on background (inline field error text)', t.error, t.background],
    ['error on surface (inline field error text)', t.error, t.surface],
    ['primaryForeground on primary (button fill)', t.primaryForeground, t.primary],
    ['successForeground on success (toast/badge fill)', t.successForeground, t.success],
    ['warningForeground on warning (toast/badge fill)', t.warningForeground, t.warning],
    ['errorForeground on error (toast/badge fill)', t.errorForeground, t.error],
    ['infoForeground on info (toast/badge fill)', t.infoForeground, t.info],
  ])('%s meets AA normal-text contrast (>= 4.5:1)', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  // `border` itself is a decorative divider (never the sole cue that a
  // control is interactive) so WCAG 1.4.11 doesn't bind it — only
  // `borderStrong`, used for input/checkbox/radio/select outlines, needs
  // the 3:1 UI-component minimum, and only against `background`, which is
  // where every form control in this system is placed.
  it('borderStrong on background (input outline) meets AA UI-component contrast (>= 3:1)', () => {
    expect(contrastRatio(t.borderStrong, t.background)).toBeGreaterThanOrEqual(AA_UI_COMPONENT);
  });
});
