// Overlay for React Native apps/packages: mobile, ui-mobile. Same rule set
// as `react.js` (RN uses the same JSX/hooks conventions) but without the DOM
// browser globals, since there is no DOM at runtime. Node globals are still
// included — Expo's own config files (babel.config.js, metro.config.js)
// live inside the app and run under Node, not the RN runtime.
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const globals = require('globals');

module.exports = [
  {
    files: ['**/*.{jsx,tsx}', '**/*.{js,ts}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
];
