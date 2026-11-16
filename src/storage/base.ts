// Base SQLite chiffrée (SQLCipher, activé dans app.json). Clé générée sur l'appareil, rangée dans SecureStore.
import * as SQLite from 'expo-sqlite';

import type { DonneesNotes } from '@/domain/types';

import { cleBase } from './secrets';

const NOM = 'ed-clone.db';

/** Une entrée par version de schéma, jamais modifiée une fois publiée : on ajoute. */
const MIGRATIONS = [
  `CREATE TABLE instantanes (
     eleve_id TEXT PRIMARY KEY NOT NULL,
     donnees TEXT NOT NULL,
     synchro TEXT NOT NULL,
     nouveautes TEXT NOT NULL
   );`,
];

let ouverture: Promise<SQLite.SQLiteDatabase> | undefined;

async function ouvrir(): Promise<SQLite.SQLiteDatabase> {
  const cle = await cleBase();
  const db = await SQLite.openDatabaseAsync(NOM);
  // Clé brute hexadécimale (pas de dérivation de mot de passe) : elle vient déjà d'un générateur aléatoire.
  await db.execAsync(`PRAGMA key = "x'${cle}'";`);
  const chiffrement = await db.getFirstAsync<{ cipher_version?: string }>('PRAGMA cipher_version;');
  if (!chiffrement?.cipher_version) {
    await db.closeAsync();
    throw new Error('Base non chiffrée (SQLCipher absent) : ouverture refusée.');
  }
  const { user_version: version } = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))!;
  for (let v = version; v < MIGRATIONS.length; v++) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(MIGRATIONS[v]!);
      await tx.execAsync(`PRAGMA user_version = ${v + 1};`);
    });
  }
  return db;
}

function base(): Promise<SQLite.SQLiteDatabase> {
  ouverture ??= ouvrir().catch((e: unknown) => {
    ouverture = undefined;
    throw e;
  });
  return ouverture;
}

/** Nouvelles notes et moyennes générales d'avant, retenues à la dernière synchro qui a apporté du nouveau. */
export type Nouveautes = { date: string; noteIds: string[]; generalesAvant: Record<string, number> };
export type Instantane = { donnees: DonneesNotes; synchro: string; nouveautes: Nouveautes };

export const depot = {
  async lire(eleveId: string): Promise<Instantane | undefined> {
    const l = await (await base()).getFirstAsync<{ donnees: string; synchro: string; nouveautes: string }>(
      'SELECT donnees, synchro, nouveautes FROM instantanes WHERE eleve_id = ?',
      eleveId,
    );
    // ponytail: JSON écrit par l'app elle-même, sans validation ; une migration accompagnera tout changement de forme.
    return l ? { donnees: JSON.parse(l.donnees), synchro: l.synchro, nouveautes: JSON.parse(l.nouveautes) } : undefined;
  },

  async ecrire(eleveId: string, i: Instantane): Promise<void> {
    await (await base()).runAsync(
      'INSERT OR REPLACE INTO instantanes (eleve_id, donnees, synchro, nouveautes) VALUES (?, ?, ?, ?)',
      eleveId,
      JSON.stringify(i.donnees),
      i.synchro,
      JSON.stringify(i.nouveautes),
    );
  },
};

/** « Tout effacer » : ferme et supprime la base. La clé part avec les secrets. */
export async function effacerBase(): Promise<void> {
  const ouverte = ouverture;
  ouverture = undefined;
  await (await ouverte?.catch(() => undefined))?.closeAsync();
  // Ouvrir sans clé crée le fichier s'il manque : la suppression ne peut alors échouer que pour une vraie raison,
  // qui remonte au lieu d'être avalée (« Tout effacer » doit être fiable).
  await (await SQLite.openDatabaseAsync(NOM)).closeAsync();
  await SQLite.deleteDatabaseAsync(NOM);
}
