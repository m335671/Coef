// Notes simulées, partagées entre l'écran Simulation et l'écran Notes. Gardées en mémoire tant que l'app
// tourne ; « Enregistrer » les range dans la base chiffrée (préférences) pour les retrouver au prochain lancement.
import { create } from 'zustand';

import { MODE_DEMO } from '@/demo';
import type { NoteHypothetique } from '@/domain/moyennes/simulateur';
import { ecrirePreference, lirePreference } from '@/storage/base';

const PREF = 'simulation';
type Enregistre = {
  active: boolean;
  notes: Record<string, NoteHypothetique[]>;
  /** Moyenne générale visée (onglet Objectif), repère sur l'anneau de l'écran Notes. */
  objectif?: number;
};

type EtatSimulation = Enregistre & {
  /** Différent de ce qui est enregistré dans la base. */
  modifie: boolean;
  charge: boolean;
  charger: () => Promise<void>;
  definir: (cle: string, notes: NoteHypothetique[]) => void;
  activer: (active: boolean) => void;
  viser: (objectif: number) => void;
  enregistrer: () => Promise<void>;
};

/** Clé d'une simulation : un élève, une période. */
export const cleSimulation = (eleve: string, periode: string) => `${eleve}:${periode}`;

export const useSimulation = create<EtatSimulation>((set, get) => ({
  active: true,
  notes: {},
  modifie: false,
  charge: false,
  async charger() {
    if (get().charge || MODE_DEMO) return set({ charge: true });
    set({ charge: true });
    const e = await lirePreference<Enregistre | undefined>(PREF, undefined).catch(() => undefined);
    // Ce qui a été saisi avant la fin de la lecture l'emporte.
    if (e && Object.keys(get().notes).length === 0 && get().objectif === undefined) set({ active: e.active, notes: e.notes, objectif: e.objectif });
  },
  definir: (cle, notes) => set((s) => ({ notes: { ...s.notes, [cle]: notes }, modifie: true })),
  activer: (active) => set({ active, modifie: true }),
  viser: (objectif) => set({ objectif, modifie: true }),
  async enregistrer() {
    const { active, notes, objectif } = get();
    if (!MODE_DEMO) await ecrirePreference(PREF, { active, notes, objectif } satisfies Enregistre);
    set({ modifie: false });
  },
}));
