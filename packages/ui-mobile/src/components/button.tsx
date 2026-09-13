import { Pressable, Text } from 'react-native';
import type { PressableProps } from 'react-native';
import { radius } from '@vehicles-marketplace/design-tokens';
import { rnStyle } from '../lib/rn-style';
import { useTheme } from '../theme/theme-provider';
import { Spinner } from './spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: string;
}

const sizeStyles: Record<
  ButtonSize,
  { height: number; paddingHorizontal: number; fontSize: number }
> = {
  sm: { height: 32, paddingHorizontal: 12, fontSize: 13 },
  md: { height: 40, paddingHorizontal: 16, fontSize: 14 },
  lg: { height: 48, paddingHorizontal: 24, fontSize: 16 },
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const { tokens } = useTheme();
  const isDisabled = disabled || loading;

  const variantStyles: Record<
    ButtonVariant,
    { background: string; foreground: string; border?: string }
  > = {
    primary: { background: tokens.primary, foreground: tokens.primaryForeground },
    secondary: { background: tokens.surface, foreground: tokens.text, border: tokens.borderStrong },
    destructive: { background: tokens.error, foreground: tokens.errorForeground },
    ghost: { background: 'transparent', foreground: tokens.text },
  };
  const { background, foreground, border } = variantStyles[variant];
  const { height, paddingHorizontal, fontSize } = sizeStyles[size];

  // See lib/rn-style.ts: `Pressable`'s `style` prop type is broken in
  // react-native@0.87 for even trivially-valid objects, so both styles are
  // built as plain objects (no ViewStyle/TextStyle cast) and passed
  // through `rnStyle()` at the JSX boundary instead.
  const containerStyle = {
    height,
    paddingHorizontal,
    borderRadius: radius.md,
    backgroundColor: background,
    borderWidth: border ? 1 : 0,
    borderColor: border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    opacity: isDisabled ? 0.5 : 1,
  };
  const labelStyle = { color: foreground, fontSize, fontWeight: '500' };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={rnStyle(containerStyle)}
      {...props}
    >
      {loading ? <Spinner size="sm" color={foreground} /> : null}
      <Text style={rnStyle(labelStyle)}>{children}</Text>
    </Pressable>
  );
}
