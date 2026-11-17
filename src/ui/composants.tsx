// Composants du design system v2. Aucun kit UI : React Native, Reanimated (animations sur le thread UI),
// Gesture Handler et react-native-svg. Tout mouvement respecte « réduire les animations » du système.
import { router } from 'expo-router';
import { type ComponentRef, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  type StyleProp,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  View,
  type ViewStyle,
} from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { ecart as formatEcart, moyenne as formatMoyenne } from './format';
import { CIBLE, duree, espace, police, rayon, taille, useCouleurs } from './theme';

const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

type Variante = 'titre' | 'section' | 'corps' | 'liste' | 'petit';

const TEXTE: Record<Variante, { fontSize: number; lineHeight: number; fontFamily: string }> = {
  titre: { fontSize: taille.titre, lineHeight: 30, fontFamily: police.fort },
  section: { fontSize: taille.section, lineHeight: 22, fontFamily: police.fort },
  corps: { fontSize: taille.corps, lineHeight: 22, fontFamily: police.normal },
  liste: { fontSize: taille.liste, lineHeight: 21, fontFamily: police.normal },
  petit: { fontSize: taille.petit, lineHeight: 18, fontFamily: police.normal },
};

export function Texte({
  variante = 'corps',
  attenue,
  moyen,
  style,
  ...props
}: TextProps & { variante?: Variante; attenue?: boolean; moyen?: boolean }) {
  const c = useCouleurs();
  return (
    <Text
      {...props}
      style={[TEXTE[variante], { color: attenue ? c.attenue : c.texte }, moyen && { fontFamily: police.moyen }, style]}
    />
  );
}

/** Entrée échelonnée : chaque bloc monte de quelques pixels en apparaissant, `rang` × 50 ms après le premier. */
export function Entree({ rang = 0, children, style }: { rang?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(rang * duree.pas).duration(duree.entree).easing(EASE).reduceMotion(ReduceMotion.System)}
      style={style}>
      {children}
    </Animated.View>
  );
}

/**
 * Une moyenne qui « roule » jusqu'à sa valeur (au montage, puis à chaque changement). La valeur est animée sur
 * le thread UI ; chaque centième franchi est renvoyé à un Text ordinaire (un champ piloté directement ne
 * s'affichait pas sur Android, nouvelle architecture : essai du 17/11/2026). Le lecteur d'écran lit la valeur finale.
 */
export function ChiffreAnime({
  valeur,
  taillePx = taille.liste,
  couleur,
  gras = true,
}: {
  valeur?: number;
  taillePx?: number;
  couleur?: string;
  gras?: boolean;
}) {
  const c = useCouleurs();
  const reduit = useReducedMotion();
  const [affiche, setAffiche] = useState(reduit ? (valeur ?? 0) : 0);
  const v = useSharedValue(reduit ? (valeur ?? 0) : 0);
  useEffect(() => {
    if (valeur === undefined) return;
    v.value = reduit ? valeur : withTiming(valeur, { duration: duree.compteur, easing: EASE });
  }, [valeur, reduit, v]);
  useAnimatedReaction(
    () => Math.round(v.value * 100) / 100,
    (x, avant) => {
      if (x !== avant) runOnJS(setAffiche)(x);
    },
  );
  if (valeur === undefined) {
    return (
      <Text accessibilityLabel="pas de moyenne" style={{ fontFamily: police.normal, fontSize: taille.liste, color: c.attenue }}>
        —
      </Text>
    );
  }
  return (
    <Text
      accessibilityLabel={formatMoyenne(valeur)}
      style={{
        fontFamily: gras ? police.gras : police.fort,
        fontSize: taillePx,
        lineHeight: Math.ceil(taillePx * 1.15),
        letterSpacing: taillePx >= taille.chiffre ? -0.03 * taillePx : 0,
        fontVariant: ['tabular-nums'],
        color: couleur ?? c.texte,
      }}>
      {formatMoyenne(affiche)}
    </Text>
  );
}

/** Une moyenne fixe (listes) : chiffres tabulaires ; absente, un tiret gris. */
export function Chiffre({ valeur, taillePx = taille.liste, couleur }: { valeur?: number; taillePx?: number; couleur?: string }) {
  const c = useCouleurs();
  if (valeur === undefined) {
    return (
      <Text accessibilityLabel="pas de moyenne" style={{ fontFamily: police.normal, fontSize: taille.liste, color: c.attenue }}>
        —
      </Text>
    );
  }
  return (
    <Text style={{ fontFamily: police.fort, fontSize: taillePx, fontVariant: ['tabular-nums'], color: couleur ?? c.texte }}>
      {formatMoyenne(valeur)}
    </Text>
  );
}

