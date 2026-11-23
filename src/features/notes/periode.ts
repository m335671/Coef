// Période affichée, la même pour l'Accueil et l'écran Notes, gardée d'un lancement à l'autre. Les dates de
// trimestre d'ED ne disent pas quand les notes arrivent vraiment : sans choix de l'utilisateur, on prend le
// trimestre en cours s'il a des notes, sinon le dernier qui en a (periodeParDefaut).
import { useEffect } from 'react';
import { create } from 'zustand';

import { MODE_DEMO } from '@/demo';
import type { DonneesNotes } from '@/domain/types';
import { ecrirePreference, lirePreference } from '@/storage/base';

import { periodeParDefaut, periodesAffichees } from './vue';

const PREF = 'periodes';

const usePeriodes = create<{ choix: Record<string, string>; charge: boolean; charger: () => Promise<void>; choisir: (eleve: string, code: string) => void }>(
  (set, get) => ({
    choix: {},
    charge: false,
    async charger() {
      if (get().charge) return;
      set({ charge: true });
      if (MODE_DEMO) return;
      const lu = await lirePreference<Record<string, string>>(PREF, {}).catch(() => ({}));
      set((s) => ({ choix: { ...lu, ...s.choix } }));
    },
    choisir(eleve, code) {
      const choix = { ...get().choix, [eleve]: code };
      set({ choix });
      if (!MODE_DEMO) void ecrirePreference(PREF, choix).catch(() => undefined);
    },
  }),
);

/** Période affichée pour un élève et de quoi la changer (le choix est retenu). */
export function usePeriode(eleve: string, d: DonneesNotes | undefined, aujourdhui: string): [string | undefined, (code: string) => void] {
  const charger = usePeriodes((s) => s.charger);
  useEffect(() => void charger(), [charger]);
  const choisie = usePeriodes((s) => s.choix[eleve]);
  const choisir = usePeriodes((s) => s.choisir);
  const existe = !!d && !!choisie && periodesAffichees(d).some((p) => p.code === choisie);
  return [existe ? choisie : d && periodeParDefaut(d, aujourdhui)?.code, (code) => choisir(eleve, code)];
}
