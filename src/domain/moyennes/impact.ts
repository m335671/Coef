// Ce que pèse une note ou une matière dans la moyenne générale, et quelles matières font le plus bouger
// la générale vers un objectif. Fonctions pures, au-dessus du moteur.
import type { Note, Periode } from '../types';
import { calculer, type Options } from './moteur';
import { noteNecessaire } from './simulateur';

const diff = (a?: number, b?: number) => (a === undefined || b === undefined ? undefined : a - b);

export type AvantApres = { sans?: number; avec?: number };

/** Impact d'une note : moyennes avec elle moins moyennes sans elle (générale et sa matière), et les deux valeurs. */
export function impactNote(
  p: Periode,
  notes: Note[],
  periodes: Periode[],
  noteId: string,
  options?: Options,
): { generale?: number; matiere?: number; valeurs?: { generale: AvantApres; matiere: AvantApres } } {
  const note = notes.find((n) => n.id === noteId);
  if (!note) return {};
  const avec = calculer(p, notes, periodes, options);
  const sans = calculer(
    p,
    notes.filter((n) => n.id !== noteId),
    periodes,
    options,
  );
  const m = (r: typeof avec) => r.matieres.find((x) => x.code === note.matiereCode)?.moyenne;
  return {
    generale: diff(avec.generale, sans.generale),
    matiere: diff(m(avec), m(sans)),
    valeurs: { generale: { sans: sans.generale, avec: avec.generale }, matiere: { sans: m(sans), avec: m(avec) } },
  };
}

/** Impact d'une matière : générale avec elle moins générale sans aucune de ses notes. */
export function impactMatiere(p: Periode, notes: Note[], periodes: Periode[], code: string, options?: Options): number | undefined {
  const avec = calculer(p, notes, periodes, options).generale;
  const sans = calculer(
    p,
    notes.filter((n) => n.matiereCode !== code),
    periodes,
    options,
  ).generale;
  return diff(avec, sans);
}

export type Levier = {
  code: string;
  libelle: string;
  coef: number;
  moyenne?: number;
  /** Ce que gagne la générale quand la moyenne de la matière gagne un point. */
  parPoint: number;
  /** Note (sur 20, coef 1) qui suffirait seule à atteindre l'objectif ; undefined : impossible avec une note. */
  noteSeule?: number;
  /** Moyenne qu'il faudrait dans cette matière seule (les autres inchangées) ; au-delà de 20 : hors d'atteinte. */
  moyenneVisee?: number;
};

/**
 * Pour une moyenne générale visée : chaque matière, ce qu'un point y rapporte et la note qui suffirait seule.
 * Triées de la plus accessible à la moins accessible ; les impossibles à la fin, par poids décroissant.
 */
export function leviers(p: Periode, notes: Note[], periodes: Periode[], objectif: number, options?: Options): Levier[] {
  const r = calculer(p, notes, periodes, options);
  const ponderer = options?.parametrage?.moyenneCoefMatiere ?? true;
  const actives = r.matieres.filter((m) => m.moyenne !== undefined);
  const total = actives.reduce((s, m) => s + (ponderer ? m.coef : 1), 0);
  const liste = r.matieres
    .filter((m) => m.coef > 0)
    .map((m): Levier => ({
      code: m.code,
      libelle: m.libelle,
      coef: m.coef,
      moyenne: m.moyenne,
      parPoint: total > 0 && m.moyenne !== undefined ? (ponderer ? m.coef : 1) / total : 0,
      moyenneVisee:
        m.moyenne !== undefined && r.generale !== undefined && total > 0 ? m.moyenne + (objectif - r.generale) / ((ponderer ? m.coef : 1) / total) : undefined,
      noteSeule: noteNecessaire(p, notes, periodes, { matiereCode: m.code, noteSur: 20, coef: 1 }, { portee: 'generale' }, objectif, options),
    }));
  // Ordre : d'abord ce qu'une seule note règle (la plus basse en tête), puis ce qu'une moyenne de matière
  // atteignable règle (le plus petit effort en tête), puis le reste, les matières les plus lourdes d'abord.
  const effort = (l: Levier) => (l.moyenneVisee !== undefined && l.moyenneVisee <= 20 && l.moyenne !== undefined ? l.moyenneVisee - l.moyenne : Infinity);
  return liste.sort((a, b) => {
    if (a.noteSeule !== undefined || b.noteSeule !== undefined) {
      if (a.noteSeule === undefined) return 1;
      if (b.noteSeule === undefined) return -1;
      return a.noteSeule - b.noteSeule;
    }
    const ea = effort(a);
    const eb = effort(b);
    if (ea !== eb) return ea === Infinity ? 1 : eb === Infinity ? -1 : ea - eb;
    return b.parPoint - a.parPoint;
  });
}
