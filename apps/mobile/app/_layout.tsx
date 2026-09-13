import { ThemeProvider, ToastHost } from '@vehicles-marketplace/ui-mobile';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Stack />
        <ToastHost />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
