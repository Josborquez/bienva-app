import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

type Props = { title: string; onPress: () => void; disabled?: boolean; busy?: boolean; secondary?: boolean };
export function Button({ title, onPress, disabled = false, busy = false, secondary = false }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress}
      style={({ pressed }) => [styles.button, secondary && styles.secondary, (disabled || busy) && styles.disabled, pressed && styles.pressed]}>
      {busy && <ActivityIndicator color={secondary ? theme.colors.primary : theme.colors.surface} />}
      <Text style={[styles.label, secondary && { color: theme.colors.primary }]}>{title}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: { minHeight: 56, padding: 16, borderRadius: theme.radius.control, backgroundColor: theme.colors.primary, flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center' },
  label: { color: theme.colors.surface, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  disabled: { opacity: 0.55 },
  secondary: { backgroundColor: theme.colors.primarySoft },
  pressed: { opacity: 0.8 },
});
