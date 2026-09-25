import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { Screen } from '../src/components/Screen';
import { Button } from '../src/components/Button';
import { MealItemEditor } from '../src/components/MealItemEditor';
import { FoodPicker } from '../src/components/FoodPicker';
import { selectionItem } from '../src/utils/foodSelection';
import { useSession } from '../src/hooks/useSession';
import { analyzeText } from '../src/api/analyze';
import { draftRows, loadMealDraft, saveMealDraft } from '../src/api/meals';
import { readLocalDrafts, writeLocalDraft } from '../src/api/localDrafts';
import { dayKey, mealTypes, parseAmount, suggestedMeal, sumNutrition, validDay } from '../src/utils/nutrition';
import type { MealDraft } from '../src/types/mealDraft';
import { es } from '../src/i18n/es';
import { theme } from '../src/theme';

export default function RegisterMeal() {
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const params = useLocalSearchParams<{ draft?: string; fresh?: string; fecha?: string; timezone?: string }>();
  const [fallbackId] = useState(randomUUID);
  const id = params.draft ?? fallbackId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<MealDraft | null>(null);
  const draftRef = useRef<MealDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [localError, setLocalError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [syncPending, setSyncPending] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoadError(false);
    (async () => {
      const local = await readLocalDrafts(userId);
      const restored = local[id] ?? (params.fresh === '1' || !params.draft ? null : await loadMealDraft(userId, id));
      if (!restored && params.draft && params.fresh !== '1') throw new Error('Draft no longer available');
      const timeZone = params.timezone ?? 'America/Santiago';
      const initial: MealDraft = restored ?? { id, fecha: params.fecha && validDay(params.fecha) ? params.fecha : dayKey(new Date(), timeZone), tipo: suggestedMeal(new Date(), timeZone), text: '', items: [], entryMode: 'frecuentes' };
      if (active) { draftRef.current = initial; setDraft(initial); }
    })().catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [id, userId, loadAttempt]);

  async function persist(next: MealDraft) {
    draftRef.current = next;
    setDraft(next);
    try {
      await writeLocalDraft(userId, next, next.id);
      setLocalError(false);
      void queryClient.invalidateQueries({ queryKey: ['localDrafts', userId] });
    } catch (failure) { setLocalError(true); throw failure; }
  }
  function edit(change: Partial<MealDraft>) {
    if (!draftRef.current || inFlight.current) return;
    void persist({ ...draftRef.current, ...change }).catch(() => undefined);
  }
  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['meals', userId] }),
      queryClient.invalidateQueries({ queryKey: ['remoteDrafts', userId] }),
      queryClient.invalidateQueries({ queryKey: ['localDrafts', userId] }),
      queryClient.invalidateQueries({ queryKey: ['frequentFoods', userId] }),
    ]);
  }
  function begin() { if (inFlight.current) return false; inFlight.current = true; setBusy(true); setError(null); return true; }
  function end() { inFlight.current = false; setBusy(false); }
  async function analyze() {
    const current = draftRef.current;
    if (!current || !begin()) return;
    try {
      if (!validDay(current.fecha)) { setError(es.register.invalid); return; }
      if (!current.text.trim()) { setError(es.register.missingText); return; }
      await persist(current);
      const items = await analyzeText(current.text, current.tipo, current.fecha);
      if (!items.length) { setError(es.register.noItems); return; }
      const next: MealDraft = { ...current, origin: 'texto', selections: [], items: items.map(item => ({
        ...item, id: randomUUID(), cantidad: String(item.cantidad), kcal: String(item.kcal), prot_g: String(item.prot_g),
        cantidad_g: item.cantidad_g ?? null, food_id: item.food_id ?? null, fuente: item.fuente === 'base' ? 'base' : 'modelo', edited: false, confirmed: false,
      })) };
      await persist(next);
      try { await saveMealDraft(userId, next); setSyncPending(false); await invalidate(); }
      catch { setSyncPending(true); }
    } catch { setError(es.register.analyzeError); }
    finally { end(); }
  }
  async function finish(finalize: boolean) {
    const current = draftRef.current;
    if (!current || !begin()) return;
    try {
      if (current.items.length) {
        try { draftRows(current); } catch { setError(es.register.invalid); return; }
        if (finalize && current.items.some(item => item.confianza < 0.6 && !item.confirmed)) { setError(es.register.needsReview); return; }
      }
      await persist(current);
      if (current.items.length) await saveMealDraft(userId, current, finalize);
      if (finalize) await writeLocalDraft(userId, null, current.id);
      await invalidate();
      router.replace('/');
    } catch { setError(es.register.saveError); }
    finally { end(); }
  }
  async function addSelected() {
    const current = draftRef.current;
    if (!current || !begin()) return;
    try {
      if (!validDay(current.fecha)) { setError(es.register.invalid); return; }
      if (!current.selections?.length) { setError(es.foods.selectFirst); return; }
      let items;
      try { items = current.selections.map(selection => selectionItem(selection, randomUUID())); }
      catch { setError(es.foods.invalidQuantity); return; }
      const next: MealDraft = { ...current, origin: current.selections.some(selection => selection.food.source === 'frecuente') ? 'repetir' : 'manual', selections: [], items };
      await persist(next);
      try { await saveMealDraft(userId, next); setSyncPending(false); await invalidate(); }
      catch { setSyncPending(true); }
    } catch { setError(es.register.localError); }
    finally { end(); }
  }
  if (!draft) return <Screen top><Text style={styles.title}>{es.register.title}</Text>{loadError ? <><Text accessibilityRole="alert" style={styles.warning}>{es.register.loadError}</Text><Button title={es.today.retry} onPress={() => setLoadAttempt(n => n + 1)} /></> : <><ActivityIndicator color={theme.colors.primary} /><Text style={styles.muted}>{es.register.loading}</Text></>}<Button secondary title={es.register.back} onPress={() => router.replace('/')} /></Screen>;
  const total = sumNutrition(draft.items.map(item => ({ kcal: parseAmount(item.kcal) ?? 0, prot_g: parseAmount(item.prot_g) ?? 0 })));
  const entryMode = draft.entryMode ?? (draft.text ? 'texto' : 'frecuentes');
  return <Screen top>
    <Text style={styles.brand}>{es.brand}</Text>
    <Text accessibilityRole="header" style={styles.title}>{draft.items.length ? es.register.review : es.register.title}</Text>
    <Text style={styles.muted}>{draft.items.length ? es.register.reviewHint : entryMode === 'frecuentes' ? es.foods.description : es.register.description}</Text>
    <Text style={styles.label}>{es.register.type}</Text>
    <View style={styles.types}>{mealTypes.map(type => <Pressable accessibilityRole="radio" accessibilityState={{ checked: draft.tipo === type, disabled: busy }} disabled={busy} key={type} onPress={() => edit({ tipo: type })} style={[styles.type, draft.tipo === type && styles.selected]}><Text style={[styles.typeLabel, draft.tipo === type && { color: theme.colors.surface }]}>{es.mealTypes[type]}</Text></Pressable>)}</View>
    <View style={styles.field}><Text style={styles.label}>{es.register.date}</Text><TextInput accessibilityLabel={es.register.date} placeholder={es.register.dateHint} value={draft.fecha} editable={!busy} onChangeText={fecha => edit({ fecha })} style={styles.input} /></View>
    {!draft.items.length ? <>
      <View style={styles.types} accessibilityRole="tablist">
        {(['frecuentes', 'texto'] as const).map(mode => <Pressable key={mode} accessibilityRole="tab" accessibilityState={{ selected: entryMode === mode, disabled: busy }} disabled={busy} onPress={() => { edit({ entryMode: mode }); setError(null); }} style={[styles.type, entryMode === mode && styles.selected]}><Text style={[styles.typeLabel, entryMode === mode && { color: theme.colors.surface }]}>{mode === 'frecuentes' ? es.foods.tab : es.foods.textTab}</Text></Pressable>)}
      </View>
      {entryMode === 'frecuentes' ? <FoodPicker userId={userId} type={draft.tipo} selections={draft.selections ?? []} disabled={busy} onChange={selections => edit({ selections })} onAdd={addSelected} /> : <>
      <View style={styles.field}><Text style={styles.label}>{es.register.text}</Text><TextInput accessibilityLabel={es.register.text} placeholder={es.register.placeholder} placeholderTextColor={theme.colors.muted} value={draft.text} multiline maxLength={4000} editable={!busy} onChangeText={text => edit({ text })} style={[styles.input, styles.textarea]} /></View>
      <Button title={busy ? es.register.analyzing : es.register.analyze} busy={busy} onPress={analyze} />
      </>}
    </> : <>
      <Text style={styles.muted}>{es.register.amountHint}</Text>
      {draft.items.map(item => <MealItemEditor key={item.id} item={item} disabled={busy} onChange={updated => edit({ items: draft.items.map(old => old.id === updated.id ? updated : old) })} onRemove={() => edit({ items: draft.items.filter(old => old.id !== item.id) })} />)}
      <View style={styles.total}><Text style={styles.label}>{es.register.total}</Text><Text style={styles.totalValue}>{Math.round(total.kcal)} {es.today.kcal} · {Math.round(total.prot_g)} {es.today.proteinUnit}</Text></View>
      <Button title={busy ? es.register.saving : es.register.save} busy={busy} onPress={() => finish(true)} />
    </>}
    {error && <Text accessibilityRole="alert" style={styles.warning}>{error}</Text>}
    {localError && <Text accessibilityRole="alert" style={styles.warning}>{es.register.localError}</Text>}
    {syncPending && <Text style={styles.warning}>{es.register.syncPending}</Text>}
    <Button secondary title={es.register.later} disabled={busy} onPress={() => finish(false)} />
    {!localError && <Text style={styles.small}>{es.register.localHint}</Text>}
  </Screen>;
}
const styles = StyleSheet.create({
  brand: { fontSize: 24, color: theme.colors.primary, fontWeight: '700', letterSpacing: -1 },
  title: { fontSize: 32, fontWeight: '600', color: theme.colors.text, letterSpacing: -1 },
  muted: { color: theme.colors.muted, fontSize: 16, lineHeight: 24 },
  label: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  field: { gap: 10 },
  input: { minHeight: 52, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, padding: 16, color: theme.colors.text, backgroundColor: theme.colors.surface, fontSize: 16 },
  textarea: { minHeight: 150, textAlignVertical: 'top', lineHeight: 24 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  type: { borderRadius: 24, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: theme.colors.primarySoft },
  selected: { backgroundColor: theme.colors.primary },
  typeLabel: { fontSize: 14, color: theme.colors.primary, fontWeight: '600' },
  total: { padding: 20, borderRadius: 20, backgroundColor: theme.colors.primarySoft, gap: 8 },
  totalValue: { fontSize: 22, fontWeight: '600', color: theme.colors.primary },
  warning: { color: theme.colors.amber, fontSize: 15, lineHeight: 22 },
  small: { color: theme.colors.muted, textAlign: 'center', fontSize: 13 },
});
