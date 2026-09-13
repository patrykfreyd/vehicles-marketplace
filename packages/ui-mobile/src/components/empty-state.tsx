import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { radius } from '@vehicles-marketplace/design-tokens';
import { rnStyle } from '../lib/rn-style';
import { useTheme } from '../theme/theme-provider';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const { tokens } = useTheme();

  const containerStyle = {
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: tokens.border,
    padding: 32,
  };
  const titleStyle = { fontSize: 14, fontWeight: '500', color: tokens.text, textAlign: 'center' };
  const descriptionStyle = { fontSize: 13, color: tokens.textMuted, textAlign: 'center' };

  return (
    <View style={rnStyle(containerStyle)}>
      {icon}
      <Text style={rnStyle(titleStyle)}>{title}</Text>
      {description ? <Text style={rnStyle(descriptionStyle)}>{description}</Text> : null}
      {action}
    </View>
  );
}
