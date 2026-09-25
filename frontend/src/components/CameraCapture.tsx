import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SourcePhoto } from '../api/preparePhoto';
import { Button } from './Button';
import { es } from '../i18n/es';
import { theme } from '../theme';

export function CameraCapture({ onCapture, onClose, onPermissionDenied }: { onCapture: (photo: SourcePhoto, takenAt: Date) => void; onClose: () => void; onPermissionDenied?: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  useEffect(() => {
    let active = true;
    void requestPermission().then(result => { if (active && !result.granted) onPermissionDenied?.(); })
      .catch(() => { if (active) setError(es.photos.cameraError); });
    return () => { active = false; };
  }, []);
  async function capture() {
    if (!camera.current || locked.current || !ready) return;
    locked.current = true; setBusy(true); setError(null);
    const takenAt = new Date();
    try {
      const photo = await camera.current.takePictureAsync({ quality: 1, exif: false, base64: false });
      if (!photo) throw new Error('No photo');
      onCapture(photo, takenAt);
    } catch { setError(es.photos.captureError); }
    finally { locked.current = false; setBusy(false); }
  }
  return <Modal visible animationType="slide" onRequestClose={() => { if (!locked.current) onClose(); }}>
    <SafeAreaView style={styles.screen}>
      {permission?.granted ? <CameraView ref={camera} style={styles.camera} facing="back" mode="picture" autofocus="on" onCameraReady={() => setReady(true)} onMountError={() => setError(es.photos.cameraError)} />
        : <View style={styles.permission}><Text style={styles.text}>{permission ? es.photos.cameraDenied : es.photos.cameraPermission}</Text>{!permission && <ActivityIndicator />}
          {permission?.canAskAgain && <Button title={es.photos.permission} onPress={() => { void requestPermission().catch(() => setError(es.photos.cameraError)); }} />}
          {permission && !permission.canAskAgain && Platform.OS !== 'web' && <Button title={es.photos.settings} onPress={() => { void Linking.openSettings().catch(() => setError(es.photos.cameraError)); }} />}
        </View>}
      <View style={styles.controls}>
        {error && <Text accessibilityRole="alert" style={styles.text}>{error}</Text>}
        {permission?.granted && <Button title={es.photos.shutter} onPress={capture} busy={busy} disabled={!ready} />}
        <Button title={es.photos.cancel} secondary onPress={onClose} disabled={busy} />
      </View>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background }, camera: { flex: 1 },
  permission: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 }, controls: { padding: 20, gap: 12 }, text: { color: theme.colors.muted, fontSize: 16, lineHeight: 24 },
});
