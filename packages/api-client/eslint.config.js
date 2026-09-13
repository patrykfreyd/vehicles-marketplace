const { base, node } = require('@vehicles-marketplace/eslint-config');

module.exports = [
  ...base,
  ...node,
  {
    // Generated output — never hand-edited, and its formatting/shape is
    // openapi-typescript's to own, not this repo's lint rules'.
    ignores: ['src/generated/**'],
  },
];
