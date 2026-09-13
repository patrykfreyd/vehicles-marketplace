import { Text, View } from 'react-native';
import { rnStyle } from '../lib/rn-style';
import { useTheme } from '../theme/theme-provider';

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: string;
}

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  const { tokens } = useTheme();
  const colorMap: Record<BadgeVariant, { background: string; foreground: string }> = {
    neutral: { background: tokens.border, foreground: tokens.text },
    primary: { background: tokens.primary, foreground: tokens.primaryForeground },
    success: { background: tokens.success, foreground: tokens.successForeground },
    warning: { background: tokens.warning, foreground: tokens.warningForeground },
    error: { background: tokens.error, foreground: tokens.errorForeground },
    info: { background: tokens.info, foreground: tokens.infoForeground },
  };
  const { background, foreground } = colorMap[variant];

  const containerStyle = {
    alignSelf: 'flex-start',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    backgroundColor: background,
  };
  const labelStyle = { fontSize: 12, fontWeight: '500', color: foreground };

  return (
    <View style={rnStyle(containerStyle)}>
      <Text style={rnStyle(labelStyle)}>{children}</Text>
    </View>
  );
}
