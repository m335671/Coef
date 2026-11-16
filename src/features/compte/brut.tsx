// Composants volontairement bruts pour l'essai de l'étape 2 ; remplacés par le design system à l'étape 5.
import type { ReactNode } from 'react';
import { File, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import { Pressable, StyleSheet, Text, useColorScheme } from 'react-native';

import { CAPTURE, capturerErreur, texteCaptures } from '@/api/ecoledirecte/capture';
import { ErreurED } from '@/api/ecoledirecte/erreurs';

/** Message pour l'écran. Dans les builds d'essai, la cause réelle des erreurs hors ED (et elle est capturée). */
export function messageErreur(e: unknown, contexte: string): string {
  if (e instanceof ErreurED) return CAPTURE && e.detail ? `${e.message} (${e.detail})` : e.message;
  return CAPTURE ? `Erreur inattendue : ${capturerErreur(contexte, e)}` : 'Erreur inattendue.';
}

/** Essai seulement : écrit les captures anonymisées dans un fichier du cache de l'app et ouvre le partage. */
export async function exporterCaptures(): Promise<void> {
  const fichier = new File(Paths.cache, 'ed-clone-capture.json');
  fichier.create({ overwrite: true });
  await fichier.write(texteCaptures());
  await shareAsync(fichier.uri, { mimeType: 'application/json', dialogTitle: 'Captures ED-Clone (anonymisées)' });
}

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
