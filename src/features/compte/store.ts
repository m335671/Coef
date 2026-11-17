import { create } from 'zustand';

import { ClientED, reconnexion, type Session } from '@/api/ecoledirecte/client';
import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { versProfil } from '@/api/ecoledirecte/mapping';
import type { Profil } from '@/domain/types';
import { ecrirePreference, effacerBase, lirePreference } from '@/storage/base';
import { comptesEnregistres, lireAcces, oublierCompte, sauverAcces, toutEffacerSecrets } from '@/storage/secrets';
import { activerSynchroAuto, desactiverSynchroAuto } from '@/sync/tache';

import { demanderAutorisation } from '../../../modules/notifications-locales';
import { effacerFichiers } from '../vie/fichiers';

type EtatCompte = {
  client?: ClientED;
  idCompte?: string;
  profils: Profil[];
  /** Compte restauré sans réseau : profils et notes en cache, pas de client tant qu'ED est injoignable. */
  horsLigne: boolean;
  /** Reconnexion de fond refusée par ED (accès périmé) : retour à l'écran de connexion. */
  expiree: boolean;
  /**
   * Lancement : ouvre aussitôt sur le cache (profils gardés dans la base chiffrée), se reconnecte en fond.
   * Sans cache, attend la reconnexion. Faux s'il n'y a pas de session enregistrée.
   */
  demarrer: () => Promise<boolean>;
  /** Reprend la session enregistrée, sans mot de passe ; une seule reprise à la fois. Faux s'il n'y en a pas. */
  restaurer: () => Promise<boolean>;
  ouvrir: (session: Session, resterConnecte: boolean) => Promise<void>;
  deconnecter: () => Promise<void>;
  toutEffacer: () => Promise<void>;
};

function idDe(session: Session): string {
  const principal = session.comptes.find((c) => c.main) ?? session.comptes[0]!;
  return String(principal.idLogin);
}

let reprise: Promise<boolean> | undefined;

export const useCompte = create<EtatCompte>((set, get) => ({
  profils: [],
  horsLigne: false,
  expiree: false,

  async demarrer() {
    const id = (await comptesEnregistres())[0];
    if (!id || !(await lireAcces(id))) return false;
    const profils = await lirePreference<Profil[]>(`profils.${id}`, []);
    if (profils.length === 0) return get().restaurer();
    set({ idCompte: id, profils, horsLigne: true });
    get()
      .restaurer()
      .catch(() => undefined); // réseau : on reste sur le cache ; accès refusé : `expiree`
    return true;
  },

  restaurer() {
    reprise ??= (async () => {
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
        if (profils.length === 0) {
          if (get().horsLigne) set({ expiree: true });
          throw e;
        }
        set({ idCompte: id, profils, horsLigne: true });
        return true;
      }
    })().finally(() => (reprise = undefined));
    return reprise;
  },

  async ouvrir(session, resterConnecte) {
    const id = idDe(session);
    const sauver = resterConnecte ? (a: Session['acces']) => sauverAcces(id, a) : () => undefined;
    await sauver(session.acces);
    const profils = session.comptes.map(versProfil);
    set({ client: new ClientED(session, sauver), idCompte: id, profils, horsLigne: false, expiree: false });
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
    effacerFichiers();
    set({ client: undefined, idCompte: undefined, profils: [] });
  },

  async toutEffacer() {
    await desactiverSynchroAuto();
    await effacerBase();
    await toutEffacerSecrets();
    effacerFichiers();
    set({ client: undefined, idCompte: undefined, profils: [] });
  },
}));
