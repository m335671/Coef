import { ErreurReseau, requete, verifierHote } from '../http';

afterEach(() => jest.restoreAllMocks());

test.each(['https://evil.example.com/x', 'http://api.ecoledirecte.com/v3', 'https://api.ecoledirecte.com.evil.com/', 'pas une url'])(
  'refuse %s sans rien envoyer',
  async (url) => {
    const f = jest.spyOn(globalThis, 'fetch');
    expect(() => verifierHote(url)).toThrow(ErreurReseau);
    expect(() => requete(url, {})).toThrow(ErreurReseau);
    expect(f).not.toHaveBeenCalled();
  },
);

test('autorise l’API EcoleDirecte en HTTPS', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
  await expect(requete('https://api.ecoledirecte.com/v3/login.awp', {})).resolves.toBeInstanceOf(Response);
});

test('envoie les requêtes une par une', async () => {
  let enCours = 0;
  let max = 0;
  jest.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    max = Math.max(max, ++enCours);
    await new Promise((r) => setTimeout(r, 5));
    enCours--;
    return new Response('{}');
  });
  const u = 'https://api.ecoledirecte.com/v3/x.awp';
  await Promise.all([requete(u, {}), requete(u, {}), requete(u, {})]);
  expect(max).toBe(1);
});

test('une requête en échec ne bloque pas les suivantes', async () => {
  jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(new Response('{}'));
  const u = 'https://api.ecoledirecte.com/v3/x.awp';
  await expect(requete(u, {})).rejects.toThrow('EcoleDirecte est injoignable.');
  await expect(requete(u, {})).resolves.toBeInstanceOf(Response);
});

test('les requêtes en attente partent de la plus récente à la plus ancienne', async () => {
  const ordre: string[] = [];
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    ordre.push(String(url).split('/').pop()!);
    await new Promise((r) => setTimeout(r, 1));
    return new Response('{}');
  });
  const u = (n: string) => requete(`https://api.ecoledirecte.com/v3/${n}`, {});
  await Promise.all([u('a.awp'), u('b.awp'), u('c.awp'), u('d.awp')]);
  expect(ordre).toEqual(['a.awp', 'd.awp', 'c.awp', 'b.awp']);
});
