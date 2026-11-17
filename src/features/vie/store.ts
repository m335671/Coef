// Emploi du temps, devoirs, vie scolaire : cache chiffré d'abord, puis ED au plus toutes les 5 minutes par clé.
import { create } from 'zustand';

import type { ClientED } from '@/api/ecoledirecte/client';
import type { Devoir, Message } from '@/domain/types';
import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { MODE_DEMO } from '@/demo';
import { ecrireCache, lireCache } from '@/storage/base';
import { DELAI_MIN_MS } from '@/sync/synchro';

import { useCompte } from '../compte/store';

export type EtatDonnee<T> = { valeur?: T; maj?: string; chargement: boolean; erreur?: unknown };

type Etat = {
  donnees: Record<string, EtatDonnee<unknown>>;
  charger: <T>(cle: string, recuperer: (c: ClientED) => Promise<T>, demo: () => T, forcer?: boolean) => Promise<void>;
};

export const useDonneesED = create<Etat>((set, get) => {
  const maj = (cle: string, e: Partial<EtatDonnee<unknown>>) =>
    set((s) => ({ donnees: { ...s.donnees, [cle]: { chargement: false, ...s.donnees[cle], ...e } } }));
  return {
    donnees: {},
    async charger(cle, recuperer, demo, forcer = false) {
      if (MODE_DEMO) return maj(cle, { valeur: demo(), maj: new Date().toISOString() });
      if (get().donnees[cle]?.chargement) return;
      maj(cle, { chargement: true, erreur: undefined });
      try {
        const cache = await lireCache(cle);
        if (cache) maj(cle, { valeur: cache.valeur, maj: cache.maj });
        if (cache && !forcer && Date.now() - Date.parse(cache.maj) < DELAI_MIN_MS) return maj(cle, { chargement: false });
        if (!useCompte.getState().client && useCompte.getState().horsLigne) await useCompte.getState().restaurer();
        const client = useCompte.getState().client;
        if (!client) throw new ErreurED('reseau');
        const valeur = await recuperer(client);
        const date = new Date().toISOString();
        await ecrireCache(cle, valeur, date);
        maj(cle, { valeur, maj: date, chargement: false });
      } catch (erreur) {
        maj(cle, { chargement: false, erreur });
      }
    },
  };
});

export function useDonnee<T>(cle: string): EtatDonnee<T> | undefined {
  return useDonneesED((s) => s.donnees[cle]) as EtatDonnee<T> | undefined;
}

/**
 * Coche ou décoche un devoir : affiché tout de suite, envoyé à ED, remis comme avant si ED refuse.
 * En démo, seulement à l'écran.
 */
export async function marquerDevoir(eleveId: string, id: string, fait: boolean): Promise<void> {
  const cle = `devoirs:${eleveId}`;
  const etat = useDonneesED.getState().donnees[cle];
  const avant = etat?.valeur as Devoir[] | undefined;
  if (!avant) return;
  const apres = avant.map((d) => (d.id === id ? { ...d, effectue: fait } : d));
  const poser = (valeur: Devoir[]) => useDonneesED.setState((s) => ({ donnees: { ...s.donnees, [cle]: { chargement: false, ...s.donnees[cle], valeur } } }));
  poser(apres);
  if (MODE_DEMO) return;
  try {
    const client = useCompte.getState().client;
    if (!client) throw new ErreurED('reseau');
    await client.marquerDevoirs(eleveId, fait ? [id] : [], fait ? [] : [id]);
    await ecrireCache(cle, apres, etat?.maj ?? new Date().toISOString());
  } catch (erreur) {
    poser(avant);
    throw erreur;
  }
}

/** Message ouvert : ED l'a marqué comme lu, la liste le montre aussitôt (et son cache aussi). */
export function marquerLu(eleveId: string, id: string): void {
  const cle = `messages:${eleveId}`;
  const etat = useDonneesED.getState().donnees[cle];
  const liste = etat?.valeur as Message[] | undefined;
  if (!liste?.some((m) => m.id === id && !m.lu)) return;
  const valeur = liste.map((m) => (m.id === id ? { ...m, lu: true } : m));
  useDonneesED.setState((s) => ({ donnees: { ...s.donnees, [cle]: { chargement: false, ...s.donnees[cle], valeur } } }));
  if (!MODE_DEMO) void ecrireCache(cle, valeur, etat?.maj ?? new Date().toISOString()).catch(() => undefined);
}
