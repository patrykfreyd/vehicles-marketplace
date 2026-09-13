import { Text, View } from 'react-native';
import RNToast, { type ToastConfig, type ToastConfigParams } from 'react-native-toast-message';
import { rnStyle } from './lib/rn-style';
import { useTheme } from './theme/theme-provider';

/**
 * The one thin wrapper around react-native-toast-message (Plan 04 §7) —
 * calling code never imports it directly, mirroring ui-web's toast.tsx so
 * both platforms share the same call-site shape.
 */
export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ShowToastOptions {
  description?: string;
  durationMs?: number;
}

export function showToast(
  variant: ToastVariant,
  message: string,
  options?: ShowToastOptions,
): void {
  RNToast.show({
    type: variant,
    text1: message,
    text2: options?.description,
    visibilityTime: options?.durationMs ?? 4000,
  });
}

interface ToastCardProps {
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  mutedColor: string;
  params: ToastConfigParams<unknown>;
}

function ToastCard({
  accentColor,
  backgroundColor,
  textColor,
  mutedColor,
  params,
}: ToastCardProps) {
  const containerStyle = {
    minHeight: 56,
    width: '92%',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: accentColor,
    backgroundColor,
    paddingVertical: 10,
    paddingHorizontal: 12,
  };
  const titleStyle = { fontSize: 14, fontWeight: '600', color: textColor };
  const descriptionStyle = { fontSize: 12, color: mutedColor, marginTop: 2 };

  return (
    <View style={rnStyle(containerStyle)}>
      <Text style={rnStyle(titleStyle)}>{params.text1}</Text>
      {params.text2 ? <Text style={rnStyle(descriptionStyle)}>{params.text2}</Text> : null}
    </View>
  );
}

/**
 * Mount once near the app root, inside `<ThemeProvider>` — builds
 * react-native-toast-message's config from the *current* theme so a toast
 * fired right after a theme switch still renders in the right colors
 * (react-native-toast-message's own config is static otherwise).
 */
export function ToastHost() {
  const { tokens } = useTheme();

  const config: ToastConfig = {
    success: (params) => (
      <ToastCard
        accentColor={tokens.success}
        backgroundColor={tokens.surface}
        textColor={tokens.text}
        mutedColor={tokens.textMuted}
        params={params}
      />
    ),
    error: (params) => (
      <ToastCard
        accentColor={tokens.error}
        backgroundColor={tokens.surface}
        textColor={tokens.text}
        mutedColor={tokens.textMuted}
        params={params}
      />
    ),
    warning: (params) => (
      <ToastCard
        accentColor={tokens.warning}
        backgroundColor={tokens.surface}
        textColor={tokens.text}
        mutedColor={tokens.textMuted}
        params={params}
      />
    ),
    info: (params) => (
      <ToastCard
        accentColor={tokens.info}
        backgroundColor={tokens.surface}
        textColor={tokens.text}
        mutedColor={tokens.textMuted}
        params={params}
      />
    ),
  };

  return <RNToast config={config} />;
}
