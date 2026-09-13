import { colorThemes, type ColorTokens, type ThemeName } from '@vehicles-marketplace/design-tokens';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Appearance } from 'react-native';
import { useThemePreferenceStore, type ThemePreference } from './store';

/**
 * Plan 04 §5 (mobile): a small ThemeProvider (Context + Zustand for the
 * persisted preference) reads `Appearance.getColorScheme()` for the system
 * default, persists an explicit override via AsyncStorage (see store.ts),
 * and exposes the active token set via `useTheme()`. Same token *names* as
 * web, different delivery mechanism — RN has no CSS variables, so
 * components read `tokens.primary` etc. from context instead of a
 * `bg-primary` class.
 */
export interface ThemeContextValue {
  /** The resolved token set to actually render with. */
  tokens: ColorTokens;
  /** 'light' | 'dark' — which side `tokens` resolved to. */
  themeName: ThemeName;
  /** The user's explicit choice, or 'system' to follow the OS. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useThemePreferenceStore((state) => state.preference);
  const setPreference = useThemePreferenceStore((state) => state.setPreference);
  const [systemScheme, setSystemScheme] = useState(() => Appearance.getColorScheme() ?? 'light');

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme ?? 'light');
    });
    return () => subscription.remove();
  }, []);

  const themeName: ThemeName = preference === 'system' ? systemScheme : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      tokens: colorThemes[themeName],
      themeName,
      preference,
      setPreference,
    }),
    [themeName, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme() must be called inside <ThemeProvider>');
  }
  return context;
}
