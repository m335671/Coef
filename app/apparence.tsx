// Couleurs des matières. Sa question : « De quelle couleur est chaque matière ? » Un aperçu en haut, puis chaque
// matière et son nuancier. Le mode et la couleur du thème sont directement dans Réglages.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { changerApparence } from '@/features/apparence';
import { useEleveActif } from '@/features/compte/eleves';
import { clesMatiere, useCouleurMatiere } from '@/features/notes/familles';
import { useNotes } from '@/features/notes/store';
import { Nuancier } from '@/features/ReglagesApparence';
import { COULEURS_MATIERE, useApparence } from '@/ui/apparence';
import { Bouton, Chiffre, Ecran, EnTete, Ligne, Panneau, Section, Texte } from '@/ui/composants';
import { MiniCourbe } from '@/ui/graphiques';
import { espace, rayon } from '@/ui/theme';

/** Tendance d'exemple de l'aperçu. */
const TENDANCE = [12.4, 13.1, 12.8, 14, 14.5];

export default function CouleursMatieres() {
  const { matieres } = useApparence();
  const couleurMatiere = useCouleurMatiere();
  const [eleve] = useEleveActif();
  const instantane = useNotes((s) => (eleve ? s.eleves[eleve.id]?.instantane : undefined));
  const [ouverte, setOuverte] = useState<string>();

  // Toutes les matières de l'année, une fois chacune (sous-matières comprises dans leur matière).
  const liste = [
    ...new Map(
      (instantane?.donnees.periodes ?? [])
        .flatMap((p) => p.matieres)
        .filter((m) => !m.sousCode)
        .map((m) => [m.code, m.libelle]),
    ),
  ].sort((a, b) => a[1].localeCompare(b[1], 'fr'));

  const choisirMatiere = (code: string, libelle: string, teinte?: string) => {
    const suite = { ...matieres };
    for (const k of clesMatiere(code, libelle)) {
      if (teinte) suite[k] = teinte;
      else delete suite[k];
    }
    changerApparence({ matieres: suite });
  };

  // L'aperçu prend la couleur de la matière ouverte (sinon la première) : on voit le choix avant de refermer.
  const [codeApercu, libelleApercu] = liste.find(([code]) => code === ouverte) ?? liste[0] ?? ['', ''];
  const apercu = couleurMatiere(codeApercu, libelleApercu);

  return (
    <Ecran>
      <EnTete titre="Couleurs des matières" retour />

      <View
        style={[styles.apercu, { backgroundColor: apercu.fond }]}
        accessible
        accessibilityLabel={`Aperçu${libelleApercu ? ` aux couleurs de ${libelleApercu}` : ''}`}>
        <Texte variante="section" style={{ color: apercu.encre }}>
          Matières
        </Texte>
        <View style={styles.rangee}>
          <View style={[styles.bande, { backgroundColor: apercu.trait }]} />
          <View style={{ flex: 1, gap: 2 }}>
            <Texte variante="liste" moyen style={{ color: apercu.encre }} numberOfLines={1}>
              {libelleApercu || 'Matière'}
            </Texte>
            <MiniCourbe points={TENDANCE} couleur={apercu.trait} />
          </View>
          <Chiffre valeur={14.5} taillePx={16} couleur={apercu.encre} />
        </View>
      </View>

      <Section titre="Chaque matière" aide="Par défaut, chaque matière prend la couleur de sa famille (sciences, langues…). Touche une matière pour la changer.">
        {liste.length === 0 ? (
          <Texte variante="liste" attenue>
            Les matières apparaîtront ici après la première synchronisation des notes.
          </Texte>
        ) : (
          <Panneau>
            {liste.map(([code, libelle], i) => {
              const choisie = clesMatiere(code, libelle).some((k) => matieres[k]);
              return (
                <View key={code}>
                  <Ligne
                    dernier={i === liste.length - 1 && ouverte !== code}
                    onPress={() => setOuverte(ouverte === code ? undefined : code)}
                    libelleAccessible={`${libelle}, ${choisie ? 'couleur choisie' : 'couleur de sa famille'}. Changer`}>
                    <View style={[styles.point, { backgroundColor: couleurMatiere(code, libelle).trait }]} />
                    <Texte variante="liste" style={{ flex: 1 }} numberOfLines={1}>
                      {libelle}
                    </Texte>
                  </Ligne>
                  {ouverte === code ? (
                    <View style={styles.deplie}>
                      <Nuancier
                        choix={[
                          { cle: '', nom: 'Couleur de la famille', teinte: undefined },
                          ...COULEURS_MATIERE.map((t) => ({ cle: t.couleur, nom: t.nom, teinte: t.couleur })),
                        ]}
                        actif={
                          clesMatiere(code, libelle)
                            .map((k) => matieres[k])
                            .find(Boolean) ?? ''
                        }
                        onChoisir={(cle) => choisirMatiere(code, libelle, cle || undefined)}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Panneau>
        )}
        {Object.keys(matieres).length > 0 ? (
          <Bouton variante="secondaire" titre="Remettre les couleurs des familles" onPress={() => changerApparence({ matieres: {} })} />
        ) : null}
      </Section>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  apercu: { borderRadius: rayon.carte, padding: espace.m, gap: espace.s },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
  bande: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  point: { width: 12, height: 12, borderRadius: 6 },
  deplie: { paddingVertical: espace.m },
});