/** Le signal de ce qui a bougé : ▲ dans l'accent, ▼ en orange, zéro en gris. */
export function Ecart({ valeur, suffixe }: { valeur: number; suffixe?: string }) {
  const c = useCouleurs();
  const nul = Math.abs(valeur) < 0.005;
  const couleur = nul ? c.attenue : valeur > 0 ? c.positif : c.negatif;
  return (
    <Text
      accessibilityLabel={`${nul ? 'inchangée' : valeur > 0 ? 'en hausse de' : 'en baisse de'} ${formatEcart(Math.abs(valeur))}${suffixe ? ` ${suffixe}` : ''}`}
      style={{ fontFamily: police.fort, fontSize: taille.petit + 1, fontVariant: ['tabular-nums'], color: couleur }}>
      {nul ? '' : valeur > 0 ? '▲ ' : '▼ '}
      {formatEcart(valeur)}
      {suffixe ? <Text style={{ color: c.attenue, fontFamily: police.normal }}> {suffixe}</Text> : null}
    </Text>
  );
}

/** Une barre de progression qui se remplit jusqu'à `ratio` (0–1), après `delai` ms ; elle suit les changements. */
export function Barre({ ratio, delai = 0, hauteur = 6, fond, plein }: { ratio: number; delai?: number; hauteur?: number; fond?: string; plein?: string }) {
  const c = useCouleurs();
  const reduit = useReducedMotion();
  const p = useSharedValue(reduit ? ratio : 0);
  const premier = useRef(true);
  useEffect(() => {
    const cible = Math.min(Math.max(ratio, 0), 1);
    if (reduit) p.value = cible;
    else p.value = premier.current ? withDelay(delai, withTiming(cible, { duration: duree.barre, easing: EASE })) : withTiming(cible, { duration: 350, easing: EASE });
    premier.current = false;
  }, [ratio, delai, reduit, p]);
  const style = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={{ height: hauteur, borderRadius: hauteur / 2, backgroundColor: fond ?? c.teinte100, overflow: 'hidden' }}>
      <Animated.View style={[{ height: hauteur, borderRadius: hauteur / 2, backgroundColor: plein ?? c.accent }, style]} />
    </View>
  );
}

/** Le point d'une nouvelle note : il pulse trois fois à l'arrivée. */
export function Pulsation() {
  const c = useCouleurs();
  const reduit = useReducedMotion();
  const s = useSharedValue(0);
  useEffect(() => {
    // Trois pulsations puis repos : une boucle infinie userait la batterie et empêcherait l'UI d'être « au repos ».
    if (!reduit) s.value = withDelay(600, withRepeat(withSequence(withTiming(1, { duration: 1400 }), withTiming(0, { duration: 0 })), 3));
  }, [reduit, s]);
  const anneau = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - s.value), transform: [{ scale: 1 + s.value * 1.6 }] }));
  return (
    <View style={styles.point} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 5, backgroundColor: c.accent }, anneau]} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: 5, backgroundColor: c.accent }]} />
    </View>
  );
}

