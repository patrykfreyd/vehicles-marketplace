/**
 * Framework-agnostic design tokens (Plan 04 §4) — consumed by `ui-web` (via
 * Tailwind CSS variables, see ui-web/src/theme/tokens.css) and `ui-mobile`
 * (via the plain JS objects re-exported here) so both platforms render
 * from one definition.
 */
export * from './colors';
export * from './spacing';
export * from './radius';
export * from './typography';
export * from './elevation';
export * from './contrast';
