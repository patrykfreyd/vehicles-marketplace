// Root-level config, mainly for editors/tsserver opened at the repo root
// and for linting stray root files (commitlint.config.cjs, etc). Turborepo
// runs each app/package's own eslint.config.js for `pnpm lint`.
const { base, node } = require('@vehicles-marketplace/eslint-config');

module.exports = [...base, ...node];
