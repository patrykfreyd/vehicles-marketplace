import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Animated, Modal as RNModal, Pressable, Text, View } from 'react-native';
import { radius } from '@vehicles-marketplace/design-tokens';
import { rnStyle } from '../lib/rn-style';
import { useTheme } from '../theme/theme-provider';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * The mobile side of §8's "Modal / Dialog" — wraps RN's built-in Modal,
 * dismissible via the backdrop or the Android back button. The overlay
 * fade uses RN's built-in `Animated` (see skeleton.tsx's comment for why
 * this package doesn't reach for `react-native-reanimated` here).
 */
export function Modal({ open, onOpenChange, children }: ModalProps) {
  const { tokens } = useTheme();
  // See skeleton.tsx's comment: `useState(() => ...)`, not `useRef().current`.
  const [overlayOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: open ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [open, overlayOpacity]);

  const overlayStyle = {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  };
  const contentStyle = {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius.lg,
    backgroundColor: tokens.background,
    padding: 20,
  };

  return (
    <RNModal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <Animated.View style={rnStyle([overlayStyle, { opacity: overlayOpacity }])}>
        <Pressable
          accessibilityLabel="Close"
          onPress={() => onOpenChange(false)}
          style={rnStyle({ position: 'absolute', inset: 0 })}
        />
        <View style={rnStyle(contentStyle)}>{children}</View>
      </Animated.View>
    </RNModal>
  );
}

export function ModalTitle({ children }: { children: string }) {
  const { tokens } = useTheme();
  const titleStyle = { fontSize: 18, fontWeight: '600', color: tokens.text };
  return <Text style={rnStyle(titleStyle)}>{children}</Text>;
}

export function ModalDescription({ children }: { children: string }) {
  const { tokens } = useTheme();
  const descriptionStyle = { marginTop: 6, fontSize: 14, color: tokens.textMuted };
  return <Text style={rnStyle(descriptionStyle)}>{children}</Text>;
}

export function ModalFooter({ children }: { children: ReactNode }) {
  const footerStyle = {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  };
  return <View style={rnStyle(footerStyle)}>{children}</View>;
}
