// Notes simulées, partagées entre l'écran Simulation et l'écran Notes. Gardées en mémoire tant que l'app
// tourne ; « Enregistrer » les range dans la base chiffrée (préférences) pour les retrouver au prochain lancement.
// Une vraie note qui arrive remplace la simulée de sa matière (remplacement.ts), en mémoire comme en base.
import { create } from 'zustand';

import { MODE_DEMO } from '@/demo';
import type { NoteHypothetique } from '@/domain/moyennes/simulateur';
import type { DonneesNotes, Note } from '@/domain/types';
import { ecrirePreference, lirePreference } from '@/storage/base';

import { type Remplacement, remplacerSimulees } from './remplacement';

const PREF = 'simulation';
type Enregistre = {
  active: boolean;
  notes: Record<string, NoteHypothetique[]>;
  /** Moyenne générale visée (onglet Objectif), repère sur l'anneau de l'écran Notes. */
  objectif?: number;
  /** L'objectif est dessiné sur l'écran Notes (indépendant de l'affichage des notes simulées). */
  objectifAffiche?: boolean;
  /** Notes simulées remplacées par la vraie note, les plus récentes d'abord. */
  remplacees?: Remplacement[];
};

type EtatSimulation = Enregistre & {
  /** Différent de ce qui est enregistré dans la base. */
  modifie: boolean;
  charge: boolean;
  charger: () => Promise<void>;
  definir: (cle: string, notes: NoteHypothetique[]) => void;
  activer: (active: boolean) => void;
  viser: (objectif: number) => void;
  afficherObjectif: (v: boolean) => void;
  enregistrer: () => Promise<void>;
  /** Nouvelles notes d'une synchro au premier plan : remplace les simulées correspondantes. */
  integrer: (eleveId: string, nouvelles: Note[], d: DonneesNotes) => Promise<Remplacement[]>;
  /** Retour au premier plan : reprend les remplacements faits en arrière-plan (dans la base seulement). */
  rattraper: () => Promise<void>;
};

/** Clé d'une simulation : un élève, une période. */
export const cleSimulation = (eleve: string, periode: string) => `${eleve}:${periode}`;

const lire = () => lirePreference<Enregistre | undefined>(PREF, undefined).catch(() => undefined);
const memeRemplacement = (a: Remplacement, b: Remplacement) => a.cle === b.cle && a.noteId === b.noteId;

/** Remplacement dans la simulation enregistrée (tâche d'arrière-plan, sans l'état en mémoire). */
export async function remplacerEnBase(eleveId: string, nouvelles: Note[], d: DonneesNotes): Promise<Remplacement[]> {
  if (MODE_DEMO || nouvelles.length === 0) return [];
  const e = await lire();
  if (!e) return [];
  const r = remplacerSimulees(e, eleveId, nouvelles, d, new Date().toISOString());
  if (r.nouveaux.length) await ecrirePreference(PREF, { ...e, notes: r.notes, remplacees: r.remplacees } satisfies Enregistre);
  return r.nouveaux;
}

export const useSimulation = create<EtatSimulation>((set, get) => ({
  active: true,
  notes: {},
  modifie: false,
  charge: false,
  async charger() {
    if (get().charge || MODE_DEMO) return set({ charge: true });
    set({ charge: true });
    const e = await lire();
    // Ce qui a été saisi avant la fin de la lecture l'emporte.
    if (e && Object.keys(get().notes).length === 0 && get().objectif === undefined) set({ ...e });
  },
  definir: (cle, notes) => set((s) => ({ notes: { ...s.notes, [cle]: notes }, modifie: true })),
  activer: (active) => set({ active, modifie: true }),
  viser: (objectif) => set({ objectif, modifie: true }),
  afficherObjectif: (objectifAffiche) => set({ objectifAffiche, modifie: true }),
  async enregistrer() {
    const { active, notes, objectif, objectifAffiche, remplacees } = get();
    if (!MODE_DEMO) await ecrirePreference(PREF, { active, notes, objectif, objectifAffiche, remplacees } satisfies Enregistre);
    set({ modifie: false });
  },
  async integrer(eleveId, nouvelles, d) {
    if (nouvelles.length === 0) return [];
    const r = remplacerSimulees(get(), eleveId, nouvelles, d, new Date().toISOString());
    if (r.nouveaux.length) set({ notes: r.notes, remplacees: r.remplacees });
    await remplacerEnBase(eleveId, nouvelles, d);
    return r.nouveaux;
  },
  async rattraper() {
    if (MODE_DEMO || !get().charge) return;
    const e = await lire();
    const connus = get().remplacees ?? [];
    const manquants = (e?.remplacees ?? []).filter((r) => !connus.some((x) => memeRemplacement(x, r)));
    if (manquants.length === 0) return;
    const notes = { ...get().notes };
    for (const r of manquants) {
      const liste = notes[r.cle] ?? [];
      const i = liste.findIndex((h) => JSON.stringify(h) === JSON.stringify(r.hypothese));
      if (i >= 0) notes[r.cle] = liste.filter((_, j) => j !== i);
    }
    set({ notes, remplacees: [...manquants, ...connus] });
  },
}));
