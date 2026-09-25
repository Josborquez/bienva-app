import { StyleSheet, Text, View } from 'react-native';
import { goalState } from '../utils/nutrition';
import { es } from '../i18n/es';
import { theme } from '../theme';

type Props = { title: string; unit: string; value: number | null; min: number | null; max: number | null };
export function NutrientCard({ title, unit, value, min, max }: Props) {
  const state = goalState(value, min, max);
  const validGoal = min !== null && max !== null && min >= 0 && max > 0 && min <= max;
  const color = state === 'within' ? theme.colors.primary : state === 'above' ? theme.colors.amber : theme.colors.muted;
  const progress = value === null || !validGoal ? 0 : Math.min(100, value / max! * 100);
  return <View style={styles.card}>
    <Text style={styles.title}>{title}</Text>
    <View style={styles.valueRow}><Text style={styles.value}>{value === null ? '—' : Math.round(value).toLocaleString('es-CL')}</Text><Text style={styles.unit}>{unit}</Text></View>
    <View accessibilityRole="progressbar" accessibilityLabel={title} accessibilityValue={value === null ? { text: es.today.empty } : { text: `${Math.round(value)} ${unit}` }} style={styles.track}>
      <View style={{ width: `${progress}%`, height: '100%', borderRadius: 8, backgroundColor: color }} />
    </View>
    <Text style={styles.goal}>{validGoal ? `${es.today.goal}: ${min!.toLocaleString('es-CL')}–${max!.toLocaleString('es-CL')} ${unit}` : es.today.unset}</Text>
    <Text style={[styles.status, { color }]}>{state === 'empty' ? es.today.empty : state === 'unset' ? es.today.unset : es.today[state]}</Text>
  </View>;
}
const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 230, padding: 24, gap: 12, borderRadius: theme.radius.card, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  title: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  value: { fontSize: 38, fontWeight: '600', color: theme.colors.text, letterSpacing: -1 },
  unit: { color: theme.colors.muted, fontSize: 16 },
  track: { height: 8, borderRadius: 8, backgroundColor: theme.colors.primarySoft, overflow: 'hidden' },
  goal: { fontSize: 13, color: theme.colors.muted },
  status: { fontSize: 14, fontWeight: '500' },
});