/** Pressable qui se tasse légèrement sous le doigt. */
export function Presse({
  children,
  onPress,
  style,
  libelleAccessible,
  role = 'button',
  selectionne,
  desactive,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  libelleAccessible?: string;
  role?: 'button' | 'radio' | 'tab';
  selectionne?: boolean;
  desactive?: boolean;
}) {
  const reduit = useReducedMotion();
  const s = useSharedValue(1);
  const anime = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={libelleAccessible}
      accessibilityState={{ selected: selectionne, disabled: desactive }}
      disabled={desactive || !onPress}
      onPress={onPress}
      onPressIn={() => {
        if (!reduit) s.set(withTiming(0.97, { duration: duree.pression }));
      }}
      onPressOut={() => s.set(withTiming(1, { duration: duree.pression }))}>
      <Animated.View style={[style, anime]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Bouton({
  titre,
  onPress,
  variante = 'primaire',
  desactive,
  libelleAccessible,
}: {
  titre: string;
  onPress: () => void;
  variante?: 'primaire' | 'secondaire' | 'texte' | 'danger';
  desactive?: boolean;
  libelleAccessible?: string;
}) {
  const c = useCouleurs();
  const fond = { primaire: c.accent, secondaire: c.teinte50, texte: 'transparent', danger: 'transparent' }[variante];
  const encre = { primaire: c.surAccent, secondaire: c.accentEncre, texte: c.accent, danger: c.negatif }[variante];
  const plat = variante === 'texte' || variante === 'danger';
  return (
    <Presse
      onPress={onPress}
      desactive={desactive}
      libelleAccessible={libelleAccessible}
      style={[plat ? styles.boutonTexte : styles.bouton, { backgroundColor: fond, opacity: desactive ? 0.45 : 1 }]}>
      <Text style={{ fontFamily: police.fort, fontSize: plat ? taille.liste : 16, color: encre }}>{titre}</Text>
    </Presse>
  );
}

/** Bouton rond d'icône (retour, réglages). */
export function BoutonRond({ libelle, onPress, children }: { libelle: string; onPress: () => void; children: ReactNode }) {
  const c = useCouleurs();
  return (
    <Presse libelleAccessible={libelle} onPress={onPress} style={[styles.rond, { backgroundColor: c.teinte50 }]}>
      {children}
    </Presse>
  );
}

export function Panneau({ children, style, teinte }: { children: ReactNode; style?: ViewStyle; teinte?: boolean }) {
  const c = useCouleurs();
  return (
    <View
      style={[
        styles.panneau,
        teinte ? { backgroundColor: c.teinte50, borderColor: c.teinte50, borderRadius: rayon.phare } : { backgroundColor: c.surface, borderColor: c.bord },
        style,
      ]}>
      {children}
    </View>
  );
}

/** Une ligne de liste : 44 px au moins, un filet entre les lignes, elle se tasse sous le doigt. */
export function Ligne({
  children,
  onPress,
  dernier,
  libelleAccessible,
  role,
  selectionne,
}: {
  children: ReactNode;
  onPress?: () => void;
  dernier?: boolean;
  libelleAccessible?: string;
  role?: 'button' | 'radio';
  selectionne?: boolean;
}) {
  const c = useCouleurs();
  const style = [styles.ligne, { borderBottomColor: c.filet, borderBottomWidth: dernier ? 0 : StyleSheet.hairlineWidth }];
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Presse onPress={onPress} libelleAccessible={libelleAccessible} role={role} selectionne={selectionne} style={style}>
      {children}
    </Presse>
  );
}

/** Pastille courte : « Calcul vérifié », « nouvelle note ». */
export function Pastille({ texte, fond, encre }: { texte: string; fond?: string; encre?: string }) {
  const c = useCouleurs();
  return (
    <View style={[styles.pastille, { backgroundColor: fond ?? c.teinte100 }]}>
      <Text style={{ fontFamily: police.fort, fontSize: 12, color: encre ?? c.accentEncre }}>{texte}</Text>
    </View>
  );
}

/**
 * Choix exclusif en pilules sur une ligne qui défile. `plein` : l'actif prend l'accent (simulateur) ; sinon une
 * teinte. L'élément choisi est ramené à l'écran, même s'il était loin dans la liste.
 */
export function Segments<T extends string | number>({
  options,
  valeur,
  onChange,
  libelle,
  plein,
  surTeinte,
}: {
  options: { cle: T; libelle: string }[];
  valeur: T;
  onChange: (v: T) => void;
  libelle: string;
  plein?: boolean;
  /** Posé sur une carte teintée : les pilules inactives prennent la surface pour rester visibles. */
  surTeinte?: boolean;
}) {
  const c = useCouleurs();
  const defile = useRef<ComponentRef<typeof ScrollView>>(null);
  const positions = useRef(new Map<T, number>());
  useEffect(() => {
    const x = positions.current.get(valeur);
    if (x !== undefined) defile.current?.scrollTo({ x: Math.max(x - espace.l, 0), animated: true });
  }, [valeur]);
  return (
    <ScrollView ref={defile} horizontal showsHorizontalScrollIndicator={false} accessibilityLabel={libelle} contentContainerStyle={styles.segments}>
      {options.map((o) => {
        const actif = o.cle === valeur;
        return (
          <View key={String(o.cle)} onLayout={(e: LayoutChangeEvent) => positions.current.set(o.cle, e.nativeEvent.layout.x)}>
            <Presse
              role="radio"
              selectionne={actif}
              onPress={() => onChange(o.cle)}
              style={[styles.segment, { backgroundColor: actif ? (plein ? c.accent : c.teinte100) : surTeinte ? c.surface : plein ? c.teinte50 : 'transparent' }]}>
              <Text
                style={{
                  fontFamily: actif ? police.fort : police.normal,
                  fontSize: 14,
                  color: actif ? (plein ? c.surAccent : c.accentEncre) : plein ? c.accentEncre : c.attenue,
                }}>
                {o.libelle}
              </Text>
            </Presse>
          </View>
        );
      })}
    </ScrollView>
  );
}

const CheminAnime = Animated.createAnimatedComponent(Path);

/**
 * Courbe d'évolution d'une moyenne (reprise de la v1 enrichie) : elle se trace à l'arrivée, un point marque
 * la dernière valeur. `points` en ordre chronologique.
 */
export function Courbe({ points, hauteur = 64, libelle }: { points: number[]; hauteur?: number; libelle: string }) {
  const c = useCouleurs();
  const reduit = useReducedMotion();
  const largeur = 320;
  const trace = useSharedValue(reduit ? 1 : 0);
  const { d, longueur, fin, milieu } = useMemo(() => {
    const min = Math.min(...points) - 0.3;
    const max = Math.max(...points) + 0.3;
    const xy = points.map((p, i) => [points.length === 1 ? largeur : (i / (points.length - 1)) * (largeur - 8) + 4, hauteur - 6 - ((p - min) / (max - min)) * (hauteur - 12)] as const);
    let l = 0;
    for (let i = 1; i < xy.length; i++) l += Math.hypot(xy[i]![0] - xy[i - 1]![0], xy[i]![1] - xy[i - 1]![1]);
    return { d: xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' '), longueur: Math.max(l, 1), fin: xy.at(-1)!, milieu: hauteur / 2 };
  }, [points, hauteur]);
  useEffect(() => {
    trace.value = 0;
    trace.value = reduit ? 1 : withDelay(200, withTiming(1, { duration: 1200, easing: Easing.bezier(0.4, 0, 0.2, 1) }));
  }, [d, reduit, trace]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: longueur * (1 - trace.value) }));
  if (points.length < 2) return null;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={libelle}>
      <Svg width="100%" height={hauteur} viewBox={`0 0 ${largeur} ${hauteur}`} preserveAspectRatio="none">
        <Line x1={0} y1={milieu} x2={largeur} y2={milieu} stroke={c.teinte100} strokeDasharray="3 5" />
        <CheminAnime d={d} fill="none" stroke={c.accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={longueur} animatedProps={props} />
        <Circle cx={fin[0]} cy={fin[1]} r={4} fill={c.accent} />
      </Svg>
    </View>
  );
}

