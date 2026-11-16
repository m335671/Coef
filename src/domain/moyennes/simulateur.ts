// Simulateur : notes hypothétiques et « quelle note pour atteindre X ? ».
import type { Note, Periode } from '../types';
import { calculer, type Options, type Resultat } from './moteur';

export type NoteHypothetique = { matiereCode: string; sousMatiereCode?: string; valeur: number; noteSur: number; coef: number };

function versNote(p: Periode, h: NoteHypothetique, i: number): Note {
  return {
    id: `hypothese-${i}`,
    periodeCode: p.code,
    matiereCode: h.matiereCode,
    sousMatiereCode: h.sousMatiereCode,
    devoir: 'Note hypothétique',
    date: p.debut,
    valeurBrute: String(h.valeur),
    noteSur: h.noteSur,
    coef: h.coef,
    nonSignificative: false,
  };
}

/** Moyennes de la période si l'on ajoute ces notes. */
export function simuler(p: Periode, notes: Note[], periodes: Periode[], hypotheses: NoteHypothetique[], options?: Options): Resultat {
  return calculer(p, [...notes, ...hypotheses.map((h, i) => versNote(p, h, i))], periodes, options);
}

export type Cible = { portee: 'generale' } | { portee: 'matiere'; code: string };

function lire(r: Resultat, cible: Cible): number | undefined {
  if (cible.portee === 'generale') return r.generale;
  return r.matieres.find((m) => m.code === cible.code)?.moyenne;
}

/**
 * Plus petite note (au centième, sur noteSur) qui amène la cible à `objectif`, ou undefined si même la note
 * maximale n'y suffit pas. La moyenne croît avec la note : on cherche par dichotomie.
 */
export function noteNecessaire(
  p: Periode,
  notes: Note[],
  periodes: Periode[],
  hypothese: Omit<NoteHypothetique, 'valeur'>,
  cible: Cible,
  objectif: number,
  options?: Options,
): number | undefined {
  const avec = (valeur: number) => lire(simuler(p, notes, periodes, [{ ...hypothese, valeur }], options), cible) ?? -Infinity;
  if (avec(hypothese.noteSur) < objectif) return undefined;
  // Bornes en centièmes de point : la réponse est une note saisissable.
  let bas = 0;
  let haut = Math.round(hypothese.noteSur * 100);
  if (avec(0) >= objectif) return 0;
  while (haut - bas > 1) {
    const milieu = Math.floor((bas + haut) / 2);
    if (avec(milieu / 100) >= objectif) haut = milieu;
    else bas = milieu;
  }
  return haut / 100;
}
