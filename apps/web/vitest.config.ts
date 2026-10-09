import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  // Next preserves JSX for its own compiler; component tests need to transform it.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'node',
  },
});
