// Détail d'une carte de Vie scolaire (absences, retards…). Sa question : « Lesquels, quand, et sont-ils justifiés ? »
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import type { EvenementVieScolaire } from '@/domain/types';
import { useEleveActif } from '@/features/compte/eleves';
import { aJustifier, dansGroupe, GROUPES } from '@/features/vie/groupes';
import { useDonnee } from '@/features/vie/store';
import { Ecran, EnTete, Entree, Ligne, Panneau, Pastille, Texte } from '@/ui/composants';
import { jour } from '@/ui/format';
import { useCouleurs } from '@/ui/theme';

export default function Evenements() {
  const c = useCouleurs();
  const { groupe } = useLocalSearchParams<{ groupe: string }>();
  const g = GROUPES.find((x) => x.cle === groupe) ?? GROUPES[0];
  const [eleve] = useEleveActif();
  const liste = (useDonnee<EvenementVieScolaire[]>(`vie:${eleve?.id}`)?.valeur ?? []).filter((e) => dansGroupe(g, e));

  return (
    <Ecran>
      <EnTete titre={g.titre} retour />
      {liste.length === 0 ? (
        <Texte variante="liste" attenue>
          Rien pour l’instant.
        </Texte>
      ) : (
        <Entree rang={1}>
          <Panneau>
            {liste.map((e, j) => (
              <Ligne key={e.id} dernier={j === liste.length - 1}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Texte variante="liste" moyen>
                    {e.libelle}
                  </Texte>
                  <Texte variante="petit" attenue>
                    {[jour(e.date), e.motif, e.par].filter(Boolean).join(' · ')}
                  </Texte>
                </View>
                {e.type === 'absence' || e.type === 'retard' ? (
                  aJustifier(e) ? (
                    <Pastille texte="À justifier" fond={c.surface} encre={c.negatif} />
                  ) : (
                    <Pastille texte="Justifié" />
                  )
                ) : null}
              </Ligne>
            ))}
          </Panneau>
        </Entree>
      )}
    </Ecran>
  );
}
