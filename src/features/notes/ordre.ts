// Ordre d'affichage choisi par l'élève (matières, familles) et tris de la vue « par note ». Pur, testé.
import type { Note } from '@/domain/types';
import { lireNote } from '@/domain/moyennes/moteur';

export const TRIS = {
  matiere: 'Par matière',
  recentes: 'Les plus récentes',
  meilleures: 'Les meilleures d’abord',
  'moins-bonnes': 'Les moins bonnes d’abord',
} as const;
export type Tri = keyof typeof TRIS;

/** `liste` rangée selon `ordre` (des clés) ; ce que l'ordre ne connaît pas suit, dans son ordre d'origine. */
export function ordonner<T, K>(liste: readonly T[], ordre: readonly K[], cle: (x: T) => K): T[] {
  const rang = new Map(ordre.map((k, i) => [k, i]));
  return liste
    .map((x, i) => ({ x, i, r: rang.get(cle(x)) }))
    .sort((a, b) => (a.r ?? ordre.length + a.i) - (b.r ?? ordre.length + b.i))
    .map((e) => e.x);
}

/** Déplace `cle` d'un cran (sens -1 : vers le haut). Aux bords, rien ne bouge. */
export function deplacer<K>(ordre: readonly K[], cle: K, sens: -1 | 1): K[] {
  const o = [...ordre];
  const i = o.indexOf(cle);
  const j = i + sens;
  if (i < 0 || j < 0 || j >= o.length) return o;
  [o[i], o[j]] = [o[j]!, o[i]!];
  return o;
}

const sur20 = (n: Note) => {
  const v = lireNote(n.valeurBrute);
  return v === undefined || n.noteSur <= 0 ? undefined : (v * 20) / n.noteSur;
};

/**
 * Plus récente d'abord = ajoutée le plus récemment (date de saisie), comme « Nouvelles notes » et l'accueil : une
 * note d'un devoir d'octobre saisie hier passe devant ; à saisie égale, la date du devoir départage.
 */
export const parRecence = (a: Note, b: Note) => (b.dateSaisie ?? b.date).localeCompare(a.dateSaisie ?? a.date) || b.date.localeCompare(a.date);

/** Tri à plat (récentes, meilleures, moins bonnes) ; les notes sans valeur (Abs, Disp…) toujours à la fin. */
export function trierNotes(notes: readonly Note[], tri: Exclude<Tri, 'matiere'>): Note[] {
  const recentes = parRecence;
  if (tri === 'recentes') return [...notes].sort(recentes);
  const sens = tri === 'meilleures' ? -1 : 1;
  return [...notes].sort((a, b) => {
    const va = sur20(a);
    const vb = sur20(b);
    if (va === undefined || vb === undefined) return va === vb ? recentes(a, b) : va === undefined ? 1 : -1;
    return (va - vb) * sens || recentes(a, b);
  });
}
