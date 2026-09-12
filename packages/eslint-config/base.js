// Shared base ESLint flat config: plain TypeScript rules, no framework
// assumptions. Apps layer `node.js`, `react.js`, or `react-native.js` on top
// of this for their runtime-specific globals/plugins.
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettier = require('eslint-config-prettier');

module.exports = tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/.expo/**',
      '**/coverage/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Every plain .js/.cjs file in this repo is intentionally CommonJS (no
    // package.json declares "type": "module", specifically so ts-node and
    // Nest's decorator metadata stay simple) — require() is the correct
    // syntax there, not a lint violation. Only .ts/.tsx files should be
    // pushed toward `import`.
    files: ['**/*.js', '**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
