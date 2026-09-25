import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Path, Circle } from 'react-native-svg';
import { CameraCapture } from './CameraCapture';
import { Button } from './Button';
import { preparePhoto, type SourcePhoto } from '../api/preparePhoto';
import { enqueuePhoto, flushPendingUploads, readPendingUploads } from '../api/pendingUploads';
import { getPendingPhotos, processPendingPhotos } from '../api/pendingPhotos';
import { PhotoAnalysisError } from '../utils/photos';
import { es } from '../i18n/es';
import { theme } from '../theme';

export function TodayPhotos({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const pending = useQuery({ queryKey: ['pendingPhotos', userId], queryFn: () => getPendingPhotos(userId) });
  const uploads = useQuery({ queryKey: ['pendingUploads', userId], queryFn: () => readPendingUploads(userId) });
  const [camera, setCamera] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [message, setMessage] = useState<string | null>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (message !== es.photos.saved) return; const timer = setTimeout(() => setMessage(null), 5000); return () => clearTimeout(timer); }, [message]);
  async function refresh() {
    await Promise.all(['pendingPhotos', 'pendingUploads', 'meals', 'remoteDrafts', 'localDrafts'].map(name => queryClient.invalidateQueries({ queryKey: [name, userId] })));
  }
  async function sync(id?: string) {
    setSyncing(true);
    try {
      await flushPendingUploads(userId);
      const remaining = await readPendingUploads(userId);
      if (mounted.current) setMessage(id && remaining.some(item => item.id === id) ? es.photos.queued : remaining.length ? es.photos.queued : es.photos.saved);
    } catch { if (mounted.current) setMessage(es.photos.queued); }
    finally { if (mounted.current) setSyncing(false); await refresh(); }
  }
  async function capture(source: SourcePhoto, takenAt: Date) {
    setCamera(false); setSaving(true); setMessage(null);
    try {
      const photo = await preparePhoto(source, false);
      const queued = await enqueuePhoto(photo.uri, userId, takenAt);
      await queryClient.invalidateQueries({ queryKey: ['pendingUploads', userId] });
      if (mounted.current) { setSaving(false); setMessage(es.photos.queued); }
      void sync(queued.id);
    } catch { if (mounted.current) setMessage(es.photos.queueError); }
    finally { if (mounted.current) setSaving(false); }
  }
  async function process() {
    if (lock.current) return;
    lock.current = true; setProcessing(true); setMessage(null);
    let timer: ReturnType<typeof setInterval> | undefined;
    let polling = false;
    let running = true;
    try {
      const before = await getPendingPhotos(userId);
      if (!before.length) return;
      const total = Math.min(5, before.length);
      const ids = new Set(before.map(photo => photo.id));
      setProgress({ done: 0, total });
      // Progress reflects rows actually marked processed; no simulated timer counts.
      const updateProgress = async () => {
        if (polling) return;
        polling = true;
        try { const remaining = await getPendingPhotos(userId); if (running && mounted.current) setProgress({ done: Math.min(total, before.length - remaining.filter(photo => ids.has(photo.id)).length), total }); }
        catch { /* The final refresh reports connection failures. */ }
        finally { polling = false; }
      };
      timer = setInterval(() => { void updateProgress(); }, 1000);
      const result = await processPendingPhotos(userId);
      const after = await getPendingPhotos(userId);
      if (mounted.current) setMessage(result.stopped === 'limite_fotos' ? es.photos.limit
        : result.stopped ? es.photos.processError
        : result.errors ? es.photos.processFailures(result.created, result.errors)
        : after.some(photo => ids.has(photo.id)) ? es.photos.processPartial : es.photos.processed);
    } catch (error) { if (mounted.current) setMessage(error instanceof PhotoAnalysisError && error.code === 'limit' ? es.photos.limit : es.photos.processError); }
    finally {
      running = false; if (timer) clearInterval(timer); lock.current = false;
      if (mounted.current) setProcessing(false);
      await refresh();
    }
  }
  return <View style={styles.content}>
    {camera && <CameraCapture onClose={() => setCamera(false)} onCapture={(source, takenAt) => { void capture(source, takenAt); }} />}
    <Pressable accessibilityRole="button" accessibilityLabel={es.photos.quick} accessibilityState={{ disabled: saving || syncing, busy: saving }} disabled={saving || syncing} onPress={() => setCamera(true)} style={styles.quick}>
      <Svg width={23} height={23} viewBox="0 0 24 24" accessibilityElementsHidden><Path d="M3 6h4l2-3h6l2 3h4v15H3z" fill="none" stroke={theme.colors.primary} strokeWidth={1.7} /><Circle cx={12} cy={13} r={4} fill="none" stroke={theme.colors.primary} strokeWidth={1.7} /></Svg>
      <Text style={styles.label}>{saving ? es.photos.saving : es.photos.quick}</Text>{saving && <ActivityIndicator color={theme.colors.primary} />}
    </Pressable>
    {message && <View style={styles.banner}><Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text></View>}
    {(pending.isError || uploads.isError) && <View style={styles.banner}><Text style={styles.text}>{es.photos.pendingError}</Text><Button secondary title={es.today.retry} onPress={() => { void refresh(); }} /></View>}
    {!!uploads.data?.length && <View style={styles.banner}><Text style={styles.text}>{es.photos.uploads(uploads.data.length)}</Text><Button secondary title={es.photos.retryUpload} busy={syncing} onPress={() => { void sync(); }} /></View>}
    {!!pending.data?.length && <Button secondary title={es.photos.pending(pending.data.length)} disabled={processing} onPress={() => { void process(); }} />}
    {processing && <View style={styles.banner}><ActivityIndicator color={theme.colors.primary} /><Text accessibilityLiveRegion="polite" style={styles.text}>{progress.total ? es.photos.processing(Math.min(progress.done + 1, progress.total), progress.total) : es.photos.processingStart}</Text></View>}
  </View>;
}
const styles = StyleSheet.create({
  content: { gap: 12 }, quick: { minHeight: 56, borderRadius: 16, padding: 16, backgroundColor: theme.colors.primarySoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  label: { color: theme.colors.primary, fontSize: 17, fontWeight: '600' }, text: { color: theme.colors.muted, fontSize: 15, lineHeight: 23 },
  banner: { padding: 16, gap: 12, backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border },
});
