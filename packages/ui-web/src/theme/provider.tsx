'use client';

/**
 * Theming (Plan 04 §5, web side): `next-themes` handles persistence
 * (localStorage) and system-preference detection, and toggles the `dark`
 * class on `<html>` that tokens.css's `.dark` block and Tailwind's
 * `class`-strategy dark mode both key off. Both platforms default to
 * system preference with an explicit override, per §5's last paragraph.
 */
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

export interface ThemeProviderProps {
  children: ReactNode;
  /** Storage key next-themes persists the explicit override under. */
  storageKey?: string;
}

export function ThemeProvider({ children, storageKey = 'theme' }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={storageKey}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
