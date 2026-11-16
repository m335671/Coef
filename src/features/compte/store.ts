import { create } from 'zustand';

import { ClientED, reconnexion, type Session } from '@/api/ecoledirecte/client';
import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { versProfil } from '@/api/ecoledirecte/mapping';
import type { Profil } from '@/domain/types';
import { ecrirePreference, effacerBase, lirePreference } from '@/storage/base';
import { comptesEnregistres, lireAcces, oublierCompte, sauverAcces, toutEffacerSecrets } from '@/storage/secrets';
import { activerSynchroAuto, desactiverSynchroAuto } from '@/sync/tache';

import { demanderAutorisation } from '../../../modules/notifications-locales';

type EtatCompte = {
  client?: ClientED;
  idCompte?: string;
  profils: Profil[];
  /** Compte restauré sans réseau : profils et notes en cache, pas de client tant qu'ED est injoignable. */
  horsLigne: boolean;
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
  horsLigne: false,

  async restaurer() {
    // shortcut: reprend le premier compte enregistré ; un sélecteur viendra s'il y a plusieurs comptes de connexion.
    const id = (await comptesEnregistres())[0];
    const acces = id ? await lireAcces(id) : null;
    if (!id || !acces) return false;
    try {
      const session = await reconnexion(acces);
      await sauverAcces(id, session.acces); // l'accessToken précédent ne sert plus
      await get().ouvrir(session, true);
      return true;
    } catch (e) {
      // Hors ligne : on ouvre sur le cache plutôt que de renvoyer vers la connexion.
      const profils = e instanceof ErreurED && e.type === 'reseau' ? await lirePreference<Profil[]>(`profils.${id}`, []) : [];
      if (profils.length === 0) throw e;
      set({ idCompte: id, profils, horsLigne: true });
      return true;
    }
  },

  async ouvrir(session, resterConnecte) {
    const id = idDe(session);
    const sauver = resterConnecte ? (a: Session['acces']) => sauverAcces(id, a) : () => undefined;
    await sauver(session.acces);
    const profils = session.comptes.map(versProfil);
    set({ client: new ClientED(session, sauver), idCompte: id, profils, horsLigne: false });
    // Synchro et notifications en arrière-plan seulement pour un compte gardé (sinon pas d'accès pour se reconnecter).
    if (resterConnecte) {
      await ecrirePreference(`profils.${id}`, profils); // dans la base chiffrée, pour ouvrir hors ligne
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
