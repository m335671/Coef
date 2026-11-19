// Réglages d'apparence posés directement dans Réglages : mode et couleur du thème. Le nuancier sert aussi à
// l'écran des couleurs des matières.
import { StyleSheet, View } from 'react-native';

import { changerApparence } from '@/features/apparence';
import { COULEURS_THEME, type ModeAffichage, useApparence } from '@/ui/apparence';
import { Choix, Panneau, Presse, Section } from '@/ui/composants';
import { CIBLE, espace, useCouleurs } from '@/ui/theme';

const MODES: { cle: ModeAffichage; titre: string }[] = [
  { cle: 'systeme', titre: 'Comme le téléphone' },
  { cle: 'clair', titre: 'Clair' },
  { cle: 'sombre', titre: 'Sombre' },
];

/** Couleur d'origine de Coef, pour sa pastille. */
const COEF = '#0f766e';

export function SectionsApparence() {
  const { mode, couleur, accentSysteme } = useApparence();
  const themes = [
    { cle: 'coef', nom: 'Coef', teinte: COEF },
    ...(accentSysteme ? [{ cle: 'systeme', nom: 'Material You (fond d’écran)', teinte: accentSysteme }] : []),
    ...COULEURS_THEME.map((t) => ({ cle: t.couleur, nom: t.nom, teinte: t.couleur })),
  ];
  return (
    <>
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
    </>
  );
}

/** Pastilles de couleur à choix unique. Sans teinte : pastille barrée (« par défaut »). */
export function Nuancier({ choix, actif, onChoisir }: { choix: { cle: string; nom: string; teinte?: string }[]; actif: string; onChoisir: (cle: string) => void }) {
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
});
