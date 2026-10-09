import { createApiClient } from '@vehicles-marketplace/api-client';
import { Platform } from 'react-native';
import { authClient } from './auth-client';

export const apiClient = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001',
  credentials: 'include',
});
apiClient.use({
  async onRequest({ request }) {
    // Expo's supported cookie accessor reads SecureStore and handles signed tokens.
    if (Platform.OS !== 'web') request.headers.set('cookie', await authClient.getCookie());
    return request;
  },
});
