import { forwardRef } from 'react';
import type { ComponentRef } from 'react';
import { TextInput } from 'react-native';
import type { TextInputProps } from 'react-native';
import { radius } from '@vehicles-marketplace/design-tokens';
import { rnStyle } from '../lib/rn-style';
import { useTheme } from '../theme/theme-provider';

export interface InputProps extends TextInputProps {
  invalid?: boolean;
}

export const Input = forwardRef<ComponentRef<typeof TextInput>, InputProps>(
  ({ style, invalid, ...props }, ref) => {
    const { tokens } = useTheme();

    const inputStyle = {
      height: 44,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: invalid ? tokens.error : tokens.borderStrong,
      backgroundColor: tokens.background,
      paddingHorizontal: 12,
      fontSize: 14,
      color: tokens.text,
    };

    return (
      <TextInput
        ref={ref}
        // §6's aria-invalid/aria-describedby, RN's way: there's no `invalid`
        // in RN's AccessibilityState and no describedby equivalent at all,
        // so the border color above is the only visual signal and
        // <FormField> folds the error text into `accessibilityHint` instead.
        accessibilityState={{ disabled: props.editable === false }}
        placeholderTextColor={tokens.textMuted}
        style={rnStyle([inputStyle, style])}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
