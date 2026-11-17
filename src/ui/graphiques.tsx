// Graphiques du design system : anneau de moyenne (P1), mini-courbe de matière (P2), règle face à la classe (P3),
// hachures du simulé (P5). SVG + Reanimated, mouvement coupé si le système réduit les animations.
import { type ReactNode, useEffect, useId, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, Path, Pattern, Rect } from 'react-native-svg';

import { Texte } from './composants';
import { duree, police, useCouleurs } from './theme';

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

/** Une marque sur une échelle : un point (la valeur de l'élève) ou un trait (classe, objectif), avec son étiquette. */
export type Marque = { valeur: number; couleur: string; texte?: string; forme: 'point' | 'trait'; cote?: 'haut' | 'bas' };

const LARGEUR_ETIQUETTE = 104;
const LIGNE = 20;
const nombre = (v: number) => String(Math.round(v * 100) / 100).replace('.', ',');

/**
 * Échelle graduée de `min` à `max` : grands traits chiffrés tous les `pas`, petits tous les `sousPas`, plage teintée
 * (min–max de la classe), marques étiquetées au-dessus ou au-dessous. Deux étiquettes trop proches passent sur deux
 * lignes plutôt que de se chevaucher. Le point glisse jusqu'à sa place à l'arrivée.
 */
export function Echelle({
  min,
  max,
  pas,
  sousPas,
  plage,
  marques,
  libelle,
}: {
  min: number;
  max: number;
  pas: number;
  sousPas: number;
  plage?: [number, number];
  marques: Marque[];
  libelle: string;
}) {
  const c = useCouleurs();
  const [l, setL] = useState(0);
  const x = (v: number) => borne((v - min) / (max - min)) * l;
  const placer = (cote: 'haut' | 'bas') => {
    const lignes: number[][] = [];
    return marques
      .filter((m) => m.texte && (m.cote ?? (m.forme === 'point' ? 'haut' : 'bas')) === cote)
      .map((m) => {
        const cx = Math.min(Math.max(x(m.valeur), LARGEUR_ETIQUETTE / 2), Math.max(l - LARGEUR_ETIQUETTE / 2, LARGEUR_ETIQUETTE / 2));
        let ligne = 0;
        while (lignes[ligne]?.some((autre) => Math.abs(autre - cx) < LARGEUR_ETIQUETTE)) ligne++;
        (lignes[ligne] ??= []).push(cx);
        return { m, cx, ligne };
      });
  };
  const haut = placer('haut');
  const bas = placer('bas');
  const nHaut = Math.max(0, ...haut.map((e) => e.ligne + 1));
  const nBas = Math.max(0, ...bas.map((e) => e.ligne + 1));
  const yRail = nHaut * LIGNE + 14;
  const yChiffres = yRail + 18;
  const yBas = yChiffres + 22;
  const hauteur = yBas + nBas * LIGNE + 2;
  const graduations = Array.from({ length: Math.round((max - min) / sousPas) + 1 }, (_, i) => min + i * sousPas);
  const grand = (v: number) => Math.abs(v / pas - Math.round(v / pas)) < 1e-6;
  const principal = marques.find((m) => m.forme === 'point');
  const p = useProgression(principal ? borne((principal.valeur - min) / (max - min)) : 0, 200);
  const glisse = useAnimatedStyle(() => ({ transform: [{ translateX: p.value * l }] }));

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={libelle} onLayout={(e) => setL(e.nativeEvent.layout.width)} style={{ height: hauteur }}>
      {l > 0 ? (
        <>
          <Svg width={l} height={hauteur} style={StyleSheet.absoluteFill}>
            <Rect x={0} y={yRail - 5} width={l} height={10} rx={5} fill={c.teinte50} stroke={c.bord} strokeWidth={StyleSheet.hairlineWidth} />
            {plage ? <Rect x={x(plage[0])} y={yRail - 5} width={Math.max(x(plage[1]) - x(plage[0]), 10)} height={10} rx={5} fill={c.teinte100} /> : null}
            {graduations.map((v) => (
              <Line
                key={v}
                x1={x(v)}
                x2={x(v)}
                y1={yRail + 7}
                y2={yRail + (grand(v) ? 13 : 10)}
                stroke={grand(v) ? c.attenue : c.controle}
                strokeWidth={grand(v) ? 1.5 : 1}
              />
            ))}
            {marques
              .filter((m) => m.forme === 'trait')
              .map((m, i) => (
                <G key={i}>
                  <Line x1={x(m.valeur)} x2={x(m.valeur)} y1={yRail - 12} y2={yRail + 12} stroke={c.surface} strokeWidth={6} strokeLinecap="round" />
                  <Line x1={x(m.valeur)} x2={x(m.valeur)} y1={yRail - 12} y2={yRail + 12} stroke={m.couleur} strokeWidth={3} strokeLinecap="round" />
                </G>
              ))}
          </Svg>
          {principal ? <Animated.View style={[styles.point, { top: yRail - 11, backgroundColor: principal.couleur, borderColor: c.surface }, glisse]} /> : null}
          {graduations.filter(grand).map((v) => (
            <Texte key={v} variante="petit" attenue style={[styles.chiffre, { top: yChiffres - 2, left: x(v) - 20 }]}>
              {nombre(v)}
            </Texte>
          ))}
          {[...haut.map((e) => ({ ...e, y: yRail - 16 - (e.ligne + 1) * LIGNE + 4 })), ...bas.map((e) => ({ ...e, y: yBas + e.ligne * LIGNE }))].map(
            ({ m, cx, y }, i) => (
              <Texte
                key={i}
                variante="petit"
                numberOfLines={1}
                style={[
                  styles.etiquette,
                  { top: y, left: cx - LARGEUR_ETIQUETTE / 2, color: m.couleur, fontFamily: m.forme === 'point' ? police.gras : police.moyen },
                ]}>
                {m.texte}
              </Texte>
            ),
          )}
        </>
      ) : null}
    </View>
  );
}

