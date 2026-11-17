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
  `CREATE TABLE preferences (cle TEXT PRIMARY KEY NOT NULL, valeur TEXT NOT NULL);`,
  `CREATE TABLE cache (cle TEXT PRIMARY KEY NOT NULL, valeur TEXT NOT NULL, maj TEXT NOT NULL);`,
];

let ouverture: Promise<SQLite.SQLiteDatabase> | undefined;

async function ouvrirAvecCle(cle: string): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(NOM);
  // Clé brute hexadécimale (pas de dérivation de mot de passe) : elle vient déjà d'un générateur aléatoire.
  await db.execAsync(`PRAGMA key = "x'${cle}'";`);
  const chiffrement = await db.getFirstAsync<{ cipher_version?: string }>('PRAGMA cipher_version;');
  if (!chiffrement?.cipher_version) {
    await db.closeAsync();
    throw new Error('Base non chiffrée (SQLCipher absent) : ouverture refusée.');
  }
  return db;
}

async function ouvrir(): Promise<SQLite.SQLiteDatabase> {
  const cle = await cleBase();
  let db = await ouvrirAvecCle(cle);
  let lu = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;').catch(() => undefined);
  if (!lu) {
    // Fichier illisible avec cette clé (créé sans chiffrement, ou clé perdue). La base n'est qu'un cache de
    // données ED, toutes récupérables : on la recrée chiffrée plutôt que de bloquer l'app.
    await db.closeAsync();
    await SQLite.deleteDatabaseAsync(NOM);
    db = await ouvrirAvecCle(cle);
    lu = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;'))!;
  }
  const version = lu.user_version;
  // Pas de withExclusiveTransactionAsync : il ouvre une seconde connexion, sans la clé SQLCipher
  // (« Erreur inattendue » à l'essai réel du 17/11/2026). Transaction sur cette connexion-ci.
  for (let v = version; v < MIGRATIONS.length; v++) {
    try {
      await db.execAsync(`BEGIN; ${MIGRATIONS[v]!} PRAGMA user_version = ${v + 1}; COMMIT;`);
    } catch (e) {
      await db.execAsync('ROLLBACK;').catch(() => undefined); // déjà annulée si BEGIN a échoué
      throw e;
    }
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

/** Réglages de l'app (pas des secrets) : valeurs courtes, sérialisées en JSON. */
export async function lirePreference<T>(cle: string, defaut: T): Promise<T> {
  const l = await (await base()).getFirstAsync<{ valeur: string }>('SELECT valeur FROM preferences WHERE cle = ?', cle);
  return l ? (JSON.parse(l.valeur) as T) : defaut;
}

export async function ecrirePreference(cle: string, valeur: unknown): Promise<void> {
  await (await base()).runAsync('INSERT OR REPLACE INTO preferences (cle, valeur) VALUES (?, ?)', cle, JSON.stringify(valeur));
}

/** Cache des autres données ED (emploi du temps, devoirs, vie scolaire), avec leur date de mise à jour. */
export async function lireCache<T>(cle: string): Promise<{ valeur: T; maj: string } | undefined> {
  const l = await (await base()).getFirstAsync<{ valeur: string; maj: string }>('SELECT valeur, maj FROM cache WHERE cle = ?', cle);
  return l ? { valeur: JSON.parse(l.valeur) as T, maj: l.maj } : undefined;
}

export async function ecrireCache(cle: string, valeur: unknown, maj: string): Promise<void> {
  await (await base()).runAsync('INSERT OR REPLACE INTO cache (cle, valeur, maj) VALUES (?, ?, ?)', cle, JSON.stringify(valeur), maj);
}

/** Essai : ouvre (et migre) la base, rend la version de SQLCipher et du schéma. */
export async function diagnosticBase(): Promise<string> {
  const db = await base();
  const c = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version;');
  const v = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  return `SQLCipher ${c?.cipher_version} · schéma v${v?.user_version}`;
}

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
