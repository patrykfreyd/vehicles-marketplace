import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, Text } from 'react-native';
import { radius } from '@vehicles-marketplace/design-tokens';
import { rnStyle } from '../lib/rn-style';
import { useTheme } from '../theme/theme-provider';
import { Modal, ModalTitle } from './modal';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  invalid?: boolean;
}

/**
 * Mobile has no Radix equivalent, so §8's Select is a native picker:
 * a trigger that opens a full-screen-ish modal list, rather than an
 * inline dropdown (which doesn't work well as a touch target on mobile).
 */
export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  label,
  invalid,
}: SelectProps) {
  const { tokens } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  const triggerStyle = {
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: invalid ? tokens.error : tokens.borderStrong,
    backgroundColor: tokens.background,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  };
  const valueStyle = { fontSize: 14, color: selected ? tokens.text : tokens.textMuted };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={rnStyle(triggerStyle)}
      >
        <Text style={rnStyle(valueStyle)}>{selected?.label ?? placeholder}</Text>
        <ChevronDown size={16} color={tokens.textMuted} />
      </Pressable>
      <Modal open={open} onOpenChange={setOpen}>
        {label ? <ModalTitle>{label}</ModalTitle> : null}
        <FlatList
          data={options}
          keyExtractor={(option) => option.value}
          style={rnStyle({ marginTop: label ? 12 : 0, maxHeight: 320 })}
          renderItem={({ item }) => {
            const rowStyle = {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 12,
            };
            const rowLabelStyle = { fontSize: 14, color: tokens.text };
            return (
              <Pressable
                accessibilityRole="menuitem"
                accessibilityState={{ selected: item.value === value }}
                onPress={() => {
                  onValueChange(item.value);
                  setOpen(false);
                }}
                style={rnStyle(rowStyle)}
              >
                <Text style={rnStyle(rowLabelStyle)}>{item.label}</Text>
                {item.value === value ? <Check size={16} color={tokens.primary} /> : null}
              </Pressable>
            );
          }}
        />
      </Modal>
    </>
  );
}
