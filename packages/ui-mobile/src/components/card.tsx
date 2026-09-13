import { Text, View } from 'react-native';
import type { ViewProps } from 'react-native';
import { nativeElevation, radius } from '@vehicles-marketplace/design-tokens';
import { rnStyle } from '../lib/rn-style';
import { useTheme } from '../theme/theme-provider';

export function Card({ style, ...props }: ViewProps) {
  const { tokens } = useTheme();
  const cardStyle = {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.surface,
    padding: 16,
    ...nativeElevation.sm,
  };
  return <View style={rnStyle([cardStyle, style])} {...props} />;
}

export function CardHeader({ style, ...props }: ViewProps) {
  const headerStyle = { marginBottom: 12, gap: 4 };
  return <View style={rnStyle([headerStyle, style])} {...props} />;
}

export function CardTitle({ children }: { children: string }) {
  const { tokens } = useTheme();
  const titleStyle = { fontSize: 18, fontWeight: '600', color: tokens.text };
  return <Text style={rnStyle(titleStyle)}>{children}</Text>;
}

export function CardDescription({ children }: { children: string }) {
  const { tokens } = useTheme();
  const descriptionStyle = { fontSize: 13, color: tokens.textMuted };
  return <Text style={rnStyle(descriptionStyle)}>{children}</Text>;
}

export function CardContent({ children }: { children: string }) {
  const { tokens } = useTheme();
  const contentStyle = { fontSize: 14, color: tokens.text };
  return <Text style={rnStyle(contentStyle)}>{children}</Text>;
}

export function CardFooter({ style, ...props }: ViewProps) {
  const footerStyle = { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 };
  return <View style={rnStyle([footerStyle, style])} {...props} />;
}