/** Règle de 0 à `sur` face à la classe : plage min–max, trait de la moyenne de classe, point de l'élève, graduée par unité. */
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
  const marques: Marque[] = [
    ...(classe?.moyenne !== undefined
      ? [{ valeur: classe.moyenne, couleur: c.attenue, texte: `classe ${nombre(classe.moyenne)}`, forme: 'trait' as const }]
      : []),
    ...(valeur !== undefined ? [{ valeur, couleur: couleur ?? c.accent, texte: `toi ${nombre(valeur)}`, forme: 'point' as const }] : []),
  ];
  const plage: [number, number] | undefined = classe?.min !== undefined || classe?.max !== undefined ? [classe.min ?? 0, classe.max ?? sur] : undefined;
  return <Echelle min={0} max={sur} pas={sur / 4} sousPas={sur % 4 === 0 && sur >= 8 ? sur / 20 : sur / 4} plage={plage} marques={marques} libelle={libelle} />;
}

/**
 * Zoom sur la générale : l'échelle ne couvre que l'intervalle utile (au moins 2 points), au quart de point près.
 * Rend lisibles les écarts que l'anneau sur 20 écrase (13,70 contre un objectif de 14).
 */
export function ZoomMoyenne({ marques, libelle }: { marques: Marque[]; libelle: string }) {
  const valeurs = marques.map((m) => m.valeur);
  let min = Math.max(0, Math.floor(Math.min(...valeurs) - 0.5));
  let max = Math.min(20, Math.ceil(Math.max(...valeurs) + 0.5));
  if (max - min < 2) [min, max] = max >= 20 ? [18, 20] : [min, min + 2];
  const ecart = max - min;
  return <Echelle min={min} max={max} pas={ecart <= 6 ? 1 : 2} sousPas={ecart <= 3 ? 0.25 : ecart <= 6 ? 0.5 : 1} marques={marques} libelle={libelle} />;
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
  point: { position: 'absolute', left: -11, width: 22, height: 22, borderRadius: 11, borderWidth: 3 },
  chiffre: { position: 'absolute', width: 40, textAlign: 'center', fontVariant: ['tabular-nums'] },
  etiquette: { position: 'absolute', width: LARGEUR_ETIQUETTE, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
