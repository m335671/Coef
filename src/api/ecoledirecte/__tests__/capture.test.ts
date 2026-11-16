import parent from '../../../../fixtures/ed/login-parent.json';
import { decoderBase64 } from '../base64';
import { anonymiser, capturer, partSuivanteCaptures } from '../capture';

const SECRETS = ['jeton-session-parent', 'acces-parent-1', 'Dominique', 'FICTIF', 'Lycée de Nulle Part', 'Alex', 'Sam', 2002, 777, 501, 502];

test('aucune valeur identifiante ne survit, la forme est gardée', () => {
  const texte = JSON.stringify(anonymiser(parent));
  for (const s of SECRETS) expect(texte).not.toContain(JSON.stringify(s));
  const a = anonymiser(parent) as typeof parent;
  const compte = a.data.accounts[0]!;
  expect(a.code).toBe(200);
  expect(compte.typeCompte).toBe('1');
  expect(compte.main).toBe(true);
  expect(compte.profile.eleves[0]!.classe.libelle).toBe('2nde 4');
  // Même valeur d'origine → même valeur fabriquée (le nom de famille partagé reste partagé).
  expect(compte.profile.eleves[0]!.nom).toBe(compte.profile.eleves[1]!.nom);
});

test('les notes restent intactes, les professeurs et e-mails non', () => {
  const a = anonymiser({ notes: [{ valeur: '12,5', noteSur: '20', coef: '2', nombreNotes: 3, commentaire: 'voir a.b@c.fr' }], professeurs: [{ nom: 'X', id: 4 }] });
  expect(a).toEqual({
    notes: [{ valeur: '12,5', noteSur: '20', coef: '2', nombreNotes: 3, commentaire: expect.not.stringContaining('@') }],
    professeurs: [{ nom: expect.not.stringMatching(/^X$/), id: expect.not.stringMatching(/^4$/) }],
  });
});

test('le QCM reste du base64 valide, sans les vraies propositions', () => {
  const a = anonymiser({ question: btoa('Quelle est votre date de naissance ?'), propositions: [btoa('01/02/2010')] }) as { question: string; propositions: string[] };
  expect(decoderBase64(a.question)).toBe('question-0');
  expect(decoderBase64(a.propositions[0]!)).toBe('propositions-1');
});

test('fuites vues à l’essai réel : UAI, badge de cantine, foStat, appréciations', () => {
  const a = anonymiser({
    codeOgec: '0000000X',
    modules: [{ code: 'CANTINE_BARCODE', badge: 0, params: { numeroBadge: '123456789', autre: 'ref 9876543' } }],
    foStat: 'ABC',
    appreciations: ['Élève sérieuse'],
    moyenne: '12,75',
    dateDebut: '2026-09-02',
  });
  const texte = JSON.stringify(a);
  for (const s of ['0000000X', '123456789', '9876543', 'ABC', 'sérieuse']) expect(texte).not.toContain(s);
  expect(a).toMatchObject({ modules: [{ code: 'CANTINE_BARCODE', badge: 0 }], moyenne: '12,75', dateDebut: '2026-09-02' });
});

test('partage en parts qui se recollent', () => {
  capturer('/eleves/42/notes.awp', 200, new Headers({ 'x-token': 'secret' }), { data: { notes: Array.from({ length: 900 }, (_, i) => ({ valeur: `${i % 20}`, devoir: 'Contrôle de cours' })) } });
  const parts = [partSuivanteCaptures()];
  const total = Number(/partie 1\/(\d+)/.exec(parts[0]!)![1]);
  expect(total).toBeGreaterThan(1);
  for (let i = 1; i < total; i++) parts.push(partSuivanteCaptures());
  const json = JSON.parse(parts.map((p) => p.slice(p.indexOf('\n') + 1)).join(''));
  expect(json[0].chemin).toBe('/eleves/<id>/notes.awp');
  expect(json[0].entetes).toEqual(['x-token']);
  expect(JSON.stringify(json)).not.toContain('secret');
  expect(partSuivanteCaptures()).toMatch(/^ED-Clone capture, partie 1\//);
});
