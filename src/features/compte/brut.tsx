// Composants volontairement bruts pour l'essai de l'étape 2 ; remplacés par le design system à l'étape 5.
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme } from 'react-native';

export function useCouleurs() {
  const sombre = useColorScheme() === 'dark';
  return { fond: sombre ? '#101010' : '#FAFAF7', texte: sombre ? '#F2F2F2' : '#151515', bord: sombre ? '#444' : '#BBB' };
}

export function Bouton({ titre, onPress, desactive }: { titre: string; onPress: () => void; desactive?: boolean }) {
  const c = useCouleurs();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: desactive }}
      disabled={desactive}
      onPress={onPress}
      style={[styles.bouton, { borderColor: c.bord, opacity: desactive ? 0.5 : 1 }]}>
      <Text style={{ color: c.texte, fontSize: 16 }}>{titre}</Text>
    </Pressable>
  );
}

export function T({ children, gras }: { children: ReactNode; gras?: boolean }) {
  const c = useCouleurs();
  return <Text style={{ color: c.texte, fontSize: 16, fontWeight: gras ? '700' : '400', marginVertical: 4 }}>{children}</Text>;
}

const styles = StyleSheet.create({
  bouton: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, marginVertical: 6, alignItems: 'center' },
});
