import { FlashList } from '@shopify/flash-list';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { demo } from '../../../fixtures/demo';

// Écran provisoire du mode démo. Le vrai écran arrive à l'étape 5.
export function NotesDemo() {
  const sombre = useColorScheme() === 'dark';
  const texte = { color: sombre ? '#F2F2F2' : '#151515' };
  const nom = new Map(demo.periodes[0]!.matieres.map((m) => [m.code, m.libelle]));

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: sombre ? '#101010' : '#FAFAF7' }]}>
      <Text accessibilityRole="header" style={[styles.titre, texte]}>
        Notes
      </Text>
      <Text style={[styles.meta, texte]}>Mode démo · données fictives</Text>
      <FlashList
        data={demo.notes}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <View style={styles.ligne} accessible>
            <View style={styles.flex}>
              <Text style={[styles.matiere, texte]}>{nom.get(item.matiereCode)}</Text>
              <Text style={[styles.meta, texte]}>{item.devoir}</Text>
            </View>
            <Text style={[styles.valeur, texte]}>
              {item.valeurBrute}
              {item.noteSur !== 20 ? `/${item.noteSur}` : ''}
            </Text>
          </View>
        )}
      />
      <Text style={[styles.meta, texte]}>Client non officiel, non affilié à EcoleDirecte.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 16 },
  titre: { fontSize: 34, fontWeight: '700', marginTop: 16 },
  meta: { fontSize: 13, opacity: 0.7, marginVertical: 4 },
  ligne: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  flex: { flex: 1 },
  matiere: { fontSize: 16, fontWeight: '600' },
  valeur: { fontSize: 18, fontVariant: ['tabular-nums'] },
});
