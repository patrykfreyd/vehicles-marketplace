import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { radius } from '@vehicles-marketplace/design-tokens';
import { rnStyle } from '../lib/rn-style';
import { useTheme } from '../theme/theme-provider';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(componentName: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error(`<${componentName}> must be used inside <Tabs>`);
  }
  return context;
}

export interface TabsProps extends TabsContextValue {
  children: ReactNode;
  // See lib/rn-style.ts for why this is a loose `object`, not `ViewStyle`.
  style?: object;
}

export function Tabs({ children, style, ...contextValue }: TabsProps) {
  return (
    <TabsContext.Provider value={contextValue}>
      <View style={rnStyle(style)}>{children}</View>
    </TabsContext.Provider>
  );
}

export function TabsList({ children }: { children: ReactNode }) {
  const { tokens } = useTheme();
  const listStyle = {
    flexDirection: 'row',
    gap: 4,
    borderRadius: radius.md,
    backgroundColor: tokens.surface,
    padding: 4,
  };
  return (
    <View accessibilityRole="tablist" style={rnStyle(listStyle)}>
      {children}
    </View>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: string }) {
  const { tokens } = useTheme();
  const { value: active, onValueChange } = useTabsContext('TabsTrigger');
  const selected = active === value;

  const triggerStyle = {
    flex: 1,
    borderRadius: radius.sm,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: selected ? tokens.background : 'transparent',
  };
  const labelStyle = {
    fontSize: 13,
    fontWeight: '500',
    color: selected ? tokens.text : tokens.textMuted,
  };

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={() => onValueChange(value)}
      style={rnStyle(triggerStyle)}
    >
      <Text style={rnStyle(labelStyle)}>{children}</Text>
    </Pressable>
  );
}

export function TabsContent({ value, children }: { value: string; children: ReactNode }) {
  const { value: active } = useTabsContext('TabsContent');
  if (active !== value) return null;
  const contentStyle = { marginTop: 12 };
  return <View style={rnStyle(contentStyle)}>{children}</View>;
}
