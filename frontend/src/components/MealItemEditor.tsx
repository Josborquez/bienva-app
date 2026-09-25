import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { EditableItem } from '../types/mealDraft';
import { es } from '../i18n/es';
import { theme } from '../theme';

type Props = { item: EditableItem; onChange: (item: EditableItem) => void; onRemove: () => void; disabled: boolean };
export function MealItemEditor({ item, onChange, onRemove, disabled }: Props) {
  const numericFields = ['cantidad', 'kcal', 'prot_g'] as const;
  const labels = { cantidad: es.register.quantity, kcal: es.register.calories, prot_g: es.register.protein };
  return <View style={styles.card}>
    <View style={styles.row}>
      <Text style={styles.label}>{es.register.name}</Text>
      <View style={styles.actions}>
        <Text style={styles.chip}>{item.fuente === 'base' ? es.register.base : item.fuente === 'frecuente' ? es.foods.frequentSource : es.register.estimated}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={es.register.remove(item.nombre)} accessibilityState={{ disabled }} disabled={disabled} hitSlop={8} onPress={onRemove} style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={theme.colors.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
          </Svg>
        </Pressable>
      </View>
    </View>
    <TextInput accessibilityLabel={es.register.name} value={item.nombre} editable={!disabled} onChangeText={nombre => onChange({ ...item, nombre, edited: true })} style={styles.input} />
    <View style={styles.fields}>{numericFields.map(field => <View key={field} style={styles.field}>
      <Text style={styles.label}>{labels[field]}</Text>
      <TextInput accessibilityLabel={`${labels[field]} · ${item.nombre}`} keyboardType="decimal-pad" value={item[field]} editable={!disabled} onChangeText={value => onChange({ ...item, [field]: value, edited: true, ...(field === 'cantidad' ? { cantidad_g: null } : {}) })} style={styles.input} />
    </View>)}</View>
    {item.confianza < 0.6 && <View style={styles.review}>
      <Text style={styles.warning}>{es.register.uncertain}</Text>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: item.confirmed, disabled }} disabled={disabled} onPress={() => onChange({ ...item, confirmed: !item.confirmed })} style={styles.check}>
        <Text style={styles.checkLabel}>{item.confirmed ? '☑' : '☐'} {item.confirmed ? es.register.confirmed : es.register.confirm}</Text>
      </Pressable>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 20, gap: 14, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 24, backgroundColor: theme.colors.surface },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  remove: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  removePressed: { backgroundColor: theme.colors.primarySoft },
  chip: { fontSize: 12, color: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: theme.colors.primarySoft },
  label: { fontSize: 13, color: theme.colors.muted, fontWeight: '600' },
  input: { padding: 12, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, minHeight: 48, color: theme.colors.text, fontSize: 16 },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flex: 1, minWidth: 110, gap: 8 },
  review: { gap: 8 }, warning: { color: theme.colors.amber, fontSize: 14 },
  check: { minHeight: 44, justifyContent: 'center' }, checkLabel: { color: theme.colors.primary, fontWeight: '600' },
});
