// Notes par élève : la base chiffrée est la source de vérité, ce store n'en garde que l'état affiché.
// Cache d'abord (affichage immédiat), puis synchro ED en arrière-plan de l'écran.
import { create } from 'zustand';

import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { MODE_DEMO } from '@/demo';
import { instantaneDemo } from '@/demo/notes';
import { depot, type Instantane } from '@/storage/base';
import { synchroniser } from '@/sync/synchro';

import { useCompte } from '../compte/store';

export type EtatEleve = { instantane?: Instantane; chargement: boolean; erreur?: unknown };

type EtatNotes = {
  eleves: Record<string, EtatEleve>;
  charger: (eleveId: string, forcer?: boolean) => Promise<void>;
  vider: () => void;
};

export const useNotes = create<EtatNotes>((set, get) => {
  const maj = (id: string, e: Partial<EtatEleve>) =>
    set((s) => ({ eleves: { ...s.eleves, [id]: { chargement: false, ...s.eleves[id], ...e } } }));

  return {
    eleves: {},

    async charger(eleveId, forcer = false) {
      if (MODE_DEMO) return maj(eleveId, { instantane: get().eleves[eleveId]?.instantane ?? instantaneDemo() });
      if (get().eleves[eleveId]?.chargement) return; // pas de rafales
      maj(eleveId, { chargement: true, erreur: undefined });
      try {
        const cache = await depot.lire(eleveId);
        if (cache) maj(eleveId, { instantane: cache });
        // Ouvert hors ligne : on retente la reconnexion avant la synchro.
        if (!useCompte.getState().client && useCompte.getState().horsLigne) await useCompte.getState().restaurer();
        const client = useCompte.getState().client;
        if (!client) throw new ErreurED('reseau');
        const r = await synchroniser(eleveId, () => client.notes(eleveId), depot, { forcer });
        maj(eleveId, { instantane: r.instantane, chargement: false });
      } catch (erreur) {
        // Les données en cache restent affichées ; l'erreur s'affiche dans le bloc, pas à la place de l'écran.
        maj(eleveId, { chargement: false, erreur });
      }
    },

    vider: () => set({ eleves: {} }),
  };
});
