// Quand une vraie note arrive dans une matière où une note était simulée, elle prend sa place : la note simulée
// sort de la simulation et reste dans l'historique « remplacée par l'officielle ». Pur : testé sans React Native.
// Appariement : même élève, même période (par date), même matière (et même sous-matière si la simulée en avait
// une) ; la plus ancienne simulée de la matière part la première. Une note non chiffrée (Abs, Disp…) ne remplace rien.
import { lireNote, notesDeLaPeriode } from '@/domain/moyennes/moteur';
import type { NoteHypothetique } from '@/domain/moyennes/simulateur';
import type { DonneesNotes, Note } from '@/domain/types';

export type Remplacement = {
  /** Clé de simulation « élève:période ». */
  cle: string;
  hypothese: NoteHypothetique;
  noteId: string;
  /** Date ISO du remplacement. */
  date: string;
};

/** Historique gardé : assez pour l'écran, pas de croissance sans fin. */
const MAX_HISTORIQUE = 50;

export function remplacerSimulees(
  sim: { notes: Record<string, NoteHypothetique[]>; remplacees?: Remplacement[] },
  eleveId: string,
  nouvelles: Note[],
  d: DonneesNotes,
  date: string,
): { notes: Record<string, NoteHypothetique[]>; remplacees: Remplacement[]; nouveaux: Remplacement[] } {
  const notes = { ...sim.notes };
  const nouveaux: Remplacement[] = [];
  const chiffrees = [...nouvelles].filter((n) => !n.nonSignificative && lireNote(n.valeurBrute) !== undefined).sort((a, b) => a.date.localeCompare(b.date));
  for (const cle of Object.keys(notes)) {
    const [eleve, code] = cle.split(':');
    const p = d.periodes.find((x) => x.code === code);
    if (eleve !== eleveId || !p) continue;
    const dans = new Set(notesDeLaPeriode(p, chiffrees, d.periodes).map((n) => n.id));
    for (const n of chiffrees.filter((x) => dans.has(x.id))) {
      const liste = notes[cle]!;
      const i = liste.findIndex((h) => h.matiereCode === n.matiereCode && (!h.sousMatiereCode || h.sousMatiereCode === n.sousMatiereCode));
      if (i < 0) continue;
      nouveaux.push({ cle, hypothese: liste[i]!, noteId: n.id, date });
      notes[cle] = liste.filter((_, j) => j !== i);
    }
  }
  return { notes, remplacees: [...nouveaux, ...(sim.remplacees ?? [])].slice(0, MAX_HISTORIQUE), nouveaux };
}

/** Texte de la notification : la note simulée est arrivée pour de vrai. */
export function annonceRemplacement(
  rs: Remplacement[],
  d: DonneesNotes,
  libelle: (n: Note) => string,
  prenom?: string,
): { titre: string; texte: string } | undefined {
  // Une même note peut remplacer dans plusieurs périodes (trimestre, année) : on l'annonce une fois.
  const uniques = [...new Map(rs.map((r) => [r.noteId, r])).values()];
  const pour = prenom ? `${prenom} : ` : '';
  const lignes = uniques.flatMap((r) => {
    const n = d.notes.find((x) => x.id === r.noteId);
    return n ? [`${libelle(n)} ${n.valeurBrute.trim()}/${n.noteSur} (simulée : ${String(r.hypothese.valeur).replace('.', ',')}/${r.hypothese.noteSur})`] : [];
  });
  if (lignes.length === 0) return undefined;
  return {
    titre: `${pour}${lignes.length === 1 ? 'Ta note simulée est arrivée' : `${lignes.length} notes simulées sont arrivées`}`,
    texte: `${lignes.join(' · ')}. La vraie note remplace la simulée.`,
  };
}
