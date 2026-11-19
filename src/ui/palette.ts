// Palettes générées depuis une couleur (choisie dans Réglages ou celle de Material You). Les tons HCT de
// Material 3 fixent la clarté de chaque rôle, donc le contraste, quelle que soit la teinte de départ.
import { argbFromHex, hexFromArgb, Hct, TonalPalette } from '@material/material-color-utilities';

import type { Couleurs } from './theme';

export type CouleursMatiere = { fond: string; encre: string; trait: string };

const ton = (p: TonalPalette, t: number) => hexFromArgb(p.tone(t));

function palettes(graine: string) {
  const hct = Hct.fromInt(argbFromHex(graine));
  return {
    // Chroma minimale : une couleur presque grise donne quand même un accent lisible.
    p: TonalPalette.fromHueAndChroma(hct.hue, Math.max(hct.chroma, 36)),
    n: TonalPalette.fromHueAndChroma(hct.hue, 4),
    nv: TonalPalette.fromHueAndChroma(hct.hue, 8),
    // Surfaces teintées discrètes, calées sur le thème Coef d'origine (chroma 9 à 27) : une couleur vive ne
    // doit pas transformer les cartes en aplats saturés.
    t50: TonalPalette.fromHueAndChroma(hct.hue, 12),
    t100: TonalPalette.fromHueAndChroma(hct.hue, 24),
  };
}

const cache = new Map<string, unknown>();
function memo<T>(cle: string, calcul: () => T): T {
  if (!cache.has(cle)) cache.set(cle, calcul());
  return cache.get(cle) as T;
}

/** Jeu de couleurs complet pour une couleur de départ. L'orange (simulation) et le violet (objectif) restent fixes. */
export function couleursDepuis(graine: string, sombre: boolean, base: Couleurs): Couleurs {
  return memo(`app|${graine}|${sombre}`, () => {
    const { p, n, nv, t50, t100 } = palettes(graine);
    return sombre
      ? {
          ...base,
          fond: ton(n, 6),
          surface: ton(n, 10),
          teinte50: ton(t50, 13),
          teinte100: ton(t100, 30),
          bord: ton(nv, 20),
          filet: ton(nv, 15),
          controle: ton(nv, 35),
          texte: ton(n, 95),
          attenue: ton(nv, 72),
          accent: ton(p, 80),
          accentEncre: ton(p, 90),
          surAccent: ton(p, 20),
          positif: ton(p, 80),
        }
      : {
          ...base,
          fond: ton(n, 99),
          surface: ton(n, 99),
          teinte50: ton(t50, 98),
          teinte100: ton(t100, 95),
          bord: ton(nv, 90),
          filet: ton(nv, 95),
          controle: ton(nv, 80),
          texte: ton(n, 10),
          attenue: ton(nv, 40),
          accent: ton(p, 40),
          accentEncre: ton(p, 30),
          surAccent: ton(p, 100),
          positif: ton(p, 40),
        };
  });
}

/** Couleurs d'une matière dont l'élève a choisi la teinte. */
export function matiereDepuis(graine: string, sombre: boolean): CouleursMatiere {
  return memo(`matiere|${graine}|${sombre}`, () => {
    const { p } = palettes(graine);
    return sombre ? { fond: ton(p, 17), encre: ton(p, 88), trait: ton(p, 70) } : { fond: ton(p, 94), encre: ton(p, 25), trait: ton(p, 60) };
  });
}
