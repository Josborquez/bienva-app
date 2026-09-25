import { useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { ImageResult } from 'expo-image-manipulator';
import { preparePhoto, type SourcePhoto } from '../api/preparePhoto';
import { CameraCapture } from './CameraCapture';
import { Button } from './Button';
import { es } from '../i18n/es';
import { theme } from '../theme';

export function PhotoInput({ photo, onPhoto, busy, onAnalyze }: { photo: ImageResult | null; onPhoto: (photo: ImageResult | null) => void; busy: boolean; onAnalyze: (base64: string) => void }) {
  const [camera, setCamera] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const working = useRef(false);
  async function receive(source: SourcePhoto) {
    setCamera(false); setPreparing(true); setError(null); working.current = true;
    try { const result = await preparePhoto(source, true); if (!result.base64) throw new Error('Missing image'); onPhoto(result); }
    catch { setError(es.photos.prepareError); }
    finally { setPreparing(false); working.current = false; }
  }
  async function gallery() {
    if (working.current) return;
    working.current = true; setPreparing(true); setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setError(es.photos.galleryDenied); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
      if (!result.canceled && result.assets[0]) await receive(result.assets[0]);
    } catch { setError(es.photos.prepareError); }
    finally { working.current = false; setPreparing(false); }
  }
  return <View style={styles.content}>
    {camera && <CameraCapture onClose={() => setCamera(false)} onPermissionDenied={() => { setCamera(false); setError(es.photos.cameraDeniedGallery); }} onCapture={source => { void receive(source); }} />}
    {photo ? <><Image source={{ uri: photo.uri }} accessibilityLabel={es.photos.thumbnail} style={styles.image} resizeMode="contain" /><Button title={es.photos.change} secondary disabled={busy || preparing} onPress={() => { onPhoto(null); setError(null); }} /><Button title={busy ? es.photos.looking : es.photos.analyze} busy={busy} disabled={preparing} onPress={() => { if (photo.base64) onAnalyze(photo.base64); }} /></>
      : <><Button title={es.photos.take} secondary disabled={busy || preparing} onPress={() => setCamera(true)} /><Button title={es.photos.gallery} secondary disabled={busy || preparing} onPress={() => { void gallery(); }} /></>}
    {preparing && <><ActivityIndicator color={theme.colors.primary} /><Text style={styles.text}>{es.photos.preparing}</Text></>}
    {error && <View style={styles.banner}><Text accessibilityRole="alert" style={styles.text}>{error}</Text></View>}
  </View>;
}
const styles = StyleSheet.create({ content: { gap: 16 }, image: { width: '100%', height: 240, borderRadius: 16, backgroundColor: theme.colors.surface }, text: { color: theme.colors.muted, fontSize: 15, lineHeight: 23 }, banner: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface } });
