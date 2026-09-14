import { ThemeProvider, ToastHost, Spinner, useTheme } from '@vehicles-marketplace/ui-mobile';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSession } from '../lib/auth-client';

/**
 * plans/07-authentication-authorization.md §7: "Session restoration on app
 * launch reads the stored token and revalidates it against the API before
 * rendering any authenticated screen." `useSession()`'s `isPending` is that
 * revalidation in flight — this gate is what keeps a cold restart from
 * flashing a logged-out screen (or the wrong screen) before it resolves.
 */
function SessionGate({ children }: { children: React.ReactNode }) {
  const { tokens } = useTheme();
  const { isPending } = useSession();

  if (isPending) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tokens.background,
        }}
      >
        <Spinner />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SessionGate>
          <Stack />
        </SessionGate>
        <ToastHost />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
