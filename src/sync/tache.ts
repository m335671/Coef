// Synchro en arrière-plan (WorkManager sur Android, BGTaskScheduler sur iOS) et notifications locales.
// Importé au démarrage (app/_layout) : la tâche doit être définie avant que le système la réveille.
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';

import { ClientED, reconnexion } from '@/api/ecoledirecte/client';
import { versProfil } from '@/api/ecoledirecte/mapping';
import { depot, lirePreference } from '@/storage/base';
import { comptesEnregistres, lireAcces, sauverAcces } from '@/storage/secrets';

import { afficher, type EcranVerrouille } from '../../modules/notifications-locales';
import { annonce } from './annonce';
import { synchroniser } from './synchro';

export const TACHE = 'coef.synchro-notes';
export const PREF_ECRAN_VERROUILLE = 'notifications.ecran-verrouille';
/** Minutes. Le système peut espacer davantage (batterie, réseau). */
const INTERVALLE = 60;

const idNotification = (eleveId: string) => Number(eleveId) % 2_147_483_647 || 1;

/** Synchronise chaque élève de chaque compte enregistré et notifie ses nouvelles notes. */
export async function synchroniserComptes(): Promise<void> {
  const ecranVerrouille = await lirePreference<EcranVerrouille>(PREF_ECRAN_VERROUILLE, 'rien');
  for (const id of await comptesEnregistres()) {
    const acces = await lireAcces(id);
    if (!acces) continue;
    const session = await reconnexion(acces);
    await sauverAcces(id, session.acces); // l'accessToken précédent ne sert plus
    const client = new ClientED(session, (a) => sauverAcces(id, a));
    const eleves = session.comptes.map(versProfil).flatMap((p) => p.eleves);
    for (const e of eleves) {
      const r = await synchroniser(e.id, () => client.notes(e.id), depot);
      if (r.premiere || r.depuisCache) continue;
      const a = annonce(r, r.instantane.donnees, eleves.length > 1 ? e.prenom : undefined);
      if (a) await afficher(idNotification(e.id), a.titre, a.texte, ecranVerrouille);
    }
  }
}

TaskManager.defineTask(TACHE, async () => {
  // App au premier plan : elle synchronise elle-même. Deux reconnexions simultanées useraient deux fois
  // le même accessToken (usage unique) et déconnecteraient le compte.
  if (AppState.currentState === 'active') return BackgroundTask.BackgroundTaskResult.Success;
  try {
    await synchroniserComptes();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function activerSynchroAuto(): Promise<void> {
  if ((await BackgroundTask.getStatusAsync()) !== BackgroundTask.BackgroundTaskStatus.Available) return;
  await BackgroundTask.registerTaskAsync(TACHE, { minimumInterval: INTERVALLE });
}

export async function desactiverSynchroAuto(): Promise<void> {
  if (await TaskManager.isTaskRegisteredAsync(TACHE)) await BackgroundTask.unregisterTaskAsync(TACHE);
}
