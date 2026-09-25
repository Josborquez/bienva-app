import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getDayMeals, getProfile, getRemoteDrafts } from '../api/meals';
import { readLocalDrafts } from '../api/localDrafts';
import { dayKey } from '../utils/nutrition';

export function useToday(userId: string) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(timer); }, []);
  const profile = useQuery({ queryKey: ['profile', userId], queryFn: () => getProfile(userId), staleTime: 60_000, enabled: Boolean(userId) });
  const date = dayKey(now, profile.data?.timezone ?? 'America/Santiago');
  const meals = useQuery({ queryKey: ['meals', userId, date], queryFn: () => getDayMeals(userId, date), enabled: profile.isSuccess });
  const localDrafts = useQuery({ queryKey: ['localDrafts', userId], queryFn: () => readLocalDrafts(userId), enabled: Boolean(userId) });
  const remoteDrafts = useQuery({ queryKey: ['remoteDrafts', userId], queryFn: () => getRemoteDrafts(userId), enabled: Boolean(userId) });
  const refresh = useCallback(() => {
    if (!userId) return;
    setNow(new Date());
    void profile.refetch(); void localDrafts.refetch(); void remoteDrafts.refetch();
    if (profile.isSuccess) void meals.refetch();
  }, [userId, profile.refetch, profile.isSuccess, meals.refetch, localDrafts.refetch, remoteDrafts.refetch]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  return { date, profile, meals, localDrafts, remoteDrafts, refresh };
}
