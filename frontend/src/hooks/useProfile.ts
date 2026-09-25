import { useQuery } from '@tanstack/react-query';
import { getProfile } from '../api/meals';

export function useProfile(userId: string) {
  return useQuery({ queryKey: ['profile', userId], queryFn: () => getProfile(userId), enabled: Boolean(userId), staleTime: 60_000 });
}
