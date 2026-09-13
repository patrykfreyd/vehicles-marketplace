import { Check } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { radius } from '@vehicles-marketplace/design-tokens';
import { rnStyle } from '../lib/rn-style';
import { useTheme } from '../theme/theme-provider';

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  invalid?: boolean;
  disabled?: boolean;
}

export function Checkbox({ checked, onCheckedChange, invalid, disabled }: CheckboxProps) {
  const { tokens } = useTheme();

  const boxStyle = {
    height: 20,
    width: 20,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: invalid ? tokens.error : tokens.borderStrong,
    backgroundColor: checked ? tokens.primary : tokens.background,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <Pressable
      accessibilityRole="checkbox"
      // RN's AccessibilityState has no `invalid` field (unlike web's
      // aria-invalid) — the border color below is the only signal on this
      // platform, same limitation noted in input.tsx.
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onCheckedChange(!checked)}
      style={rnStyle(boxStyle)}
    >
      {checked ? <Check size={14} color={tokens.primaryForeground} strokeWidth={3} /> : null}
    </Pressable>
  );
}