/**
 * Curseur glissant (note, objectif) : le doigt règle la valeur au pas près, le pouce suit sur le thread UI.
 * Lecteur d'écran : élément « ajustable », balayer vers le haut ou le bas change la valeur d'un pas.
 */
export function Curseur({
  valeur,
  min,
  max,
  pas,
  onChange,
  libelle,
  texteValeur,
}: {
  valeur: number;
  min: number;
  max: number;
  pas: number;
  onChange: (v: number) => void;
  libelle: string;
  texteValeur: string;
}) {
  const c = useCouleurs();
  const largeur = useSharedValue(0);
  const r = useSharedValue((valeur - min) / (max - min));
  useEffect(() => {
    r.value = withTiming((valeur - min) / (max - min), { duration: 120 });
  }, [valeur, min, max, r]);
  const regler = (x: number) => {
    if (largeur.value <= 0) return;
    const brut = min + Math.min(Math.max(x / largeur.value, 0), 1) * (max - min);
    const v = Math.round(brut / pas) * pas;
    if (v !== valeur) onChange(Number(v.toFixed(2)));
  };
  const geste = usePanGesture({ runOnJS: true, onBegin: (e) => regler(e.x), onUpdate: (e) => regler(e.x) });
  const plein = useAnimatedStyle(() => ({ width: `${r.value * 100}%` }));
  const pouce = useAnimatedStyle(() => ({ left: `${r.value * 100}%` }));
  const pasA = (sens: 1 | -1) => onChange(Number(Math.min(Math.max(valeur + sens * pas, min), max).toFixed(2)));
  return (
    <GestureDetector gesture={geste}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={libelle}
        accessibilityValue={{ text: texteValeur }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => pasA(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        onLayout={(e) => (largeur.value = e.nativeEvent.layout.width)}
        style={styles.curseur}>
        <View style={[styles.piste, { backgroundColor: c.teinte100 }]}>
          <Animated.View style={[styles.piste, { backgroundColor: c.accent }, plein]} />
        </View>
        <Animated.View style={[styles.pouce, { backgroundColor: c.accent, borderColor: c.surface, shadowColor: c.ombre }, pouce]} />
      </View>
    </GestureDetector>
  );
}

/** Barre de titre : retour éventuel, titre, une action à droite. */
export function EnTete({ titre, retour, action }: { titre: string; retour?: boolean; action?: ReactNode }) {
  const c = useCouleurs();
  return (
    <Entree style={styles.entete}>
      {retour ? (
        <BoutonRond libelle="Retour" onPress={() => router.back()}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M15 18l-6-6 6-6" />
          </Svg>
        </BoutonRond>
      ) : null}
      <Texte variante="titre" role="heading" aria-level={1} numberOfLines={1} style={{ flex: 1 }}>
        {titre}
      </Texte>
      {action}
    </Entree>
  );
}

export function IconeReglages() {
  const c = useCouleurs();
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={3} />
      <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </Svg>
  );
}

export function Ecran({ children }: { children: ReactNode }) {
  const c = useCouleurs();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.fond }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Champ({ libelle, ...props }: TextInputProps & { libelle: string }) {
  const c = useCouleurs();
  return (
    <View style={{ gap: espace.s }}>
      <Texte variante="liste" moyen>
        {libelle}
      </Texte>
      <TextInput
        accessibilityLabel={libelle}
        placeholderTextColor={c.attenue}
        {...props}
        style={[styles.champ, { color: c.texte, borderColor: c.controle, backgroundColor: c.surface }, props.style]}
      />
    </View>
  );
}

/** Une section : titre (niveau 2), phrase d'aide, contenu ; une action courte à droite du titre. */
export function Section({ titre, aide, action, children, rang = 0 }: { titre: string; aide?: string; action?: ReactNode; children: ReactNode; rang?: number }) {
  return (
    <Entree rang={rang} style={{ gap: espace.s }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: espace.s }}>
        <View style={{ flex: 1 }}>
          <Texte variante="section" role="heading" aria-level={2}>
            {titre}
          </Texte>
          {aide ? (
            <Texte variante="petit" attenue>
              {aide}
            </Texte>
          ) : null}
        </View>
        {action}
      </View>
      {children}
    </Entree>
  );
}

