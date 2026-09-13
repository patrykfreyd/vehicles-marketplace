/**
 * WCAG 2.x contrast-ratio math (relative luminance -> contrast ratio), used
 * by contrast.test.ts to enforce Plan 04 §11's "every color in §4 meets
 * WCAG AA... checked with an automated contrast tool" acceptance criterion.
 * No dependency pulled in for this — the formula is ~15 lines, straight
 * from the spec: https://www.w3.org/TR/WCAG21/#contrast-minimum
 */

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

function hexToRgb(hex: string): [number, number, number] {
  const match = HEX_RE.exec(hex);
  if (!match) {
    throw new Error(`Expected a 6-digit hex color like "#RRGGBB", got "${hex}"`);
  }
  // Non-null: HEX_RE has exactly one capture group, so a successful match
  // always populates it (noUncheckedIndexedAccess can't see that).
  const value = match[1]!;
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function channelToLinear(channel8bit: number): number {
  const c = channel8bit / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Relative luminance of a `#RRGGBB` color, per WCAG's definition (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

/** WCAG contrast ratio between two `#RRGGBB` colors — ranges from 1 (identical) to 21 (black vs. white). */
export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA minimums. "large" = >=18pt, or >=14pt bold — used for headings and icon-only UI, not body/label text. */
export const AA_NORMAL_TEXT = 4.5;
export const AA_LARGE_TEXT = 3;
/** Non-text UI components (input borders, focus rings) per WCAG 1.4.11. */
export const AA_UI_COMPONENT = 3;

export function meetsAA(hexA: string, hexB: string, minimum: number = AA_NORMAL_TEXT): boolean {
  return contrastRatio(hexA, hexB) >= minimum;
}
