import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { radius } from '@vehicles-marketplace/design-tokens';
import { rnStyle } from '../lib/rn-style';
import { useTheme } from '../theme/theme-provider';

export interface SkeletonProps {
  // See lib/rn-style.ts for why this is a loose `object`, not `ViewStyle`.
  style?: object;
}

/**
 * A loading placeholder (§8), pulsing via RN's built-in `Animated` API.
 * `react-native-reanimated` (installed per the stack decision, §2) is
 * deliberately not used for this — Reanimated 4's worklets require a babel
 * plugin resolved from `react-native-worklets`, which this monorepo's
 * pnpm-strict `node_modules` doesn't hoist by default; `Animated` needs no
 * babel config and is guaranteed to work, for an effect this simple.
 */
export function Skeleton({ style }: SkeletonProps) {
  const { tokens } = useTheme();
  // `useState(() => ...)` (not `useRef().current`) — the lint rule that
  // flags reading a ref's `.current` during render doesn't apply to a
  // lazily-initialized, never-replaced piece of state.
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const baseStyle = { borderRadius: radius.md, backgroundColor: tokens.border };

  return (
    <Animated.View accessibilityElementsHidden style={rnStyle([baseStyle, style, { opacity }])} />
  );
}
