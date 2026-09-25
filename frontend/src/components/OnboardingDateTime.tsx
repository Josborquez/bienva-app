import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../theme';
import { es } from '../i18n/es';

export type DateTimeProps = { label: string; hint: string; value: string; type: 'date' | 'time'; onChange: (value: string) => void };
export function OnboardingDateTime({ label, hint, value, type, onChange }: DateTimeProps) {
  function adjust(delta: number) {
    const [hour, minute] = /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value.split(':').map(Number) : [21, 0];
    const total = (hour * 60 + minute + delta + 1440) % 1440;
    onChange(`${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`);
  }
  return <View style={{ gap: 8 }}><Text style={styles.label}>{label}</Text><TextInput
    accessibilityLabel={label} value={value} onChangeText={onChange} autoCorrect={false} autoCapitalize="none"
    maxLength={type === 'date' ? 10 : 5} placeholder={type === 'date' ? es.register.dateHint : es.onboarding.timeFormat}
    style={styles.input} />{type === 'time' && <View style={{ flexDirection: 'row', gap: 12 }}>
      {[-15, 15].map(delta => <Pressable key={delta} accessibilityRole="button" style={styles.adjust} onPress={() => adjust(delta)}><Text style={styles.label}>{delta < 0 ? es.onboarding.timeEarlier : es.onboarding.timeLater}</Text></Pressable>)}
    </View>}<Text style={styles.hint}>{hint}</Text></View>;
}
const styles = StyleSheet.create({
  label: { color: theme.colors.text, fontSize: 17, fontWeight: '600' },
  input: { minHeight: 56, padding: 16, fontSize: 18, color: theme.colors.text, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  hint: { color: theme.colors.muted, fontSize: 15, lineHeight: 23 },
  adjust: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: theme.colors.primarySoft, alignItems: 'center' },
});
