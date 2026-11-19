// Ce que montre l'écran des notes, calculé depuis l'instantané stocké. Pur : testé sans React Native.
import { type Calibration, calibrer } from '@/domain/moyennes/calibration';
import { calculer, notesDeLaPeriode, type Resultat, type ResultatMatiere } from '@/domain/moyennes/moteur';
import type { DonneesNotes, Note, Periode } from '@/domain/types';
import type { Instantane } from '@/storage/base';
import { jour } from '@/ui/format';

/** Périodes proposées : celles où l'élève a des matières, examens blancs compris s'ils ont des notes. */
export function periodesAffichees(d: DonneesNotes): Periode[] {
  return d.periodes.filter((p) => p.matieres.length > 0 && (p.type !== 'examen' || notesDeLaPeriode(p, d.notes, d.periodes).length > 0));
}

/** Le trimestre en cours ; à défaut le dernier qui a des notes ; à défaut le premier. */
export function periodeParDefaut(d: DonneesNotes, aujourdhui: string): Periode | undefined {
  const ps = periodesAffichees(d);
  const enCours = ps.find((p) => p.type === 'trimestre' && p.debut <= aujourdhui && aujourdhui <= p.fin);
  const avecNotes = [...ps].reverse().find((p) => p.type === 'trimestre' && notesDeLaPeriode(p, d.notes, d.periodes).length > 0);
  return enCours ?? avecNotes ?? ps[0];
}

export type LigneMatiere = { matiere: ResultatMatiere; sur20: number[] };

export type VueNotes = {
  periode: Periode;
  resultat: Resultat;
  calibration: Calibration;
  /** Écart de moyenne générale prévue depuis la dernière synchro qui a apporté du nouveau. */
  ecart?: number;
  depuis?: string;
  nouvelles: Note[];
  /** Notes saisies après le dernier calcul ED : la moyenne prévue les compte, l'officielle pas encore. */
  enAvance: number;
  matieres: LigneMatiere[];
};

const comptees = (m: ResultatMatiere) => [...m.notes, ...m.sousMatieres.flatMap((s) => s.notes)].filter((n) => !n.exclue).map((n) => n.sur20!);

export function vueNotes(i: Instantane, code: string): VueNotes | undefined {
  const d = i.donnees;
  const periode = d.periodes.find((p) => p.code === code);
  if (!periode) return undefined;
  const resultat = calculer(periode, d.notes, d.periodes, { parametrage: d.parametrage });
  const { retenue } = calibrer(periode, d.notes, d.periodes, d.parametrage);
  const avant = i.nouveautes.generalesAvant[code];
  const nouvellesIds = new Set(i.nouveautes.noteIds);
  const dansPeriode = new Set(notesDeLaPeriode(periode, d.notes, d.periodes).map((n) => n.id));
  return {
    periode,
    resultat,
    calibration: retenue,
    ecart: avant !== undefined && resultat.generale !== undefined ? resultat.generale - avant : undefined,
    depuis: avant !== undefined ? i.nouveautes.date : undefined,
    nouvelles: d.notes.filter((n) => nouvellesIds.has(n.id) && dansPeriode.has(n.id)),
    enAvance: periode.dateCalcul
      ? d.notes.filter((n) => dansPeriode.has(n.id) && n.dateSaisie && n.dateSaisie >= periode.dateCalcul!.slice(0, 10)).length
      : 0,
    matieres: resultat.matieres.map((matiere) => ({ matiere, sur20: comptees(matiere) })),
  };
}

/**
 * Évolution de la moyenne prévue au fil de la période : générale (ou d'une matière) recalculée à chaque date
 * où une note apparaît, en ne gardant que les notes de cette date et d'avant. Pour la courbe.
 */
export function evolution(d: DonneesNotes, periode: Periode, matiere?: string): { date: string; moyenne: number }[] {
  const notes = notesDeLaPeriode(periode, d.notes, d.periodes);
  const dates = [...new Set(notes.map((n) => n.date))].sort();
  const points: { date: string; moyenne: number }[] = [];
  for (const date of dates) {
    const r = calculer(periode, notes.filter((n) => n.date <= date), d.periodes, { parametrage: d.parametrage });
    const m = matiere === undefined ? r.generale : r.matieres.find((x) => x.code === matiere)?.moyenne;
    if (m !== undefined) points.push({ date, moyenne: m });
  }
  return points;
}

export type PointCourbe = { date: string; moyenne: number };

/**
 * Évolutions datées en une passe : la générale à chaque date où une note apparaît, et chaque matière aux dates
 * où elle a reçu une note. Pour l'écran Courbes et les mini-courbes.
 */
export function evolutions(d: DonneesNotes, periode: Periode): { generale: PointCourbe[]; matieres: Record<string, PointCourbe[]> } {
  const notes = notesDeLaPeriode(periode, d.notes, d.periodes);
  const generale: PointCourbe[] = [];
  const matieres: Record<string, PointCourbe[]> = {};
  for (const date of [...new Set(notes.map((n) => n.date))].sort()) {
    const touchees = new Set(notes.filter((n) => n.date === date).map((n) => n.matiereCode));
    const r = calculer(periode, notes.filter((n) => n.date <= date), d.periodes, { parametrage: d.parametrage });
    if (r.generale !== undefined) generale.push({ date, moyenne: r.generale });
    for (const m of r.matieres) if (m.moyenne !== undefined && touchees.has(m.code)) (matieres[m.code] ??= []).push({ date, moyenne: m.moyenne });
  }
  return { generale, matieres };
}

/** Évolution de chaque matière (mini-courbes) : un point par date où la matière a reçu une note. */
export function evolutionsMatieres(d: DonneesNotes, periode: Periode): Record<string, number[]> {
  return Object.fromEntries(Object.entries(evolutions(d, periode).matieres).map(([code, pts]) => [code, pts.map((x) => x.moyenne)]));
}

/** Périodes du menu, regroupées : trimestres et année, relevés, examens blancs. */
export function groupesPeriodes(periodes: Periode[]) {
  const de = (types: Periode['type'][]) =>
    periodes
      .filter((p) => types.includes(p.type))
      .map((p) => ({
        cle: p.code,
        libelle: p.libelle,
        aide: `${jour(p.debut)} – ${jour(p.fin)}`,
      }));
  return [
    { titre: 'Trimestres', options: de(['trimestre', 'annee']) },
    { titre: 'Relevés', options: de(['releve']) },
    { titre: 'Examens blancs', options: de(['examen']) },
  ].filter((g) => g.options.length > 0);
}
