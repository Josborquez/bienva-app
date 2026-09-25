import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../api/supabase';
import { getFrequentFoods, searchFoods } from '../api/foods';
import type { MealType } from '../types/domain';

export function useFoodCatalog(userId: string, type: MealType, search: string) {
  const query = search.trim();
  const [debounced, setDebounced] = useState(query);
  useEffect(() => { const timer = setTimeout(() => setDebounced(query), 300); return () => clearTimeout(timer); }, [query]);
  const frequent = useQuery({ queryKey: ['frequentFoods', userId, type],
    queryFn: ({ signal }) => getFrequentFoods(getSupabase(), userId, type, signal), enabled: Boolean(userId), staleTime: 30_000 });
  const results = useQuery({ queryKey: ['foodSearch', userId, debounced],
    queryFn: ({ signal }) => searchFoods(getSupabase(), debounced, signal),
    enabled: Boolean(userId) && debounced.length >= 2 && debounced === query, staleTime: 300_000 });
  return { frequent, results, waiting: query !== debounced, canSearch: query.length >= 2 };
}
