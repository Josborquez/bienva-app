import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

export function OnboardingChoice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress}
    style={[styles.card, selected && styles.selected]}>
    <Text style={[styles.text, selected && { color: theme.colors.primary }]}>{label}</Text>
    <Text style={styles.mark} accessibilityElementsHidden importantForAccessibility="no">{selected ? '●' : '○'}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 18, padding: 20, minHeight: 66, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', gap: 16 },
  selected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  text: { flex: 1, fontSize: 17, fontWeight: '600', color: theme.colors.text },
  mark: { color: theme.colors.primary, fontSize: 23 },
});
