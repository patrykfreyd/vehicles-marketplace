const { base, node } = require('@vehicles-marketplace/eslint-config');

module.exports = [
  ...base,
  ...node,
  {
    rules: {
      // Nest decorators put class members before their usage is "read"; the
      // recommended TS rule otherwise flags e.g. constructor param props.
      '@typescript-eslint/no-useless-constructor': 'off',
    },
  },
];
