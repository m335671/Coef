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
    date: p.fin, // en fin de période : la courbe d'évolution finit sur la simulation
    valeurBrute: String(h.valeur),
    noteSur: h.noteSur,
    coef: h.coef,
    nonSignificative: false,
  };
}

/**
 * Retouche d'une vraie note dans la simulation : une autre valeur (sur son barème), et/ou le choix de la compter
 * (`compte: false` lui donne un coefficient 0 ; `compte: true` la compte même si ED la dit non significative).
 */
export type Retouche = { noteId: string; valeur?: number; compte?: boolean };

/** Les notes réelles (retouchées) plus les notes hypothétiques, prêtes pour le moteur. */
export function avecHypotheses(p: Periode, notes: Note[], hypotheses: NoteHypothetique[], retouches: Retouche[] = []): Note[] {
  const parNote = new Map(retouches.map((r) => [r.noteId, r]));
  const reelles = notes.flatMap((n) => {
    const r = parNote.get(n.id);
    if (!r) return [n];
    return [
      {
        ...n,
        ...(r.valeur !== undefined ? { valeurBrute: String(r.valeur).replace('.', ',') } : {}),
        // Non comptée : coefficient 0 plutôt que retirée, pour qu'elle reste visible (« coef 0 ») dans les listes.
        ...(r.compte === false ? { coef: 0 } : r.compte ? { nonSignificative: false } : {}),
      },
    ];
  });
  return [...reelles, ...hypotheses.map((h, i) => versNote(p, h, i))];
}

/** Moyennes de la période si l'on ajoute ces notes. */
export function simuler(p: Periode, notes: Note[], periodes: Periode[], hypotheses: NoteHypothetique[], options?: Options): Resultat {
  return calculer(p, avecHypotheses(p, notes, hypotheses), periodes, options);
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
