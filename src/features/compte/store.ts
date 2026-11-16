import { create } from 'zustand';

import { ClientED, reconnexion, type Session } from '@/api/ecoledirecte/client';
import { versProfil } from '@/api/ecoledirecte/mapping';
import type { Profil } from '@/domain/types';
import { effacerBase } from '@/storage/base';
import { comptesEnregistres, lireAcces, oublierCompte, sauverAcces, toutEffacerSecrets } from '@/storage/secrets';
import { activerSynchroAuto, desactiverSynchroAuto } from '@/sync/tache';

import { demanderAutorisation } from '../../../modules/notifications-locales';

type EtatCompte = {
  client?: ClientED;
  idCompte?: string;
  profils: Profil[];
  /** Reprend la session enregistrée, sans mot de passe. Faux s'il n'y en a pas. */
  restaurer: () => Promise<boolean>;
  ouvrir: (session: Session, resterConnecte: boolean) => Promise<void>;
  deconnecter: () => Promise<void>;
  toutEffacer: () => Promise<void>;
};

function idDe(session: Session): string {
  const principal = session.comptes.find((c) => c.main) ?? session.comptes[0]!;
  return String(principal.idLogin);
}

export const useCompte = create<EtatCompte>((set, get) => ({
  profils: [],

  async restaurer() {
    // shortcut: reprend le premier compte enregistré ; le sélecteur de comptes arrive avec les écrans (étape 5).
    const id = (await comptesEnregistres())[0];
    const acces = id ? await lireAcces(id) : null;
    if (!id || !acces) return false;
    const session = await reconnexion(acces);
    await sauverAcces(id, session.acces); // l'accessToken précédent ne sert plus
    await get().ouvrir(session, true);
    return true;
  },

  async ouvrir(session, resterConnecte) {
    const id = idDe(session);
    const sauver = resterConnecte ? (a: Session['acces']) => sauverAcces(id, a) : () => undefined;
    await sauver(session.acces);
    set({ client: new ClientED(session, sauver), idCompte: id, profils: session.comptes.map(versProfil) });
    // Synchro et notifications en arrière-plan seulement pour un compte gardé (sinon pas d'accès pour se reconnecter).
    if (resterConnecte) {
      await demanderAutorisation();
      await activerSynchroAuto();
    }
  },

  async deconnecter() {
    const id = get().idCompte;
    if (id) await oublierCompte(id);
    if ((await comptesEnregistres()).length === 0) await desactiverSynchroAuto();
    set({ client: undefined, idCompte: undefined, profils: [] });
  },

  async toutEffacer() {
    await desactiverSynchroAuto();
    await effacerBase();
    await toutEffacerSecrets();
    set({ client: undefined, idCompte: undefined, profils: [] });
  },
}));
