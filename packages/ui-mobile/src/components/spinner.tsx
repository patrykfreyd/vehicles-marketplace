import { ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/theme-provider';

const sizeMap = { sm: 'small', md: 'small', lg: 'large' } as const;

export interface SpinnerProps {
  size?: keyof typeof sizeMap;
  color?: string;
}

export function Spinner({ size = 'md', color }: SpinnerProps) {
  const { tokens } = useTheme();
  return (
    <ActivityIndicator
      size={sizeMap[size]}
      color={color ?? tokens.primary}
      accessibilityLabel="Loading"
    />
  );
}
