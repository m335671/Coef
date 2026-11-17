import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { useCompte } from '../store';

const mockReconnexion = jest.fn();
let mockProfils: unknown[] = [];

jest.mock('@/api/ecoledirecte/client', () => ({ ClientED: jest.fn(), reconnexion: (...a: unknown[]) => mockReconnexion(...a) }));
jest.mock('@/api/ecoledirecte/mapping', () => ({ versProfil: (x: unknown) => x }));
jest.mock('@/storage/secrets', () => ({
  comptesEnregistres: async () => ['7'],
  lireAcces: async () => ({ jeton: 'x' }),
  sauverAcces: async () => undefined,
  oublierCompte: async () => undefined,
  toutEffacerSecrets: async () => undefined,
}));
jest.mock('@/storage/base', () => ({
  lirePreference: async () => mockProfils,
  ecrirePreference: async () => undefined,
  effacerBase: async () => undefined,
}));
jest.mock('@/sync/tache', () => ({ activerSynchroAuto: async () => undefined, desactiverSynchroAuto: async () => undefined }));
jest.mock('../../../../modules/notifications-locales', () => ({ demanderAutorisation: async () => undefined }));
jest.mock('../../vie/fichiers', () => ({ effacerFichiers: () => undefined }));


beforeEach(() => {
  mockReconnexion.mockReset();
  useCompte.setState({ client: undefined, idCompte: undefined, profils: [], horsLigne: false, expiree: false });
});

test('avec un cache : ouvre sans attendre ED, une seule reconnexion de fond même si d’autres la demandent', async () => {
  mockProfils = [{ id: '7', prenom: 'A' }];
  let finir!: (v: unknown) => void;
  mockReconnexion.mockReturnValue(new Promise((r) => (finir = r)));
  await expect(useCompte.getState().demarrer()).resolves.toBe(true);
  expect(useCompte.getState().horsLigne).toBe(true);
  void useCompte.getState().restaurer();
  expect(mockReconnexion).toHaveBeenCalledTimes(1);
  finir({ acces: {}, comptes: [{ idLogin: 7, main: true }] });
  await new Promise((r) => setTimeout(r, 0));
  expect(useCompte.getState().horsLigne).toBe(false);
});

test('accès refusé pendant la reconnexion de fond : retour à la connexion', async () => {
  mockProfils = [{ id: '7', prenom: 'A' }];
  mockReconnexion.mockRejectedValue(new ErreurED('identifiants'));
  await useCompte.getState().demarrer();
  await new Promise((r) => setTimeout(r, 0));
  expect(useCompte.getState().expiree).toBe(true);
});
