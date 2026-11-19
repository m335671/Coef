// Apparence. Sa question : « À quoi ressemble mon Coef ? » Mode, couleur du thème, couleur de chaque matière.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { changerApparence } from '@/features/apparence';
import { useEleveActif } from '@/features/compte/eleves';
import { clesMatiere, useCouleurMatiere } from '@/features/notes/familles';
import { useNotes } from '@/features/notes/store';
import { COULEURS_MATIERE, COULEURS_THEME, type ModeAffichage, useApparence } from '@/ui/apparence';
import { Bouton, Choix, Ecran, EnTete, Ligne, Panneau, Presse, Section, Texte } from '@/ui/composants';
import { CIBLE, espace, useCouleurs } from '@/ui/theme';

const MODES: { cle: ModeAffichage; titre: string }[] = [
  { cle: 'systeme', titre: 'Comme le téléphone' },
  { cle: 'clair', titre: 'Clair' },
  { cle: 'sombre', titre: 'Sombre' },
];

/** Couleur d'origine de Coef, pour sa pastille. */
const COEF = '#0f766e';

export default function Apparence() {
  const { mode, couleur, matieres, accentSysteme } = useApparence();
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

  const themes = [
    { cle: 'coef', nom: 'Coef', teinte: COEF },
    ...(accentSysteme ? [{ cle: 'systeme', nom: 'Material You (fond d’écran)', teinte: accentSysteme }] : []),
    ...COULEURS_THEME.map((t) => ({ cle: t.couleur, nom: t.nom, teinte: t.couleur })),
  ];

  return (
    <Ecran>
      <EnTete titre="Apparence" retour />

      <Section titre="Mode">
        <Panneau>
          {MODES.map((m, i) => (
            <Choix key={m.cle} titre={m.titre} actif={mode === m.cle} dernier={i === MODES.length - 1} onPress={() => changerApparence({ mode: m.cle })} />
          ))}
        </Panneau>
      </Section>

      <Section
        titre="Couleur du thème"
        aide={accentSysteme ? 'Material You suit les couleurs de ton fond d’écran.' : 'Material You : Android 12 ou plus récent.'}>
        <Nuancier choix={themes} actif={couleur} onChoisir={(cle) => changerApparence({ couleur: cle })} />
      </Section>

      <Section titre="Couleurs des matières" aide="Par défaut, chaque matière prend la couleur de sa famille (sciences, langues…).">
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

/** Pastilles de couleur à choix unique. Sans teinte : pastille barrée (« par défaut »). */
function Nuancier({ choix, actif, onChoisir }: { choix: { cle: string; nom: string; teinte?: string }[]; actif: string; onChoisir: (cle: string) => void }) {
  const c = useCouleurs();
  return (
    <View style={styles.nuancier} accessibilityRole="radiogroup">
      {choix.map((x) => {
        const choisi = x.cle === actif;
        return (
          <Presse key={x.cle || 'defaut'} role="radio" selectionne={choisi} libelleAccessible={x.nom} onPress={() => onChoisir(x.cle)}>
            <View style={[styles.anneau, { borderColor: choisi ? c.texte : 'transparent' }]}>
              <View style={[styles.pastille, x.teinte ? { backgroundColor: x.teinte } : { borderWidth: 2, borderColor: c.controle }]}>
                {x.teinte ? null : <View style={[styles.barre, { backgroundColor: c.controle }]} />}
              </View>
            </View>
          </Presse>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Tailles fixes : le retour à la ligne avec gap est sûr ici (le piège Android concerne les largeurs en %).
  nuancier: { flexDirection: 'row', flexWrap: 'wrap', gap: espace.s },
  anneau: { width: CIBLE + 4, height: CIBLE + 4, borderRadius: (CIBLE + 4) / 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  pastille: { width: CIBLE - 8, height: CIBLE - 8, borderRadius: (CIBLE - 8) / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  barre: { width: 2, height: CIBLE, transform: [{ rotate: '45deg' }] },
  point: { width: 12, height: 12, borderRadius: 6 },
  deplie: { paddingVertical: espace.m },
});
