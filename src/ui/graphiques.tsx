// Graphiques du design system : anneau de moyenne (P1), mini-courbe de matière (P2), règle face à la classe (P3),
// hachures du simulé (P5). SVG + Reanimated, mouvement coupé si le système réduit les animations.
import { type ReactNode, useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, Path, Pattern, Rect } from 'react-native-svg';

import { Texte } from './composants';
import { duree, espace, police, useCouleurs } from './theme';

const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
const CercleAnime = Animated.createAnimatedComponent(Circle);
const borne = (x: number) => Math.min(Math.max(x, 0), 1);

/** Une progression 0–1 qui part de 0 au montage puis suit `cible`. */
function useProgression(cible: number, delai = 0) {
  const reduit = useReducedMotion();
  const p = useSharedValue(reduit ? cible : 0);
  useEffect(() => {
    p.value = reduit ? cible : withDelay(delai, withTiming(cible, { duration: duree.barre, easing: EASE }));
  }, [cible, delai, reduit, p]);
  return p;
}

export type Repere = { valeur: number; couleur: string };

/** Anneau sur 20 qui se remplit jusqu'à `valeur` ; des repères (classe, objectif) coupent l'anneau. Contenu au centre. */
export function Anneau({
  valeur,
  reperes = [],
  couleur,
  taillePx = 184,
  epaisseur = 14,
  libelle,
  children,
  fond,
}: {
  valeur?: number;
  reperes?: Repere[];
  couleur?: string;
  /** Couleur de la surface sous l'anneau (liseré des repères). */
  fond?: string;
  taillePx?: number;
  epaisseur?: number;
  libelle: string;
  children?: ReactNode;
}) {
  const c = useCouleurs();
  const centre = taillePx / 2;
  const r = centre - epaisseur / 2 - 6;
  const tour = 2 * Math.PI * r;
  const p = useProgression(borne((valeur ?? 0) / 20), 150);
  const props = useAnimatedProps(() => ({ strokeDashoffset: tour * (1 - p.value) }));
  const point = (v: number, rayon: number) => {
    const a = (borne(v / 20) * 2 - 0.5) * Math.PI;
    return { x: centre + Math.cos(a) * rayon, y: centre + Math.sin(a) * rayon };
  };
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={libelle} style={{ width: taillePx, height: taillePx, alignSelf: 'center' }}>
      <Svg width={taillePx} height={taillePx}>
        <Circle cx={centre} cy={centre} r={r} fill="none" stroke={c.teinte100} strokeWidth={epaisseur} />
        <G transform={`rotate(-90 ${centre} ${centre})`}>
          <CercleAnime
            cx={centre}
            cy={centre}
            r={r}
            fill="none"
            stroke={couleur ?? c.accent}
            strokeWidth={epaisseur}
            strokeLinecap="round"
            strokeDasharray={`${tour} ${tour}`}
            animatedProps={props}
          />
        </G>
        {reperes.map((m, i) => {
          const a = point(m.valeur, r - epaisseur / 2 - 5);
          const b = point(m.valeur, r + epaisseur / 2 + 5);
          // Liseré couleur de fond dessous : le repère se détache de l'arc même quand il tombe sur son extrémité.
          return (
            <G key={i}>
              <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={fond ?? c.fond} strokeWidth={7} strokeLinecap="round" />
              <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={m.couleur} strokeWidth={3} strokeLinecap="round" />
            </G>
          );
        })}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.centre]}>{children}</View>
    </View>
  );
}

/** Petite courbe de tendance (liste des matières) : pas d'axe, juste la forme, un point sur la dernière valeur. */
export function MiniCourbe({ points, couleur, largeur = 64, hauteur = 18 }: { points: number[]; couleur: string; largeur?: number; hauteur?: number }) {
  if (points.length < 2) return <View style={{ width: largeur, height: hauteur }} />;
  const min = Math.min(...points);
  const ecart = Math.max(Math.max(...points) - min, 1);
  const xy = points.map((v, i) => [2 + (i / (points.length - 1)) * (largeur - 6), hauteur - 3 - ((v - min) / ecart) * (hauteur - 6)] as const);
  const [fx, fy] = xy.at(-1)!;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={largeur} height={hauteur}>
        <Path
          d={xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
          fill="none"
          stroke={couleur}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={fx} cy={fy} r={2.5} fill={couleur} />
      </Svg>
    </View>
  );
}

/**
 * Règle de 0 à `sur` : plage de la classe (min–max) en teinte, trait de la moyenne de classe, pastille de l'élève
 * qui glisse jusqu'à sa place. Graduations tous les quarts.
 */
export function Regle({
  valeur,
  sur = 20,
  classe,
  couleur,
  libelle,
}: {
  valeur?: number;
  sur?: number;
  classe?: { moyenne?: number; min?: number; max?: number };
  couleur?: string;
  libelle: string;
}) {
  const c = useCouleurs();
  const pct = (x: number) => borne(x / sur) * 100;
  const p = useProgression(valeur === undefined ? 0 : borne(valeur / sur), 200);
  const pouce = useAnimatedStyle(() => ({ left: `${p.value * 100}%` }));
  const debut = classe?.min ?? 0;
  const fin = classe?.max ?? sur;
  return (
    <View accessible accessibilityLabel={libelle} style={{ gap: espace.xs }}>
      <View style={styles.regle}>
        <View style={[styles.rail, { backgroundColor: c.teinte50, borderColor: c.bord }]} />
        {classe ? <View style={[styles.plage, { left: `${pct(debut)}%`, width: `${pct(fin) - pct(debut)}%`, backgroundColor: c.teinte100 }]} /> : null}
        {classe?.moyenne !== undefined ? <View style={[styles.trait, { left: `${pct(classe.moyenne)}%`, backgroundColor: c.accentEncre }]} /> : null}
        {valeur !== undefined ? <Animated.View style={[styles.pouce, { backgroundColor: couleur ?? c.accent, borderColor: c.surface }, pouce]} /> : null}
      </View>
      <View style={styles.graduations} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {[0, 0.25, 0.5, 0.75, 1].map((q) => (
          <Texte key={q} variante="petit" attenue style={{ fontFamily: police.normal, fontVariant: ['tabular-nums'] }}>
            {String(Math.round(q * sur * 100) / 100).replace('.', ',')}
          </Texte>
        ))}
      </View>
    </View>
  );
}

/** Hachures orange du simulé, en fond d'un bloc (le parent pose `overflow: 'hidden'` et son arrondi). */
export function Hachures({ couleur, opacite = 0.14 }: { couleur?: string; opacite?: number }) {
  const c = useCouleurs();
  const id = `h${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Line x1={0} y1={0} x2={0} y2={9} stroke={couleur ?? c.negatif} strokeWidth={3.5} strokeOpacity={opacite} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center', justifyContent: 'center' },
  regle: { height: 28, justifyContent: 'center' },
  rail: { position: 'absolute', left: 0, right: 0, height: 10, borderRadius: 5, borderWidth: StyleSheet.hairlineWidth },
  plage: { position: 'absolute', height: 10, borderRadius: 5 },
  trait: { position: 'absolute', width: 3, height: 22, marginLeft: -1.5, borderRadius: 1.5 },
  pouce: { position: 'absolute', width: 22, height: 22, marginLeft: -11, borderRadius: 11, borderWidth: 3 },
  graduations: { flexDirection: 'row', justifyContent: 'space-between' },
});
