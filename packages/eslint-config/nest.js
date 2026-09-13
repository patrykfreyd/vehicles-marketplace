// Overlay for NestJS apps with HTTP controllers (currently just `api`) —
// spread alongside `base.js`/`node.js`. Carries the one project-specific
// rule plans/05-backend-api-foundation.md §5 asks for: every
// @Body()/@Query()/@Param() handler parameter must be explicitly typed. See
// rules/require-typed-nest-params.js for what it does and does not check.
module.exports = [
  {
    files: ['**/*.ts'],
    plugins: {
      local: {
        rules: {
          'require-typed-nest-params': require('./rules/require-typed-nest-params'),
        },
      },
    },
    rules: {
      'local/require-typed-nest-params': 'error',
    },
  },
];
