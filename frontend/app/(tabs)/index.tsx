import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { NutrientCard } from '../../src/components/NutrientCard';
import { signOut } from '../../src/api/auth';
import { useSession } from '../../src/hooks/useSession';
import { useToday } from '../../src/hooks/useToday';
import { mealTypes, sumNutrition } from '../../src/utils/nutrition';
import { es } from '../../src/i18n/es';
import { theme } from '../../src/theme';

export default function Today() {
  const { session } = useSession();
  const router = useRouter();
  const today = useToday(session?.user.id ?? '');
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState(false);
  const meals = today.meals.data?.filter(meal => !meal.es_borrador) ?? [];
  const items = meals.flatMap(meal => meal.meal_items);
  const totals = items.length ? sumNutrition(items) : null;
  const profile = today.profile.data;
  const drafts = new Map((today.remoteDrafts.data ?? []).map(draft => [draft.id, draft]));
  Object.values(today.localDrafts.data ?? {}).filter(draft => draft.text.trim() || draft.items.length || draft.selections?.length).forEach(draft => drafts.set(draft.id, { ...draft, nota: draft.text }));
  const loading = today.profile.isPending || today.meals.isPending;
  const error = today.profile.isError || today.meals.isError;
  const dateLabel = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${today.date}T12:00:00Z`));
  function openDraft(id: string, fresh = false) { router.push({ pathname: '/registrar', params: { draft: id, fresh: fresh ? '1' : '0', fecha: today.date, timezone: profile?.timezone ?? 'America/Santiago' } }); }
  async function leave() {
    setLeaving(true); setLeaveError(false);
    try { await signOut(); } catch { setLeaveError(true); } finally { setLeaving(false); }
  }
  if (!session) return null;
  return <Screen top>
    <View style={styles.brandRow}><Text style={styles.brand}>{es.brand}</Text><Pressable accessibilityRole="button" onPress={leave} disabled={leaving}><Text style={styles.link}>{es.auth.signOut}</Text></Pressable></View>
    <View style={styles.heading}>
      <Text style={styles.eyebrow}>{es.today.eyebrow}</Text>
      <Text accessibilityRole="header" style={styles.title}>{es.today.title}</Text>
      <Text style={styles.date}>{dateLabel}</Text>
      <Text style={styles.muted}>{es.today.subtitle}</Text>
    </View>
    {leaveError && <Text accessibilityRole="alert" style={styles.notice}>{es.auth.signOutError}</Text>}
    <Pressable accessibilityRole="button" onPress={() => router.push('/auth/password')}><Text style={styles.link}>{es.auth.managePassword}</Text></Pressable>
    {error ? <View style={styles.card}><Text accessibilityRole="alert" style={styles.notice}>{es.today.loadError}</Text><Button title={es.today.retry} onPress={today.refresh} secondary /></View>
      : loading ? <View style={styles.card}><ActivityIndicator color={theme.colors.primary} /><Text style={styles.muted}>{es.today.loading}</Text></View>
      : <>
        <View style={styles.metrics}>
          <NutrientCard title={es.today.energy} unit={es.today.kcal} value={totals?.kcal ?? null} min={profile?.meta_kcal_min ?? null} max={profile?.meta_kcal_max ?? null} />
          <NutrientCard title={es.today.protein} unit={es.today.grams} value={totals?.prot_g ?? null} min={profile?.meta_prot_min ?? null} max={profile?.meta_prot_max ?? null} />
        </View>
        <Button title={es.today.register} onPress={() => openDraft(randomUUID(), true)} />
        <View style={styles.sectionHeading}><Text accessibilityRole="header" style={styles.section}>{es.today.meals}</Text><Pressable accessibilityRole="button" onPress={today.refresh}><Text style={styles.link}>{es.today.refresh}</Text></Pressable></View>
        {!meals.length ? <View style={styles.empty}><Text style={styles.emptyMark}>＋</Text><Text style={styles.section}>{es.today.empty}</Text><Text style={styles.muted}>{es.today.emptyHint}</Text></View> : <>
          <Text style={styles.muted}>{es.today.mealCount(meals.length)}</Text>
          {mealTypes.map(type => {
            const group = meals.filter(meal => meal.tipo === type);
            if (!group.length) return null;
            return <View key={type} style={styles.card}>
              <Text style={styles.section}>{es.mealTypes[type]}</Text>
              {group.map(meal => <View key={meal.id} style={styles.meal}>
                {meal.meal_items.map(item => <View key={item.id} style={styles.item}>
                  <View style={{ flex: 1, gap: 4 }}><Text style={styles.itemName}>{item.nombre}</Text><Text style={styles.small}>{item.cantidad.toLocaleString('es-CL')} · {Math.round(item.prot_g)} {es.today.proteinUnit}</Text></View>
                  <Text style={styles.itemName}>{Math.round(item.kcal)} {es.today.kcal}</Text>
                </View>)}
                <Text style={styles.subtotal}>{Math.round(sumNutrition(meal.meal_items).kcal)} {es.today.kcal} · {Math.round(sumNutrition(meal.meal_items).prot_g)} {es.today.proteinUnit}</Text>
              </View>)}
            </View>;
          })}
        </>}
      </>}
    {(today.localDrafts.isError || today.remoteDrafts.isError) && <Text accessibilityRole="alert" style={styles.notice}>{es.today.draftsError}</Text>}
    {drafts.size > 0 && <View style={styles.drafts}><Text style={styles.section}>{es.today.drafts}</Text><Text style={styles.muted}>{es.today.draftHint}</Text>{Array.from(drafts.values()).map(draft => <Button secondary key={draft.id} title={`${es.today.resume} · ${es.mealTypes[draft.tipo]} · ${draft.fecha}`} onPress={() => openDraft(draft.id)} />)}</View>}
  </Screen>;
}
const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  brand: { fontSize: 25, fontWeight: '700', color: theme.colors.primary, letterSpacing: -1 },
  link: { color: theme.colors.primary, fontSize: 14, paddingVertical: 12, fontWeight: '600' },
  heading: { gap: 10, marginTop: 16, marginBottom: 8 },
  eyebrow: { color: theme.colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  title: { color: theme.colors.text, fontSize: 48, fontWeight: '600', letterSpacing: -2 },
  date: { color: theme.colors.text, fontSize: 18, textTransform: 'capitalize' },
  muted: { color: theme.colors.muted, fontSize: 15, lineHeight: 23 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  section: { fontSize: 20, fontWeight: '600', color: theme.colors.text },
  card: { padding: 24, gap: 16, backgroundColor: theme.colors.surface, borderRadius: 24, borderColor: theme.colors.border, borderWidth: 1 },
  empty: { padding: 28, gap: 12, alignItems: 'center', borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.border },
  emptyMark: { fontSize: 32, color: theme.colors.primary },
  meal: { gap: 16, borderTopWidth: 1, borderColor: theme.colors.border, paddingTop: 16 },
  item: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  itemName: { fontSize: 15, color: theme.colors.text, fontWeight: '500' },
  small: { fontSize: 13, color: theme.colors.muted },
  subtotal: { fontSize: 14, color: theme.colors.primary, textAlign: 'right', fontWeight: '600' },
  drafts: { padding: 20, backgroundColor: theme.colors.primarySoft, gap: 12, borderRadius: 24 },
  notice: { color: theme.colors.amber, fontSize: 15, lineHeight: 23 },
});
