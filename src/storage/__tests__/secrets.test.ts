import * as SecureStore from 'expo-secure-store';

import { comptesEnregistres, lireAcces, oublierCompte, sauverAcces, toutEffacerSecrets, uuidAppareil } from '../secrets';

jest.mock('expo-secure-store', () => {
  const m = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 0,
    __memoire: m,
    getItemAsync: jest.fn(async (k: string) => m.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void m.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void m.delete(k)),
  };
});
jest.mock('expo-crypto', () => ({ randomUUID: () => 'uuid-genere' }));

const memoire = (SecureStore as unknown as { __memoire: Map<string, string> }).__memoire;
const acces = (n: string) => ({ identifiant: n, uuid: 'u', typeCompte: 'E', accessToken: `a-${n}` });

beforeEach(() => memoire.clear());

test('uuid généré une fois puis réutilisé', async () => {
  expect(await uuidAppareil()).toBe('uuid-genere');
  memoire.set('ed.uuid', 'deja-la');
  expect(await uuidAppareil()).toBe('deja-la');
});

test('plusieurs comptes, oubli d’un compte', async () => {
  await sauverAcces('1', acces('a'));
  await sauverAcces('2', acces('b'));
  await sauverAcces('1', { ...acces('a'), accessToken: 'rotation' });
  expect(await comptesEnregistres()).toEqual(['1', '2']);
  expect((await lireAcces('1'))?.accessToken).toBe('rotation');
  await oublierCompte('1');
  expect(await comptesEnregistres()).toEqual(['2']);
  expect(await lireAcces('1')).toBeNull();
});

test('valeur corrompue : ignorée plutôt que plantage', async () => {
  memoire.set('ed.acces.9', '{pas du json');
  memoire.set('ed.acces.8', '{"identifiant":1}');
  expect(await lireAcces('9')).toBeNull();
  expect(await lireAcces('8')).toBeNull();
});

test('tout effacer', async () => {
  await uuidAppareil();
  await sauverAcces('1', acces('a'));
  await toutEffacerSecrets();
  expect([...memoire.keys()]).toEqual([]);
});
