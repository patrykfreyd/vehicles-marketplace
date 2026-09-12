// Overlay for Node-only packages/apps (api, worker, catalogue-cli, and the
// plain TS packages). Spread alongside `base.js`.
const globals = require('globals');

module.exports = [
  {
    languageOptions: {
      globals: globals.node,
    },
  },
];
