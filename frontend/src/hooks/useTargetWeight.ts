import { useEffect, useRef, useState } from 'react';
import type { OnboardingDraft, WeightSuggestion } from '../types/onboarding';
import { suggestTargetWeight } from '../api/targetWeight';
import { getSupabase } from '../api/supabase';
import { shouldPreloadTarget, weightLabel } from '../utils/targetWeight';

export function useTargetWeight(draft: OnboardingDraft, active: boolean, setTarget: (value: string) => void) {
  const [state, setState] = useState<{ key: string; data: WeightSuggestion | null; error: boolean }>({ key: '', data: null, error: false });
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([draft.height, draft.weight, draft.goal]);
  // Lives in the wizard across step visits, so re-entering step 5 keeps the user's own target.
  const lastPreloadKey = useRef<string | null>(null);
  const currentTarget = useRef(draft.target);
  currentTarget.current = draft.target;
  useEffect(() => {
    if (!active || draft.goal === 'mantener') return;
    const controller = new AbortController();
    setState({ key, data: null, error: false });
    suggestTargetWeight(getSupabase(), draft, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      if (shouldPreloadTarget(currentTarget.current, lastPreloadKey.current, key)) setTarget(weightLabel(data.peso_sugerido));
      lastPreloadKey.current = key;
      setState({ key, data, error: false });
    }).catch(() => { if (!controller.signal.aborted) setState({ key, data: null, error: true }); });
    return () => { controller.abort(); setState({ key: '', data: null, error: false }); };
  }, [key, active, attempt, setTarget]);
  const current = state.key === key ? state : { data: null, error: false };
  return { ...current, loading: active && !current.data && !current.error, retry: () => setAttempt(value => value + 1) };
}
