// Un message dans une liste : point si non lu, expéditeur, date, objet. Le toucher ouvre le message.
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { Message } from '@/domain/types';
import { Ligne, Texte } from '@/ui/composants';
import { heure, iso, jour } from '@/ui/format';
import { espace, police, useCouleurs } from '@/ui/theme';

export function LigneMessage({ m, eleve, dernier }: { m: Message; eleve: string; dernier?: boolean }) {
  const c = useCouleurs();
  const p = m.pieces.length;
  return (
    <Ligne
      dernier={dernier}
      onPress={() => router.push({ pathname: '/messages/[id]', params: { id: m.id, eleve } })}
      libelleAccessible={`${m.lu ? '' : 'Non lu. '}De ${m.de}. ${m.sujet}. ${jour(m.date)}${p ? ', avec pièce jointe' : ''}`}>
      <View style={[styles.point, { backgroundColor: m.lu ? 'transparent' : c.accent }]} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.rangee}>
          <Texte variante="liste" numberOfLines={1} style={{ flex: 1, fontFamily: m.lu ? undefined : police.fort }}>
            {m.de}
          </Texte>
          <Texte variante="petit" attenue style={{ fontVariant: ['tabular-nums'] }}>
            {m.date.startsWith(iso(new Date())) ? heure(m.date) : jour(m.date)}
          </Texte>
        </View>
        <Texte variante="petit" numberOfLines={2} style={{ color: m.lu ? c.attenue : c.texte }}>
          {m.sujet}
          {p ? ` · ${p} pièce${p > 1 ? 's' : ''} jointe${p > 1 ? 's' : ''}` : ''}
        </Texte>
      </View>
    </Ligne>
  );
}

const styles = StyleSheet.create({
  point: { width: 8, height: 8, borderRadius: 4 },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
});
