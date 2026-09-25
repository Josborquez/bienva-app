import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { es } from '../i18n/es';

const values = Array.from({ length: 151 }, (_, index) => index + 100);
const rowHeight = 44;
export function HeightWheel({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const scroll = useRef<ScrollView>(null);
  const number = Math.min(250, Math.max(100, Math.round(Number(value.replace(',', '.')) || 170)));
  useEffect(() => { scroll.current?.scrollTo({ y: (number - 100) * rowHeight, animated: false }); }, [number]);
  return <View style={styles.box}>
    <View pointerEvents="none" style={styles.highlight} />
    <ScrollView ref={scroll} nestedScrollEnabled style={{ height: rowHeight * 3 }} contentContainerStyle={{ paddingVertical: rowHeight }}
      onLayout={() => scroll.current?.scrollTo({ y: (number - 100) * rowHeight, animated: false })}
      snapToInterval={rowHeight} decelerationRate="fast" showsVerticalScrollIndicator
      onMomentumScrollEnd={event => onChange(String(Math.min(250, Math.max(100, Math.round(event.nativeEvent.contentOffset.y / rowHeight) + 100))))}>
      {values.map(height => <Pressable key={height} accessibilityRole="button" accessibilityState={{ selected: height === number }}
        accessibilityLabel={`${es.onboarding.height}: ${height}`} style={styles.row} onPress={() => onChange(String(height))}>
        <Text style={[styles.value, height === number && styles.selected]}>{height}</Text>
      </Pressable>)}
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  box: { borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', backgroundColor: theme.colors.surface },
  highlight: { position: 'absolute', top: rowHeight, height: rowHeight, left: 0, right: 0, backgroundColor: theme.colors.primarySoft },
  row: { height: rowHeight, alignItems: 'center', justifyContent: 'center' },
  value: { color: theme.colors.muted, fontSize: 20 }, selected: { color: theme.colors.primary, fontWeight: '700' },
});
