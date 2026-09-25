import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { flushPendingUploads } from '../api/pendingUploads';

export function usePendingUploadSync(userId: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const sync = () => { void flushPendingUploads(userId).catch(() => undefined).finally(() => {
      if (active) { void queryClient.invalidateQueries({ queryKey: ['pendingPhotos', userId] }); void queryClient.invalidateQueries({ queryKey: ['pendingUploads', userId] }); }
    }); };
    sync();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') sync(); });
    if (Platform.OS === 'web') window.addEventListener('online', sync);
    return () => { active = false; listener.remove(); if (Platform.OS === 'web') window.removeEventListener('online', sync); };
  }, [userId, queryClient]);
}
