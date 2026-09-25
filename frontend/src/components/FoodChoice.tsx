import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { FoodOption, FoodSelection } from '../types/foodSelection';
import { selectedNutrition } from '../utils/foodSelection';
import { es } from '../i18n/es';
import { theme } from '../theme';

type Props = { food: FoodOption; selection?: FoodSelection; disabled: boolean; onToggle: () => void; onQuantity: (value: string) => void };
export function FoodChoice({ food, selection, disabled, onToggle, onQuantity }: Props) {
  let values: ReturnType<typeof selectedNutrition> | null = null;
  try { values = selectedNutrition(selection ?? { food, quantity: String(food.baseQuantity) }); } catch { /* The editable field can be temporarily empty. */ }
  return <View style={[styles.card, selection && styles.selected]}>
    <Pressable accessibilityRole="checkbox" accessibilityLabel={selection ? es.foods.remove(food.name) : es.foods.select(food.name)} accessibilityState={{ checked: Boolean(selection), disabled }} disabled={disabled} onPress={onToggle} style={styles.row}>
      <Text style={styles.check}>{selection ? '☑' : '☐'}</Text>
      <View style={styles.info}>
        <Text style={styles.name}>{food.name}</Text>
        <Text style={styles.detail}>{food.portion ?? es.foods.typical(food.baseQuantity)}</Text>
        {values && <Text style={styles.detail}>{values.kcal.toLocaleString('es-CL')} {es.today.kcal} · {values.protein.toLocaleString('es-CL')} {es.today.proteinUnit}{!selection && food.source === 'base' ? ` · ${es.foods.perPortion.toLocaleLowerCase('es-CL')}` : ''}</Text>}
      </View>
    </Pressable>
    {selection && <View style={styles.amount}>
      <Text style={styles.detail}>{food.source === 'base' ? es.foods.portions : es.register.quantity}</Text>
      <TextInput accessibilityLabel={`${es.register.quantity} · ${food.name}`} keyboardType="decimal-pad" value={selection.quantity} editable={!disabled} onChangeText={onQuantity} style={styles.input} />
      {!values && <Text accessibilityRole="alert" style={styles.warning}>{es.foods.invalidQuantity}</Text>}
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 16, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 18, gap: 12 },
  selected: { borderColor: theme.colors.primary, backgroundColor: '#F1F6EF' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 48 },
  check: { fontSize: 25, color: theme.colors.primary }, info: { flex: 1, gap: 5 },
  name: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  detail: { fontSize: 13, color: theme.colors.muted, lineHeight: 19 },
  amount: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingLeft: 36 },
  input: { minHeight: 46, width: 100, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 10, fontSize: 16, color: theme.colors.text },
  warning: { color: theme.colors.amber, fontSize: 13, flexBasis: '100%' },
});
