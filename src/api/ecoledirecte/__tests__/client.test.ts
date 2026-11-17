import doubleauthGet from '../../../../fixtures/ed/doubleauth-get.json';
import doubleauthPost from '../../../../fixtures/ed/doubleauth-post.json';
import login505 from '../../../../fixtures/ed/login-505.json';
import loginEleve from '../../../../fixtures/ed/login-eleve.json';
import loginParent from '../../../../fixtures/ed/login-parent.json';
import loginQcm from '../../../../fixtures/ed/login-qcm.json';
import { decoderBase64, encoderBase64 } from '../base64';
import { ClientED, connexion, reconnexion, repondreQCM, type Session } from '../client';
import { ErreurED } from '../erreurs';
import { versProfil } from '../mapping';
import { fauxServeur } from '../../../../tests/faux-serveur-ed';

const IDS = { identifiant: 'camille.exemple', motDePasse: 'mdp%secret+é', uuid: 'uuid-test' };

afterEach(() => jest.restoreAllMocks());

async function erreurDe(p: Promise<unknown>): Promise<ErreurED> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ErreurED) return e;
    throw e;
  }
  throw new Error('aucune erreur levée');
}

describe('connexion', () => {
  test('élève : ouvre la session avec le jeton de l’en-tête et l’accessToken', async () => {
    const s = fauxServeur().repond(loginEleve, { 'x-token': 'jeton-entete' });
    const r = await connexion(IDS);
    expect(r.etape).toBe('connecte');
    if (r.etape !== 'connecte') return;
    expect(r.session.token).toBe('jeton-entete');
    expect(r.session.acces).toEqual({ identifiant: 'camille.exemple', uuid: 'uuid-test', typeCompte: 'E', accessToken: 'acces-1', appareil: undefined });

    const e = s.envois[0]!;
    expect(e.url.origin + e.url.pathname).toBe('https://api.ecoledirecte.com/v3/login.awp');
    expect(e.url.searchParams.get('v')).toBeTruthy();
    // Le mot de passe passe tel quel, encodage spécial compris (hypothèse documentée).
    expect(e.data).toMatchObject({ identifiant: 'camille.exemple', motdepasse: 'mdp%secret+é', isReLogin: false, sesouvenirdemoi: true, uuid: 'uuid-test' });
    expect(e.data).not.toHaveProperty('cn');
    // Jeton GTK demandé juste avant et renvoyé en en-tête.
    expect(e.entetes['X-Gtk']).toBe('gtk-test');
    expect(e.entetes['User-Agent']).toContain('EDMOBILE v');
  });

  test('sans en-tête x-token, prend le jeton du corps', async () => {
    fauxServeur().repond(loginEleve);
    const r = await connexion(IDS);
    expect(r.etape === 'connecte' && r.session.token).toBe('jeton-session-eleve');
  });

  test('élève : profil du domaine', async () => {
    fauxServeur().repond(loginEleve);
    const r = await connexion(IDS);
    if (r.etape !== 'connecte') throw new Error();
    expect(versProfil(r.session.comptes[0]!)).toEqual({
      id: '4242',
      type: 'eleve',
      prenom: 'Camille',
      nom: 'EXEMPLE',
      eleves: [{ id: '4242', prenom: 'Camille', nom: 'EXEMPLE', classe: '3ème A', etablissement: 'Collège Imaginaire' }],
    });
  });

  test('parent avec plusieurs enfants', async () => {
    fauxServeur().repond(loginParent);
    const r = await connexion(IDS);
    if (r.etape !== 'connecte') throw new Error();
    expect(r.session.acces.typeCompte).toBe('1');
    const p = versProfil(r.session.comptes[0]!);
    expect(p.type).toBe('parent');
    expect(p.eleves.map((e) => [e.id, e.classe])).toEqual([
      ['501', '2nde 4'],
      ['502', '6ème B'],
    ]);
  });

  test('profils avec champs null ou absents (vu chez ED) : rien d’inventé', () => {
    const base = { idLogin: 1, id: 7, prenom: 'P', nom: 'N' };
    expect(versProfil({ ...base, typeCompte: 'E', nomEtablissement: null, profile: { nomEtablissement: 'Lycée', classe: {} } }).eleves[0]).toMatchObject({
      etablissement: 'Lycée',
      classe: undefined,
    });
    expect(versProfil({ ...base, typeCompte: 'E', profile: null }).eleves[0]).toMatchObject({ etablissement: undefined, classe: undefined });
    expect(versProfil({ ...base, typeCompte: '1', profile: { eleves: [{ id: 3, prenom: 'E', nom: 'N', classe: null }] } }).eleves[0]!.classe).toBeUndefined();
    expect(versProfil({ ...base, typeCompte: '1' }).eleves).toEqual([]);
  });

  test('mauvais identifiants : erreur typée, sans le mot de passe', async () => {
    fauxServeur().repond(login505);
    const e = await erreurDe(connexion(IDS));
    expect(e.type).toBe('identifiants');
    expect(`${e.message} ${e.detail}`).not.toContain('secret');
  });

  test('double authentification : QCM décodé, réponse encodée, clé d’appareil réutilisée', async () => {
    const s = fauxServeur().repond(loginQcm, { '2fa-token': 'jeton-2fa' }).repond(doubleauthGet).repond(doubleauthPost).repond(loginEleve);

    const r = await connexion(IDS);
    expect(r).toEqual({
      etape: 'qcm',
      jeton2fa: 'jeton-2fa',
      question: 'Quelle est votre année de naissance ?',
      propositions: Array.from({ length: 15 }, (_, i) => String(2004 + i)),
    });
    expect(s.envois[1]!.url.searchParams.get('verbe')).toBe('get');
    expect(s.envois[1]!.entetes['2fa-token']).toBe('jeton-2fa');

    const appareil = await repondreQCM('jeton-2fa', '2011');
    expect(appareil).toEqual({ cn: 'cn-appareil-fictif', cv: 'cv-appareil-fictif' });
    expect(s.envois[2]!.url.searchParams.get('verbe')).toBe('post');
    expect(s.envois[2]!.data).toEqual({ choix: encoderBase64('2011') });

    const fin = await connexion({ ...IDS, appareil });
    expect(fin.etape === 'connecte' && fin.session.acces.appareil).toEqual(appareil);
    expect(s.envois[3]!.data).toMatchObject({ cn: 'cn-appareil-fictif', cv: 'cv-appareil-fictif', fa: [appareil] });
  });

  test('mauvaise réponse au QCM', async () => {
    fauxServeur().repond({ code: 505, data: {} });
    expect((await erreurDe(repondreQCM('j', 'x'))).type).toBe('qcm-echoue');
  });

  test('QCM sans jeton 2FA : erreur claire', async () => {
    fauxServeur().repond({ ...loginQcm, token: '' });
    expect((await erreurDe(connexion(IDS))).type).toBe('reponse-inattendue');
  });

  test.each([
    [{ code: 517, data: {} }, 'version-api'],
    [{ code: 999, data: {} }, 'serveur'],
    [{ code: 200, token: 't', data: { accounts: [] } }, 'reponse-inattendue'],
    [{ code: 200, data: { accounts: [{ id: 'pas un nombre' }] } }, 'reponse-inattendue'],
    [{ code: 200, data: { accounts: [{ ...loginEleve.data.accounts[0], accessToken: undefined }] } }, 'reponse-inattendue'],
    [{ pasDeCode: true }, 'reponse-inattendue'],
  ])('réponse %j → %s', async (json, type) => {
    fauxServeur().repond(json);
    expect((await erreurDe(connexion(IDS))).type).toBe(type);
  });

  test('réponse non JSON et panne serveur', async () => {
    fauxServeur().repondTexte('<html>maintenance</html>', 200).repondTexte('erreur', 503);
    expect((await erreurDe(connexion(IDS))).type).toBe('reponse-inattendue');
    expect((await erreurDe(connexion(IDS))).type).toBe('serveur');
  });

  test('réseau coupé', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));
    expect((await erreurDe(connexion(IDS))).type).toBe('reseau');
  });
});

