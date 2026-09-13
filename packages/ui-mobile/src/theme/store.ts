import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemePreferenceState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

/**
 * Plan 04 §5 (mobile): the *explicit override* only — "system" means "defer
 * to `Appearance.getColorScheme()`", read live in theme-provider.tsx, not
 * stored here. Persisted via AsyncStorage so an explicit choice survives
 * app restarts, same as next-themes' localStorage on web.
 */
export const useThemePreferenceStore = create<ThemePreferenceState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: 'theme-preference',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
