import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useProfile } from '../../src/hooks/useProfile';
import { useSession } from '../../src/hooks/useSession';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { OnboardingChoice } from '../../src/components/OnboardingChoice';
import { OnboardingDateTime } from '../../src/components/OnboardingDateTime';
import { HeightWheel } from '../../src/components/HeightWheel';
import { TargetWeightStep } from '../../src/components/TargetWeightStep';
import { useTargetWeight } from '../../src/hooks/useTargetWeight';
import { belowSuggestedMinimum, onboardingStep, TargetWeightMinimumError, weightLabel } from '../../src/utils/targetWeight';
import { onboardingApi } from '../../src/api/onboarding';
import { getSupabase } from '../../src/api/supabase';
import { signOut } from '../../src/api/auth';
import { readOnboardingDraft, saveOnboardingDraft } from '../../src/api/onboardingDraft';
import { requestPlanNotificationPermission } from '../../src/api/notificationPermission';
import { emptyOnboarding, type OnboardingDraft, type Targets } from '../../src/types/onboarding';
import { planTiming, stepError } from '../../src/utils/onboarding';
import { es } from '../../src/i18n/es';
import { theme } from '../../src/theme';

const copy = es.onboarding;
export default function OnboardingScreen() {
  const { session } = useSession();
  const profile = useProfile(session?.user.id ?? '');
  const router = useRouter();
  const [leaveError, setLeaveError] = useState(false);
  if (profile.isPending) return <LoadingScreen />;
  if (profile.isError) return <Screen>
    <Text accessibilityRole="alert" style={{ color: theme.colors.text }}>{copy.profileError}</Text>
    <Button title={es.today.retry} busy={profile.isFetching} onPress={() => void profile.refetch()} />
    <Button title={es.auth.managePassword} secondary onPress={() => router.push('/auth/password')} />
    <Button title={es.auth.signOut} secondary onPress={() => { void signOut().catch(() => setLeaveError(true)); }} />
    {leaveError && <Text>{es.auth.signOutError}</Text>}
  </Screen>;
  return session ? <Wizard key={session.user.id} userId={session.user.id} /> : null;
}
function Wizard({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<OnboardingDraft>({ ...emptyOnboarding });
  const [step, setStep] = useState(1);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Targets | null>(null);
  const inFlight = useRef(false);
  const completed = useRef(false);
  const mounted = useRef(true);
  const preloadTarget = useCallback((target: string) => setDraft(current => ({ ...current, target })), []);
  const suggestion = useTargetWeight(draft, ready && step === 5 && !plan, preloadTarget);
  useEffect(() => {
    mounted.current = true;
    readOnboardingDraft(userId).then(saved => {
      if (mounted.current && saved) { setDraft(saved.draft); setStep(saved.step === 5 && saved.draft.goal === 'mantener' ? 6 : saved.step); }
    }).catch(() => { if (mounted.current) setLocalError(true); }).finally(() => { if (mounted.current) setReady(true); });
    return () => { mounted.current = false; };
  }, [userId]);
  useEffect(() => {
    if (!ready || completed.current) return;
    void saveOnboardingDraft(userId, { draft, step }).then(() => { if (mounted.current) setLocalError(false); }).catch(() => { if (mounted.current) setLocalError(true); });
  }, [draft, step, ready, userId]);
  function back() { if (!inFlight.current) { setError(null); if (plan) setPlan(null); else setStep(s => onboardingStep(s, -1, draft.goal)); } }
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { if (step > 1 || plan || busy) { back(); return true; } return false; });
    return () => listener.remove();
  }, [step, plan, busy]);
  function change<K extends keyof OnboardingDraft>(field: K, value: OnboardingDraft[K]) {
    if (inFlight.current) return;
    setDraft(current => ({ ...current, [field]: value })); setError(null);
  }
  async function next() {
    if (inFlight.current) return;
    if (step === 5 && draft.goal !== 'mantener' && (!suggestion.data || suggestion.loading || suggestion.error || belowSuggestedMinimum(draft.target, suggestion.data))) return;
    const invalidStep = (step === 7 ? [1, 2, 3, 4, 5, 6, 7] : [step]).find(n => stepError(n, draft));
    if (invalidStep) { setStep(invalidStep); setError(copy.errors[stepError(invalidStep, draft) as keyof typeof copy.errors]); return; }
    setError(null);
    if (step < 7) { setStep(onboardingStep(step, 1, draft.goal)); return; }
    inFlight.current = true; setBusy(true);
    try { const result = await onboardingApi(getSupabase()).preview(draft); if (mounted.current) setPlan(result); }
    catch (failure) { if (mounted.current) { setError(failure instanceof TargetWeightMinimumError ? copy.belowHealthyMinimum(weightLabel(failure.minimum)) : copy.previewError); if (failure instanceof TargetWeightMinimumError) setStep(5); } }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }
  async function finish() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    try {
      const profile = await onboardingApi(getSupabase()).complete(draft, userId);
      completed.current = true;
      // Permission refusal or device storage failure must never undo a saved plan.
      await requestPlanNotificationPermission().catch(() => undefined);
      await saveOnboardingDraft(userId, null).catch(() => undefined);
      if (mounted.current) queryClient.setQueryData(['profile', userId], profile);
    } catch (failure) { if (mounted.current) { setError(failure instanceof TargetWeightMinimumError ? copy.belowHealthyMinimum(weightLabel(failure.minimum)) : copy.saveError); if (failure instanceof TargetWeightMinimumError) { setPlan(null); setStep(5); } } }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }
  function field(label: string, key: 'name' | 'height' | 'weight' | 'target', numeric = false, hint?: string) {
    return <View style={styles.field}><Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} value={draft[key]} onChangeText={value => change(key, value)}
        style={styles.input} keyboardType={numeric ? 'decimal-pad' : 'default'} autoCapitalize={key === 'name' ? 'words' : 'none'}
        autoCorrect={false} maxLength={key === 'name' ? 80 : 6} placeholder={hint} placeholderTextColor={theme.colors.muted} />
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>;
  }
  if (!ready) return <LoadingScreen />;
  const timing = plan ? planTiming(draft, plan) : null;
  return <Screen key={plan ? 'plan' : step}>
    <View style={styles.header}><Text style={styles.brand}>{es.brand}</Text><Pressable disabled={busy} accessibilityRole="button" onPress={() => { void signOut().catch(() => setError(es.auth.signOutError)); }}><Text style={styles.link}>{es.auth.signOut}</Text></Pressable></View>
    <Text style={styles.eyebrow}>{plan ? copy.planTitle : copy.progress(step)}</Text>
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 7, now: plan ? 7 : step, text: copy.progress(step) }} style={styles.track}><View style={[styles.fill, { width: `${step / 7 * 100}%` }]} /></View>
    <Text accessibilityRole="header" style={styles.title}>{plan ? copy.planTitle : step === 5 && draft.goal === 'mantener' ? copy.maintainTitle : copy.titles[step - 1]}</Text>
    <View pointerEvents={busy ? 'none' : 'auto'} style={styles.body}>
      {plan ? <>
        <Text style={styles.hint}>{copy.planHint}</Text>
        <View style={styles.card}><Text style={styles.label}>{copy.energy}</Text><Text style={styles.number}>{plan.kcal_objetivo.toLocaleString('es-CL')} <Text style={styles.unit}>{es.today.kcal}</Text></Text><Text style={styles.hint}>{copy.range(plan.kcal_min, plan.kcal_max)}</Text></View>
        <View style={styles.card}><Text style={styles.label}>{copy.protein}</Text><Text style={styles.number}>{plan.prot_min}–{plan.prot_max} <Text style={styles.unit}>{es.today.grams}</Text></Text></View>
        {draft.goal === 'mantener' ? <Text style={styles.hint}>{copy.maintainPlan}</Text> : timing?.clamped ? <Text style={styles.notice}>{copy.clamped}</Text> : timing?.arrival ? <><Text style={styles.hint}>{copy.estimate(draft.goal === 'bajar' ? copy.down : copy.up, draft.pace, draft.target.replace('.', ','), new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(timing.arrival))}</Text><Text style={styles.hint}>{copy.estimateHint}</Text></> : null}
        <Text style={styles.hint}>{Platform.OS === 'web' ? copy.webNotifications : copy.notifications}</Text>
        <Text style={styles.hint}>{copy.reminderPending}</Text>
      </> : <>
        {step === 1 && <><Text style={styles.hint}>{copy.intro}</Text>{field(copy.name, 'name')}</>}
        {step === 2 && Object.entries(copy.goals).map(([value, label]) => <OnboardingChoice key={value} label={label} selected={draft.goal === value} onPress={() => change('goal', value as OnboardingDraft['goal'])} />)}
        {step === 3 && <><Text style={styles.hint}>{copy.sexHint}</Text>{Object.entries(copy.sexes).map(([value, label]) => <OnboardingChoice key={value} label={label} selected={draft.sex === value} onPress={() => change('sex', value as OnboardingDraft['sex'])} />)}<OnboardingDateTime label={copy.birth} hint={copy.birthHint} type="date" value={draft.birth} onChange={value => change('birth', value)} /></>}
        {step === 4 && <>{field(copy.height, 'height', true)}<HeightWheel value={draft.height} onChange={value => change('height', value)} />{field(copy.weight, 'weight', true)}</>}
        {step === 5 && draft.goal !== 'mantener' && <TargetWeightStep draft={draft} suggestion={suggestion.data} loading={suggestion.loading} error={suggestion.error} busy={busy} retry={suggestion.retry} onTarget={value => change('target', value)} onPace={value => change('pace', value)} />}
        {step === 6 && Object.entries(copy.activities).map(([value, label]) => <OnboardingChoice key={value} label={label} selected={draft.activity === value} onPress={() => change('activity', value as OnboardingDraft['activity'])} />)}
        {step === 7 && <><OnboardingDateTime label={copy.time} hint={copy.timeHint} type="time" value={draft.time} onChange={value => change('time', value)} /><Text style={styles.hint}>{copy.reminder}</Text><Text style={styles.hint}>{copy.reminderPending}</Text></>}
      </>}
    </View>
    {error && <Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
    {localError && <Text accessibilityRole="alert" style={styles.notice}>{copy.localError}</Text>}
    <Button title={plan ? copy.start : step === 7 ? copy.preview : copy.next} busy={busy}
      disabled={!plan && step === 5 && draft.goal !== 'mantener' && (!suggestion.data || suggestion.loading || suggestion.error || belowSuggestedMinimum(draft.target, suggestion.data))}
      onPress={plan ? finish : next} />
    {(step > 1 || plan) && <Button title={copy.back} disabled={busy} secondary onPress={back} />}
    {!plan && <Text style={styles.hint}>{copy.localHint}</Text>}
  </Screen>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: theme.colors.primary, fontSize: 26, fontWeight: '700', letterSpacing: -1 },
  link: { color: theme.colors.primary, paddingVertical: 12, fontSize: 14 },
  eyebrow: { color: theme.colors.primary, fontSize: 14, fontWeight: '600' },
  track: { height: 6, borderRadius: 3, backgroundColor: theme.colors.border, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: theme.colors.primary },
  title: { color: theme.colors.text, fontSize: 32, fontWeight: '600', letterSpacing: -0.7 },
  body: { gap: 14 }, field: { gap: 8 },
  label: { color: theme.colors.text, fontSize: 17, fontWeight: '600' },
  input: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 16, minHeight: 56, padding: 16, fontSize: 18, color: theme.colors.text },
  hint: { color: theme.colors.muted, fontSize: 15, lineHeight: 23 },
  notice: { color: theme.colors.amber, fontSize: 15, lineHeight: 23 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 24, padding: 24, gap: 12, borderColor: theme.colors.border, borderWidth: 1 },
  number: { color: theme.colors.primary, fontSize: 38, fontWeight: '600' }, unit: { fontSize: 18 },
});
