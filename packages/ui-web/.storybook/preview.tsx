import type { Preview } from '@storybook/react-vite';
import { withThemeByClassName } from '@storybook/addon-themes';
import { Toaster } from '../src/toast';
import './tailwind.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: { disable: true }, // the light/dark toolbar (below) drives background via the `dark` class + tokens.css instead
    a11y: { test: 'todo' },
  },
  decorators: [
    withThemeByClassName({
      themes: { light: '', dark: 'dark' },
      defaultTheme: 'light',
    }),
    (Story) => (
      <div className="min-h-screen bg-background p-6 text-text">
        <Story />
        <Toaster />
      </div>
    ),
  ],
};

export default preview;