const styles = StyleSheet.create({
  // 640 px au plus : sur tablette et dans l'aperçu web, la colonne reste celle d'un téléphone.
  contenu: { paddingHorizontal: espace.l, paddingBottom: espace.xxl, gap: espace.xl, width: '100%', maxWidth: 640, alignSelf: 'center' },
  entete: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: espace.m, paddingTop: espace.s },
  rond: { width: CIBLE, height: CIBLE, borderRadius: CIBLE / 2, alignItems: 'center', justifyContent: 'center' },
  bouton: { minHeight: 52, borderRadius: rayon.controle, paddingHorizontal: espace.xl, alignItems: 'center', justifyContent: 'center' },
  boutonTexte: { minHeight: CIBLE, justifyContent: 'center' },
  panneau: { borderWidth: 1, borderRadius: rayon.carte, paddingHorizontal: espace.l },
  ligne: { minHeight: 52, paddingVertical: espace.m, flexDirection: 'row', alignItems: 'center', gap: espace.m },
  pastille: { borderRadius: rayon.puce, paddingHorizontal: espace.s, paddingVertical: 3, alignSelf: 'flex-start' },
  point: { width: 10, height: 10 },
  segments: { gap: 6, paddingVertical: 2 },
  segment: { minHeight: 38, paddingHorizontal: 14, borderRadius: rayon.controle, justifyContent: 'center' },
  curseur: { height: 44, justifyContent: 'center' },
  piste: { height: 8, borderRadius: 4, overflow: 'hidden' },
  pouce: { position: 'absolute', top: 8, width: 28, height: 28, marginLeft: -14, borderRadius: 14, borderWidth: 4, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  champ: { minHeight: CIBLE + 4, borderWidth: 1, borderRadius: 14, paddingHorizontal: espace.m, fontFamily: police.normal, fontSize: taille.corps },
});
