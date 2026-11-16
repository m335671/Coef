// Seul endroit où vivent les secrets (jetons, clés d'appareil). Jamais dans SQLite, AsyncStorage ni les logs.
import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';

import type { Acces } from '@/api/ecoledirecte/client';

// Lisible après le premier déverrouillage (synchro en arrière-plan), jamais sauvegardé hors de l'appareil.
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
const CLE_UUID = 'ed.uuid';
const CLE_INDEX = 'ed.comptes';
const cleAcces = (id: string) => `ed.acces.${id}`;

const schemaAcces = z.object({
  identifiant: z.string(),
  uuid: z.string(),
  typeCompte: z.string(),
  accessToken: z.string(),
  appareil: z.object({ cn: z.string(), cv: z.string() }).optional(),
});

async function lireJSON<T>(cle: string, schema: z.ZodType<T>): Promise<T | null> {
  const brut = await SecureStore.getItemAsync(cle, OPTIONS);
  if (brut === null) return null;
  try {
    const r = schema.safeParse(JSON.parse(brut));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

/** Identifiant d'appareil envoyé à ED (champ uuid), généré une fois sur l'appareil. */
export async function uuidAppareil(): Promise<string> {
  const existant = await SecureStore.getItemAsync(CLE_UUID, OPTIONS);
  if (existant) return existant;
  const uuid = randomUUID();
  await SecureStore.setItemAsync(CLE_UUID, uuid, OPTIONS);
  return uuid;
}

export async function comptesEnregistres(): Promise<string[]> {
  return (await lireJSON(CLE_INDEX, z.array(z.string()))) ?? [];
}

export async function sauverAcces(idCompte: string, acces: Acces): Promise<void> {
  await SecureStore.setItemAsync(cleAcces(idCompte), JSON.stringify(acces), OPTIONS);
  const ids = await comptesEnregistres();
  if (!ids.includes(idCompte)) await SecureStore.setItemAsync(CLE_INDEX, JSON.stringify([...ids, idCompte]), OPTIONS);
}

export function lireAcces(idCompte: string): Promise<Acces | null> {
  return lireJSON(cleAcces(idCompte), schemaAcces);
}

export async function oublierCompte(idCompte: string): Promise<void> {
  await SecureStore.deleteItemAsync(cleAcces(idCompte), OPTIONS);
  const ids = (await comptesEnregistres()).filter((i) => i !== idCompte);
  await SecureStore.setItemAsync(CLE_INDEX, JSON.stringify(ids), OPTIONS);
}

/** « Tout effacer » : secrets. La base chiffrée et sa clé s'ajouteront à l'étape 4. */
export async function toutEffacerSecrets(): Promise<void> {
  for (const id of await comptesEnregistres()) await SecureStore.deleteItemAsync(cleAcces(id), OPTIONS);
  await SecureStore.deleteItemAsync(CLE_INDEX, OPTIONS);
  await SecureStore.deleteItemAsync(CLE_UUID, OPTIONS);
}
