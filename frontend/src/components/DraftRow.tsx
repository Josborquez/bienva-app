import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { TrashIcon } from './TrashIcon';
import { es } from '../i18n/es';
import { theme } from '../theme';

// Deleting a draft loses work that cannot be recovered, so it asks inline first
// (browser/native alert dialogs are unreliable on the web build).
export function DraftRow({ label, onOpen, onDelete }: { label: string; onOpen: () => void; onDelete: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);
  async function remove() {
    setDeleting(true); setError(false);
    try { await onDelete(); } catch { setError(true); setDeleting(false); }
  }
  if (confirming) return <View style={styles.confirm}>
    <Text style={styles.question}>{es.today.deleteDraftQuestion}</Text>
    <Text style={styles.detail}>{label}</Text>
    <View style={styles.buttons}>
      <View style={styles.grow}><Button title={deleting ? es.today.deletingDraft : es.today.deleteDraft} busy={deleting} onPress={remove} /></View>
      <View style={styles.grow}><Button secondary title={es.today.cancel} disabled={deleting} onPress={() => { setConfirming(false); setError(false); }} /></View>
    </View>
    {error && <Text accessibilityRole="alert" style={styles.error}>{es.today.deleteDraftError}</Text>}
  </View>;
  return <View style={styles.row}>
    <View style={styles.grow}><Button secondary title={label} onPress={onOpen} /></View>
    <Pressable accessibilityRole="button" accessibilityLabel={es.today.deleteDraftLabel(label)} hitSlop={8} onPress={() => setConfirming(true)} style={({ pressed }) => [styles.trash, pressed && styles.trashPressed]}>
      <TrashIcon />
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1 },
  trash: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  trashPressed: { backgroundColor: theme.colors.surface },
  confirm: { gap: 10, padding: 16, borderRadius: 16, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  question: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  detail: { color: theme.colors.muted, fontSize: 14 },
  buttons: { flexDirection: 'row', gap: 8 },
  error: { color: theme.colors.amber, fontSize: 14, lineHeight: 20 },
});
