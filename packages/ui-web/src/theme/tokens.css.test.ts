import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { light, dark, radius, webShadow } from '@vehicles-marketplace/design-tokens';

/**
 * tokens.css hand-copies `@vehicles-marketplace/design-tokens`' hex/px/
 * shadow values into CSS custom properties (a plain stylesheet can't
 * `import` a TS module) — this guards the two from silently drifting apart.
 */
const rawCss = readFileSync(join(__dirname, 'tokens.css'), 'utf-8').toLowerCase();
// Collapse all whitespace (including the line breaks in the multi-line
// shadow declarations) to single spaces so declaration text can be matched
// regardless of how it's wrapped in the source file.
const css = rawCss.replace(/\s+/g, ' ');

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cssHasDeclaration(varName: string, value: string, haystack: string = css): boolean {
  const pattern = new RegExp(
    `${escapeRegExp(varName)} *: *${escapeRegExp(value.toLowerCase())} *;`,
  );
  return pattern.test(haystack);
}

describe('tokens.css matches design-tokens (no drift)', () => {
  it.each([
    ['--background', light.background],
    ['--surface', light.surface],
    ['--text', light.text],
    ['--text-muted', light.textMuted],
    ['--border', light.border],
    ['--border-strong', light.borderStrong],
    ['--primary', light.primary],
    ['--primary-foreground', light.primaryForeground],
    ['--success', light.success],
    ['--success-foreground', light.successForeground],
    ['--warning', light.warning],
    ['--warning-foreground', light.warningForeground],
    ['--error', light.error],
    ['--error-foreground', light.errorForeground],
    ['--info', light.info],
    ['--info-foreground', light.infoForeground],
  ])('light %s matches design-tokens', (varName, hex) => {
    expect(cssHasDeclaration(varName, hex)).toBe(true);
  });

  const darkBlock = css.slice(css.indexOf('.dark {'));
  it.each([
    ['--background', dark.background],
    ['--surface', dark.surface],
    ['--text', dark.text],
    ['--text-muted', dark.textMuted],
    ['--border', dark.border],
    ['--border-strong', dark.borderStrong],
    ['--primary', dark.primary],
    ['--primary-foreground', dark.primaryForeground],
    ['--success', dark.success],
    ['--success-foreground', dark.successForeground],
    ['--warning', dark.warning],
    ['--warning-foreground', dark.warningForeground],
    ['--error', dark.error],
    ['--error-foreground', dark.errorForeground],
    ['--info', dark.info],
    ['--info-foreground', dark.infoForeground],
  ])('.dark %s matches design-tokens', (varName, hex) => {
    expect(cssHasDeclaration(varName, hex, darkBlock)).toBe(true);
  });

  it.each(Object.entries(radius))('--radius-%s matches design-tokens (%dpx)', (key, px) => {
    expect(cssHasDeclaration(`--radius-${key}`, `${px}px`)).toBe(true);
  });

  it.each(Object.entries(webShadow).filter(([key]) => key !== 'none'))(
    '--shadow-%s matches design-tokens',
    (key, value) => {
      expect(cssHasDeclaration(`--shadow-${key}`, value)).toBe(true);
    },
  );
});
