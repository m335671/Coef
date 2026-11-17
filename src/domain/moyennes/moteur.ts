// Moteur de moyenne : fonction pure, notes + structure de la période + paramétrage → moyennes et détail.
// Règles vérifiées sur une classe réelle (docs/API-ED.md, « Règles de calcul vérifiées ») ; précision
// complète partout, sauf là où ED arrondit lui-même (moyennes de matière avant agrégation).
import type { MatierePeriode, Note, Parametrage, Periode, StatsClasse } from '../types';

/**
 * Variantes de calcul, liste fermée. « ed » est la règle vérifiée ; les autres servent à la calibration
 * quand un établissement calcule autrement.
 */
export const VARIANTES = {
  ed: 'Matière parente = moyenne pondérée des moyennes de sous-matières arrondies au centième (vérifié).',
  'sous-matieres-exactes': 'Matière parente = moyenne pondérée des moyennes de sous-matières non arrondies.',
  'parente-sur-notes': 'Matière parente = moyenne pondérée de toutes les notes de ses sous-matières.',
} as const;
export type Variante = keyof typeof VARIANTES;

export type Exclusion = 'non-significative' | 'non-numerique' | 'saisie-apres-calcul';

export type DetailNote = { id: string; sur20?: number; coef: number; exclue?: Exclusion };

export type ResultatMatiere = {
  code: string;
  sousCode?: string;
  libelle: string;
  coef: number;
  /** Moyenne prévue sur 20, précision complète ; undefined si aucune note comptée. */
  moyenne?: number;
  officielle?: number;
  classe?: StatsClasse;
  notes: DetailNote[];
  sousMatieres: ResultatMatiere[];
};

export type Resultat = { generale?: number; officielleGenerale?: number; matieres: ResultatMatiere[] };

export type Options = {
  variante?: Variante;
  parametrage?: Parametrage;
  /** Ignore les notes saisies ce jour-là ou après (« AAAA-MM-JJ… »), pour comparer à un calcul ED daté. */
  saisiesAvant?: string;
};

const NUMERIQUE = /^\d+(?:[.,]\d+)?$/;

/** Valeur d'une note, ou undefined pour les lettres et mentions (Abs, Disp, NE, EA…). */
export function lireNote(brute: string): number | undefined {
  const v = brute.trim();
  return NUMERIQUE.test(v) ? Number(v.replace(',', '.')) : undefined;
}

/** Arrondi au centième, demi vers le haut (16,125 → 16,13), comme ED. Le 1e-7 absorbe l'erreur binaire. */
export function arrondi(x: number): number {
  return Math.round(x * 100 + 1e-7) / 100;
}

/**
 * Notes d'une période. ED marque toutes les notes du trimestre, relevés compris, avec le code du trimestre :
 * on rattache donc par date. Hypothèse : une note d'examen blanc porte le code de son examen et n'appartient qu'à lui.
 */
export function notesDeLaPeriode(p: Periode, notes: Note[], periodes: Periode[]): Note[] {
  const examens = new Set(periodes.filter((x) => x.type === 'examen').map((x) => x.code));
  if (p.type === 'examen') return notes.filter((n) => n.periodeCode === p.code);
  return notes.filter((n) => !examens.has(n.periodeCode) && n.date >= p.debut && n.date <= p.fin);
}

type Somme = { total: number; poids: number };

const moyenneDe = (s: Somme): number | undefined => (s.poids > 0 ? s.total / s.poids : undefined);

function ajouter(s: Somme, valeur: number, poids: number): void {
  s.total += valeur * poids;
  s.poids += poids;
}

function detail(n: Note, saisiesAvant?: string): DetailNote {
  const d: DetailNote = { id: n.id, coef: n.coef };
  const v = lireNote(n.valeurBrute);
  if (v !== undefined && n.noteSur > 0) d.sur20 = (v * 20) / n.noteSur;
  if (n.nonSignificative) d.exclue = 'non-significative';
  else if (d.sur20 === undefined) d.exclue = 'non-numerique';
  else if (saisiesAvant && n.dateSaisie && n.dateSaisie >= saisiesAvant.slice(0, 10)) d.exclue = 'saisie-apres-calcul';
  return d;
}

function sommeNotes(notes: DetailNote[]): Somme {
  const s = { total: 0, poids: 0 };
  for (const n of notes) if (!n.exclue) ajouter(s, n.sur20!, n.coef);
  return s;
}

function ligne(m: MatierePeriode, notes: DetailNote[]): ResultatMatiere {
  return { ...m, moyenne: moyenneDe(sommeNotes(notes)), notes, sousMatieres: [] };
}

/** Moyennes d'une période : par sous-matière, matière et générale, avec le détail de chaque note. */
export function calculer(p: Periode, notes: Note[], periodes: Periode[], options: Options = {}): Resultat {
  const variante = options.variante ?? 'ed';
  const details = notesDeLaPeriode(p, notes, periodes).map((n) => ({ n, d: detail(n, options.saisiesAvant) }));
  const notesDe = (code: string, sousCode?: string) =>
    details.filter(({ n }) => n.matiereCode === code && (n.sousMatiereCode || undefined) === sousCode).map(({ d }) => d);

  const matieres = p.matieres
    .filter((m) => !m.sousCode)
    .map((m) => {
      const parente = ligne(m, notesDe(m.code));
      parente.sousMatieres = p.matieres.filter((s) => s.code === m.code && s.sousCode).map((s) => ligne(s, notesDe(s.code, s.sousCode)));
      if (parente.sousMatieres.length > 0) parente.moyenne = moyenneParente(parente, variante);
      return parente;
    });

  const ponderer = options.parametrage?.moyenneCoefMatiere ?? true;
  const g = { total: 0, poids: 0 };
  for (const m of matieres) if (m.moyenne !== undefined) ajouter(g, arrondi(m.moyenne), ponderer ? m.coef : 1);
  return { generale: moyenneDe(g), officielleGenerale: p.officielleGenerale, matieres };
}

/**
 * Hypothèse : les notes saisies directement sur la matière parente comptent comme une sous-matière de coef 1
 * (aucun cas réel vu).
 */
function moyenneParente(parente: ResultatMatiere, variante: Variante): number | undefined {
  const propres = { ...parente, coef: 1 };
  const parties = parente.notes.length > 0 ? [...parente.sousMatieres, propres] : parente.sousMatieres;
  const s = { total: 0, poids: 0 };
  if (variante === 'parente-sur-notes') {
    for (const p of parties) {
      const t = sommeNotes(p.notes);
      s.total += t.total;
      s.poids += t.poids;
    }
  } else {
    for (const p of parties)
      if (p.moyenne !== undefined) ajouter(s, variante === 'ed' ? arrondi(p.moyenne) : p.moyenne, p.coef);
  }
  return moyenneDe(s);
}
