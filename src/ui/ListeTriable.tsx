// Liste qu'on réordonne au doigt, comme une playlist : on attrape la poignée ≡, la ligne suit le doigt, les autres
// s'écartent pour lui faire place ; on lâche, elle se pose. Lecteur d'écran : la poignée propose « monter » et
// « descendre ».
//
// Les lignes gardent leur ordre React pendant tout le geste ; leur place à l'écran vient d'un ordre tenu sur le
// thread UI (positions absolues). Ainsi le nouvel ordre s'affiche sans attendre React, et sans saut au moment où
// l'écran parent enregistre ce nouvel ordre.
import { type ReactNode, useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { runOnJS, type SharedValue, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useCouleurs } from './theme';

type Partage = {
  ordre: SharedValue<string[]>;
  hauteurs: SharedValue<Record<string, number>>;
  actif: SharedValue<string>;
  depart: SharedValue<number>;
  dy: SharedValue<number>;
  pret: SharedValue<number>;
  gap: number;
};

/** Haut d'une ligne dans un ordre donné (somme des hauteurs de celles qui la précèdent). */
function haut(ordre: string[], h: Record<string, number>, k: string, gap: number): number {
  'worklet';
  let y = 0;
  for (const c of ordre) {
    if (c === k) return y;
    y += (h[c] ?? 0) + gap;
  }
  return y;
}

export function ListeTriable<T>({
  items,
  cle,
  nom,
  rendu,
  onOrdre,
  gap = 0,
}: {
  items: T[];
  cle: (x: T) => string;
  /** Pour le lecteur d'écran : « Monter Philosophie ». */
  nom: (x: T) => string;
  /** La ligne, avec la poignée à placer où l'on veut (à droite, d'habitude). */
  rendu: (x: T, poignee: ReactNode) => ReactNode;
  onOrdre: (cles: string[]) => void;
  gap?: number;
}) {
  const cles = items.map(cle);
  const signature = cles.join('|');
  const [mesures, setMesures] = useState<Record<string, number>>({});
  const toutMesure = cles.every((k) => mesures[k] !== undefined);
  const p: Partage = {
    ordre: useSharedValue(cles),
    hauteurs: useSharedValue<Record<string, number>>({}),
    actif: useSharedValue(''),
    depart: useSharedValue(0),
    dy: useSharedValue(0),
    pret: useSharedValue(0),
    gap,
  };
  const { ordre, hauteurs, pret } = p;
  useEffect(() => {
    ordre.set(signature ? signature.split('|') : []);
  }, [signature, ordre]);
  useEffect(() => {
    hauteurs.set(mesures);
  }, [mesures, hauteurs]);
  // Une fois tout mesuré, on passe en positions absolues ; les déplacements ne s'animent qu'après ce premier placement.
  useEffect(() => {
    if (!toutMesure) return;
    const t = setTimeout(() => pret.set(1), 50);
    return () => clearTimeout(t);
  }, [toutMesure, pret]);
  const total = cles.reduce((s, k) => s + (mesures[k] ?? 0), 0) + gap * Math.max(cles.length - 1, 0);

  const deplacerA11y = (k: string, sens: -1 | 1) => {
    const o = [...cles];
    const i = o.indexOf(k);
    const j = i + sens;
    if (j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j]!, o[i]!];
    ordre.set(o);
    onOrdre(o);
  };

  return (
    <View style={toutMesure ? { height: total } : { gap }}>
      {items.map((x) => {
        const k = cle(x);
        return (
          <Rangee
            key={k}
            k={k}
            p={p}
            absolu={toutMesure}
            nom={nom(x)}
            onMesure={(h) => setMesures((m) => (m[k] === h ? m : { ...m, [k]: h }))}
            onLache={onOrdre}
            onA11y={(sens) => deplacerA11y(k, sens)}>
            {(poignee) => rendu(x, poignee)}
          </Rangee>
        );
      })}
    </View>
  );
}

function Rangee({
  k,
  p,
  absolu,
  nom,
  onMesure,
  onLache,
  onA11y,
  children,
}: {
  k: string;
  p: Partage;
  absolu: boolean;
  nom: string;
  onMesure: (h: number) => void;
  onLache: (ordre: string[]) => void;
  onA11y: (sens: -1 | 1) => void;
  children: (poignee: ReactNode) => ReactNode;
}) {
  const c = useCouleurs();
  const { ordre, hauteurs, actif, depart, dy, pret, gap } = p;

  const glisser = usePanGesture({
    minDistance: 0,
    shouldCancelWhenOutside: false,
    onActivate: () => {
      'worklet';
      actif.set(k);
      depart.set(haut(ordre.get(), hauteurs.get(), k, gap));
      dy.set(0);
    },
    onUpdate: (e) => {
      'worklet';
      dy.set(e.translationY);
      // Nouvelle place : le nombre de lignes dont le milieu est au-dessus du milieu de la ligne tenue.
      const h = hauteurs.get();
      const centre = depart.get() + e.translationY + (h[k] ?? 0) / 2;
      const autres = ordre.get().filter((x) => x !== k);
      let y = 0;
      let place = 0;
      for (const x of autres) {
        if (y + (h[x] ?? 0) / 2 < centre) place++;
        y += (h[x] ?? 0) + gap;
      }
      if (ordre.get().indexOf(k) !== place) {
        autres.splice(place, 0, k);
        ordre.set(autres);
      }
    },
    onDeactivate: () => {
      'worklet';
      // La ligne repart de là où le doigt l'a laissée vers sa place (le style la reprend au ressort).
      depart.set(depart.get() + dy.get());
      dy.set(0);
      actif.set('');
      runOnJS(onLache)(ordre.get());
    },
  });

  const style = useAnimatedStyle(() => {
    if (!absolu) return {};
    const tenue = actif.get() === k;
    const y = tenue ? depart.get() + dy.get() : haut(ordre.get(), hauteurs.get(), k, gap);
    const anime = pret.get() === 1 && !tenue;
    return {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      zIndex: tenue ? 10 : 0,
      elevation: tenue ? 8 : 0,
      shadowOpacity: tenue ? 0.18 : 0,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      transform: [{ translateY: anime ? withSpring(y, { damping: 22, stiffness: 260 }) : y }, { scale: withTiming(tenue ? 1.03 : 1, { duration: 140 }) }],
    };
  });

  const poignee = (
    <GestureDetector gesture={glisser}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Déplacer ${nom}`}
        accessibilityHint="Glisser vers le haut ou le bas"
        accessibilityActions={[
          { name: 'increment', label: 'Descendre' },
          { name: 'decrement', label: 'Monter' },
        ]}
        onAccessibilityAction={(e) => onA11y(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        hitSlop={8}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c.attenue} strokeWidth={2.2} strokeLinecap="round">
          <Path d="M5 8h14M5 12h14M5 16h14" />
        </Svg>
      </View>
    </GestureDetector>
  );

  return (
    <Animated.View style={style} onLayout={(e) => onMesure(e.nativeEvent.layout.height)}>
      {children(poignee)}
    </Animated.View>
  );
}
