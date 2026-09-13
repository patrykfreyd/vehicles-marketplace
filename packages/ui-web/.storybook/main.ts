import tailwindcss from '@tailwindcss/vite';
import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Plan 04 §12.3: Storybook set up properly (not deferred behind the
 * `/dev/components` demo route) — one story per component in §8, running
 * against the real Tailwind build (via `@tailwindcss/vite`, since
 * Storybook's own Vite server doesn't go through apps/web's Next/PostCSS
 * pipeline) so every story renders with real tokens.css styling, in both
 * themes (`@storybook/addon-themes` adds the light/dark toolbar toggle).
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs', '@storybook/addon-themes'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (viteConfig) => {
    viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()];
    return viteConfig;
  },
};

export default config;
