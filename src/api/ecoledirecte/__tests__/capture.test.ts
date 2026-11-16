import parent from '../../../../fixtures/ed/login-parent.json';
import { decoderBase64 } from '../base64';
import { anonymiser } from '../capture';

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
