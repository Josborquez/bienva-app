import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import type { FoodOption, FoodSelection } from '../types/foodSelection';
import type { MealType } from '../types/domain';
import { catalogOption, frequentOption, selectedNutrition, toggleFood, uniqueFoodOptions } from '../utils/foodSelection';
import { useFoodCatalog } from '../hooks/useFoodCatalog';
import { FoodChoice } from './FoodChoice';
import { Button } from './Button';
import { es } from '../i18n/es';
import { theme } from '../theme';

type Props = { userId: string; type: MealType; selections: FoodSelection[]; disabled: boolean; onChange: (selections: FoodSelection[]) => void; onAdd: () => void };
export function FoodPicker({ userId, type, selections, disabled, onChange, onAdd }: Props) {
  const [search, setSearch] = useState('');
  const catalog = useFoodCatalog(userId, type, search);
  const frequent = uniqueFoodOptions((catalog.frequent.data ?? []).map(frequentOption).filter((food): food is FoodOption => food !== null));
  const results = (catalog.results.data ?? []).map(catalogOption);
  const selectedKeys = new Set(selections.map(selection => selection.food.key));
  let valid = selections.length > 0;
  try { selections.forEach(selectedNutrition); } catch { valid = false; }
  function choice(food: FoodOption, selection?: FoodSelection) {
    return <FoodChoice key={food.key} food={food} selection={selection} disabled={disabled}
      onToggle={() => onChange(toggleFood(selections, food))}
      onQuantity={quantity => onChange(selections.map(current => current.food.key === food.key ? { ...current, quantity } : current))} />;
  }
  return <View style={styles.root}>
    {selections.length > 0 && <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>{es.foods.selected}</Text>
      <Text style={styles.hint}>{es.foods.selectionHint}</Text>
      {selections.map(selection => choice(selection.food, selection))}
      <Button title={es.foods.add(selections.length)} onPress={onAdd} disabled={disabled || !valid} busy={disabled} />
    </View>}
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>{es.foods.title} · {es.mealTypes[type]}</Text>
      <Text style={styles.hint}>{es.foods.frequentHint}</Text>
      {catalog.frequent.isPending ? <View style={styles.loading}><ActivityIndicator color={theme.colors.primary} /><Text style={styles.hint}>{es.foods.loading}</Text></View>
        : catalog.frequent.isError ? <><Text accessibilityRole="alert" style={styles.warning}>{es.foods.frequentError}</Text><Button secondary title={es.today.retry} onPress={() => { void catalog.frequent.refetch(); }} disabled={disabled} /></>
        : frequent.length === 0 ? <Text style={styles.empty}>{es.foods.empty}</Text>
        : frequent.every(food => selectedKeys.has(food.key)) ? <Text style={styles.hint}>{es.foods.alreadySelected}</Text>
        : frequent.filter(food => !selectedKeys.has(food.key)).map(food => choice(food))}
    </View>
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>{es.foods.search}</Text>
      <TextInput accessibilityLabel={es.foods.search} placeholder={es.foods.placeholder} placeholderTextColor={theme.colors.muted} value={search} onChangeText={setSearch} editable={!disabled} maxLength={80} autoCorrect={false} returnKeyType="search" style={styles.search} />
      {!catalog.canSearch ? <Text style={styles.hint}>{es.foods.searchHint}</Text>
        : catalog.waiting || catalog.results.isPending ? <View style={styles.loading}><ActivityIndicator color={theme.colors.primary} /><Text style={styles.hint}>{es.foods.searching}</Text></View>
        : catalog.results.isError ? <><Text accessibilityRole="alert" style={styles.warning}>{es.foods.searchError}</Text><Button secondary title={es.today.retry} onPress={() => { void catalog.results.refetch(); }} disabled={disabled} /></>
        : !results.length ? <Text style={styles.empty}>{es.foods.noResults}</Text>
        : results.every(food => selectedKeys.has(food.key)) ? <Text style={styles.hint}>{es.foods.alreadySelected}</Text>
        : results.filter(food => !selectedKeys.has(food.key)).map(food => choice(food))}
    </View>
    {selections.length > 0 && <Button title={es.foods.add(selections.length)} onPress={onAdd} disabled={disabled || !valid} busy={disabled} />}
  </View>;
}
const styles = StyleSheet.create({
  root: { gap: 28 }, section: { gap: 12 },
  title: { color: theme.colors.text, fontSize: 19, fontWeight: '600' },
  hint: { color: theme.colors.muted, fontSize: 14, lineHeight: 21 },
  loading: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  empty: { color: theme.colors.muted, fontSize: 15, lineHeight: 23, padding: 18, borderRadius: 16, backgroundColor: theme.colors.primarySoft },
  warning: { color: theme.colors.amber, fontSize: 14, lineHeight: 21 },
  search: { minHeight: 54, padding: 16, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, backgroundColor: theme.colors.surface, color: theme.colors.text, fontSize: 16 },
});