describe('session', () => {
  const session = (): Session => ({
    token: 'jeton-perime',
    comptes: loginEleve.data.accounts,
    acces: { identifiant: 'camille.exemple', uuid: 'uuid-test', typeCompte: 'E', accessToken: 'acces-1', appareil: { cn: 'c', cv: 'v' } },
  });
  const loginRenouvele = { ...loginEleve, token: 'jeton-neuf', data: { accounts: [{ ...loginEleve.data.accounts[0], accessToken: 'acces-2' }] } };

  test('renouvelle le jeton à chaque réponse', async () => {
    const s = fauxServeur()
      .repond({ code: 200, data: { a: 1 } }, { 'x-token': 'jeton-2' })
      .repond({ code: 200, data: {} });
    const c = new ClientED({ ...session(), token: 'jeton-1' }, jest.fn());
    await c.post('/eleves/4242/notes.awp');
    await c.post('/eleves/4242/notes.awp');
    expect(s.envois.map((e) => e.entetes['X-Token'])).toEqual(['jeton-1', 'jeton-2']);
    expect(s.envois[0]!.url.pathname).toBe('/v3/eleves/4242/notes.awp');
  });

  test('session expirée : reconnexion silencieuse sans mot de passe, nouvel accès sauvegardé', async () => {
    const s = fauxServeur()
      .repond({ code: 525, data: {} })
      .repond(loginRenouvele)
      .repond({ code: 200, data: { ok: true } });
    const sauver = jest.fn();
    const c = new ClientED(session(), sauver);
    expect(await c.post('/eleves/4242/notes.awp')).toEqual({ ok: true });

    expect(s.envois[1]!.data).toEqual({
      identifiant: 'camille.exemple',
      uuid: 'uuid-test',
      isReLogin: true,
      motdepasse: '???',
      typeCompte: 'E',
      accesstoken: 'acces-1',
      fa: [{ cn: 'c', cv: 'v' }],
    });
    expect(s.envois[2]!.entetes['X-Token']).toBe('jeton-neuf');
    expect(sauver).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'acces-2' }));
  });

  test('expirations simultanées : une seule reconnexion (accessToken à usage unique)', async () => {
    const s = fauxServeur()
      .repond({ code: 520, data: {} })
      .repond({ code: 520, data: {} })
      .repond(loginRenouvele)
      .repond({ code: 200, data: 1 })
      .repond({ code: 200, data: 2 });
    const c = new ClientED(session(), jest.fn());
    await Promise.all([c.post('/a.awp'), c.post('/b.awp')]);
    expect(s.envois.filter((e) => e.data.isReLogin === true)).toHaveLength(1);
  });

  test('reconnexion refusée : session expirée', async () => {
    fauxServeur().repond({ code: 525, data: {} }).repond({ code: 505, data: {} });
    const sauver = jest.fn();
    const e = await erreurDe(new ClientED(session(), sauver).post('/a.awp'));
    expect(e.type).toBe('session-expiree');
    expect(sauver).not.toHaveBeenCalled();
  });

  test('devoir coché : verbe put, identifiants numériques', async () => {
    const s = fauxServeur().repond({ code: 200, data: {} });
    await new ClientED({ ...session(), token: 'jeton-1' }, jest.fn()).marquerDevoirs('4242', ['501'], ['502']);
    expect(s.envois[0]!.url.searchParams.get('verbe')).toBe('put');
    expect(s.envois[0]!.url.pathname).toBe('/v3/Eleves/4242/cahierdetexte.awp');
    expect(s.envois[0]!.data).toEqual({ idDevoirsEffectues: [501], idDevoirsNonEffectues: [502] });
  });

  test('devoirs : la consigne est demandée pour les prochains jours, pas pour les jours passés', async () => {
    const s = fauxServeur()
      .repond({ code: 200, data: { '2026-11-02': [{ idDevoir: 1, matiere: 'A' }], '2026-11-18': [{ idDevoir: 2, matiere: 'B' }] } })
      .repond({ code: 200, data: { date: '2026-11-18', matieres: [] } });
    const d = await new ClientED({ ...session(), token: 'jeton-1' }, jest.fn()).devoirs('4242', 7, '2026-11-17');
    expect(s.envois.map((e) => e.url.pathname)).toEqual(['/v3/Eleves/4242/cahierdetexte.awp', '/v3/Eleves/4242/cahierdetexte/2026-11-18.awp']);
    expect(d.map((x) => x.id)).toEqual(['1', '2']);
  });

  test('reconnexion directe', async () => {
    fauxServeur().repond(loginRenouvele);
    expect((await reconnexion(session().acces)).acces.accessToken).toBe('acces-2');
  });
});

test('base64 UTF-8 aller-retour', () => {
  for (const t of ['année', 'Œuvre — « test »', '日本', '']) expect(decoderBase64(encoderBase64(t))).toBe(t);
  expect(decoderBase64('w6k=')).toBe('é');
});
