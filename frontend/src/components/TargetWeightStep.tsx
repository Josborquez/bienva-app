import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { OnboardingDraft, WeightSuggestion } from '../types/onboarding';
import { arrivalDate, arrivalLabel, belowSuggestedMinimum, hasInternalMetric, stepTargetWeight, weightLabel } from '../utils/targetWeight';
import { stepError } from '../utils/onboarding';
import { OnboardingChoice } from './OnboardingChoice';
import { Button } from './Button';
import { es } from '../i18n/es';
import { theme } from '../theme';

type Props = { draft: OnboardingDraft; suggestion: WeightSuggestion | null; loading: boolean; error: boolean; busy: boolean; retry: () => void; onTarget: (value: string) => void; onPace: (value: number) => void };
export function TargetWeightStep({ draft, suggestion, loading, error, busy, retry, onTarget, onPace }: Props) {
  const copy = es.onboarding;
  const below = suggestion && belowSuggestedMinimum(draft.target, suggestion);
  const arrival = !below && !stepError(5, draft) ? arrivalDate(draft) : null;
  const disabled = busy || loading || !suggestion;
  return <>
    {loading && <View style={styles.row}><ActivityIndicator color={theme.colors.primary} /><Text style={styles.hint}>{copy.targetLoading}</Text></View>}
    {error && <View style={styles.banner}><Text accessibilityRole="alert" style={styles.hint}>{copy.targetLoadError}</Text><Button title={es.today.retry} secondary onPress={retry} disabled={busy} /></View>}
    <Text style={styles.label}>{copy.target}</Text>
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={copy.targetLess} accessibilityState={{ disabled }} disabled={disabled} style={styles.stepper} onPress={() => onTarget(stepTargetWeight(draft.target, -0.5, suggestion!.peso_sugerido))}><Text style={styles.label}>−</Text></Pressable>
      <TextInput accessibilityLabel={copy.target} style={styles.input} keyboardType="decimal-pad" maxLength={6} value={draft.target} editable={!disabled} onChangeText={onTarget} />
      <Pressable accessibilityRole="button" accessibilityLabel={copy.targetMore} accessibilityState={{ disabled }} disabled={disabled} style={styles.stepper} onPress={() => onTarget(stepTargetWeight(draft.target, 0.5, suggestion!.peso_sugerido))}><Text style={styles.label}>+</Text></Pressable>
    </View>
    {suggestion && <>
      <Text style={styles.hint}>{copy.healthyRange(weightLabel(suggestion.peso_min_saludable), weightLabel(suggestion.peso_max_saludable))}</Text>
      {suggestion.nota !== null && <View style={styles.banner}><Text style={styles.hint}>{hasInternalMetric(suggestion.nota) ? copy.targetNoteFallback : suggestion.nota}</Text></View>}
      {below && <Text accessibilityRole="alert" style={styles.hint}>{copy.belowHealthyMinimum(weightLabel(suggestion.peso_min_saludable))}</Text>}
    </>}
    <Text style={styles.label}>{copy.pace}</Text>
    {[0.25, 0.5, 0.75].map(pace => <OnboardingChoice key={pace} label={copy.paceOption(pace)} selected={draft.pace === pace} onPress={() => onPace(pace)} />)}
    {suggestion && arrival && <><Text style={styles.label}>{copy.arrival(arrivalLabel(arrival, copy.months))}</Text><Text style={styles.hint}>{copy.estimateHint}</Text></>}
  </>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { color: theme.colors.text, fontSize: 17, fontWeight: '600' },
  input: { flex: 1, minWidth: 0, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 16, minHeight: 56, padding: 16, textAlign: 'center', fontSize: 20, color: theme.colors.text },
  stepper: { minHeight: 56, minWidth: 52, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.primarySoft, borderRadius: 16 },
  hint: { color: theme.colors.muted, fontSize: 15, lineHeight: 23, flexShrink: 1 },
  banner: { padding: 16, borderRadius: 16, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, gap: 12 },
});
