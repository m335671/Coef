// Réglages d'apparence posés directement dans Réglages : mode et couleur du thème. Le nuancier sert aussi à
// l'écran des couleurs des matières.
import { StyleSheet, Switch, View } from 'react-native';

import { changerApparence } from '@/features/apparence';
import { COULEURS_THEME, type ModeAffichage, useApparence } from '@/ui/apparence';
import { Choix, Ligne, Panneau, Presse, Section, Texte } from '@/ui/composants';
import { CIBLE, espace, useCouleurs } from '@/ui/theme';

const MODES: { cle: ModeAffichage; titre: string }[] = [
  { cle: 'systeme', titre: 'Comme le téléphone' },
  { cle: 'clair', titre: 'Clair' },
  { cle: 'sombre', titre: 'Sombre' },
];

/** Couleur d'origine de Coef, pour sa pastille. */
const COEF = '#0f766e';

export function SectionsApparence() {
  const c = useCouleurs();
  const { mode, couleur, accentSysteme } = useApparence();
  // Material You n'est pas une pastille parmi d'autres (on ne la reconnaissait pas) : c'est un choix nommé, au-dessus.
  const themes = [{ cle: 'coef', nom: 'Coef', teinte: COEF }, ...COULEURS_THEME.map((t) => ({ cle: t.couleur, nom: t.nom, teinte: t.couleur }))];
  const materialYou = couleur === 'systeme' && !!accentSysteme;
  const nomTheme = materialYou ? 'Material You' : (themes.find((t) => t.cle === couleur)?.nom ?? 'Coef');
  return (
    <>
      <Section titre="Mode">
        <Panneau>
          {MODES.map((m, i) => (
            <Choix key={m.cle} titre={m.titre} actif={mode === m.cle} dernier={i === MODES.length - 1} onPress={() => changerApparence({ mode: m.cle })} />
          ))}
        </Panneau>
      </Section>
      <Section titre="Couleur du thème" aide={`Thème actuel : ${nomTheme}.`}>
        {accentSysteme ? (
          <Panneau>
            <Ligne
              dernier
              onPress={() => changerApparence({ couleur: materialYou ? 'coef' : 'systeme' })}
              libelleAccessible={`Couleurs du fond d’écran, Material You, ${materialYou ? 'activé' : 'désactivé'}`}>
              <View style={[styles.echantillon, { backgroundColor: accentSysteme }]} />
              <View style={{ flex: 1 }}>
                <Texte variante="liste" moyen>
                  Couleurs du fond d’écran
                </Texte>
                <Texte variante="petit" attenue>
                  Material You : Coef prend la couleur de ton téléphone
                </Texte>
              </View>
              <Switch
                accessibilityLabel="Material You"
                value={materialYou}
                onValueChange={(v) => changerApparence({ couleur: v ? 'systeme' : 'coef' })}
                trackColor={{ true: c.accent, false: c.controle }}
                thumbColor={c.surface}
              />
            </Ligne>
          </Panneau>
        ) : (
          <Texte variante="petit" attenue>
            Material You (couleurs du fond d’écran) : Android 12 ou plus récent.
          </Texte>
        )}
        <View style={{ opacity: materialYou ? 0.45 : 1 }}>
          <Nuancier choix={themes} actif={materialYou ? '' : couleur} onChoisir={(cle) => changerApparence({ couleur: cle })} />
        </View>
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
  echantillon: { width: 28, height: 28, borderRadius: 14 },
});
