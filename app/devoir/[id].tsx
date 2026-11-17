// Détail d'un devoir. Sa question : « Qu'est-ce que je dois faire exactement, et qu'a-t-on vu en classe ? »
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import type { Devoir } from '@/domain/types';
import { useDonnee } from '@/features/vie/store';
import { Ecran, EnTete, Entree, Ligne, Panneau, Pastille, Section, Texte } from '@/ui/composants';
import { jour, jourLong } from '@/ui/format';
import { espace, useCouleurs } from '@/ui/theme';

export default function DetailDevoir() {
  const c = useCouleurs();
  const { id, eleve } = useLocalSearchParams<{ id: string; eleve: string }>();
  const d = useDonnee<Devoir[]>(`devoirs:${eleve}`)?.valeur?.find((x) => x.id === id);

  if (!d) {
    return (
      <Ecran>
        <EnTete titre="Devoir" retour />
        <Texte>Ce devoir n’existe plus dans le cahier de textes.</Texte>
      </Ecran>
    );
  }

  return (
    <Ecran>
      <EnTete titre={d.matiere} retour />
      <Entree rang={1} style={styles.pastilles}>
        <Pastille texte={`Pour ${jourLong(d.pour)}`} />
        {d.interrogation ? <Pastille texte="Interrogation" fond={c.surface} encre={c.negatif} /> : null}
        {d.effectue ? <Pastille texte="Fait" /> : null}
      </Entree>
      <Section titre="À faire" rang={2}>
        <Panneau teinte style={{ paddingVertical: espace.l }}>
          <Texte selectable variante="liste" attenue={!d.contenu}>
            {d.contenu ?? 'Consigne pas encore chargée : ED ne la donne que pour les prochains jours. Elle apparaîtra à l’approche de la date.'}
          </Texte>
        </Panneau>
      </Section>
      {d.seance ? (
        <Section titre="Vu en classe" rang={3}>
          <Panneau style={{ paddingVertical: espace.l }}>
            <Texte selectable variante="liste">
              {d.seance}
            </Texte>
          </Panneau>
        </Section>
      ) : null}
      {d.pieces ? (
        <Section titre="Pièces jointes" aide="Leur téléchargement arrivera avec les documents." rang={4}>
          <Panneau>
            {d.pieces.map((p, i) => (
              <Ligne key={p} dernier={i === d.pieces!.length - 1}>
                <Texte variante="liste" style={{ flex: 1 }} numberOfLines={2}>
                  {p}
                </Texte>
              </Ligne>
            ))}
          </Panneau>
        </Section>
      ) : null}
      <Entree rang={5}>
        <Texte variante="petit" attenue>
          {[d.prof, d.donneLe ? `donné le ${jour(d.donneLe)}` : undefined].filter(Boolean).join(' · ')}
        </Texte>
      </Entree>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  pastilles: { flexDirection: 'row', flexWrap: 'wrap', gap: espace.s },
});
