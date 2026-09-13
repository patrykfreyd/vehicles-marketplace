import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { rnStyle } from '../lib/rn-style';
import { useTheme } from '../theme/theme-provider';

interface RadioGroupContextValue {
  value: string | undefined;
  onValueChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps extends RadioGroupContextValue {
  children: ReactNode;
  // Loose `object` rather than `ViewStyle` — see lib/rn-style.ts: RN
  // 0.87's exported `ViewStyle` doesn't reliably structurally match plain
  // style objects, so component props that accept a style override use
  // `object` and pass the value through `rnStyle()` at the JSX boundary.
  style?: object;
}

export function RadioGroup({ children, style, ...contextValue }: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={contextValue}>
      <View accessibilityRole="radiogroup" style={rnStyle(style)}>
        {children}
      </View>
    </RadioGroupContext.Provider>
  );
}

export function RadioGroupItem({ value }: { value: string }) {
  const context = useContext(RadioGroupContext);
  if (!context) {
    throw new Error('<RadioGroupItem> must be used inside <RadioGroup>');
  }
  const { tokens } = useTheme();
  const { value: selected, onValueChange, invalid, disabled } = context;
  const checked = selected === value;

  const outerStyle = {
    height: 20,
    width: 20,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: invalid ? tokens.error : tokens.borderStrong,
    backgroundColor: tokens.background,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.5 : 1,
  };
  const dotStyle = { height: 10, width: 10, borderRadius: 9999, backgroundColor: tokens.primary };

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(value)}
      style={rnStyle(outerStyle)}
    >
      {checked ? <View style={rnStyle(dotStyle)} /> : null}
    </Pressable>
  );
}
