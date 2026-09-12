import { Text, View } from 'react-native';
import type { TextStyle } from 'react-native';
import { createHealthCheck } from '@vehicles-marketplace/validation';
import { buildHealthMessage } from '../lib/health-message';

const containerStyle = {
  flex: 1,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  padding: 16,
};

// `as TextStyle` (not `satisfies`) — the object structurally matches the
// style props Text actually accepts, but react-native@0.87's generated
// TextStyle type is a deeply nested Omit<...> intersection that false-
// positives on excess-property checking against a fresh object literal.
const titleStyle = {
  fontSize: 20,
  fontWeight: '600',
  marginBottom: 8,
} as TextStyle;

export default function HomeScreen() {
  const health = createHealthCheck();

  return (
    <View style={containerStyle}>
      <Text style={titleStyle}>Vehicles Marketplace</Text>
      <Text>{buildHealthMessage(health)}</Text>
    </View>
  );
}
