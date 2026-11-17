import documents from '../../../../fixtures/ed/documents.json';
import message from '../../../../fixtures/ed/message.json';
import messages from '../../../../fixtures/ed/messages.json';
import { anonymiser } from '../capture';
import { anneeScolaire, versDocuments, versMessage, versMessages } from '../mapping';
import { documentsED, messageED, messagesRecus } from '../schemas';

test('année scolaire de la messagerie : elle bascule en août', () => {
  expect(anneeScolaire('2026-11-17')).toBe('2026-2027');
  expect(anneeScolaire('2027-03-02')).toBe('2026-2027');
  expect(anneeScolaire('2027-08-20')).toBe('2027-2028');
});

test('messages reçus : plus récents d’abord, expéditeur, non lus, pièces jointes avec leur année', () => {
  const m = versMessages(messagesRecus.parse(messages.data), '2026-2027');
  expect(m.map((x) => [x.id, x.de, x.lu])).toEqual([
    ['701', 'Mme Lambert', false],
    ['702', 'M. Paul MARTIN', true],
    ['703', 'Vie scolaire', true],
  ]);
  expect(m[0]!.date).toBe('2026-11-16 18:02');
  expect(m[0]!.pieces).toEqual([{ id: '9001', libelle: 'autorisation-sortie.pdf', type: 'PIECE_JOINTE', date: '2026-11-16', annee: '2026-2027' }]);
  expect(m[0]!.contenu).toBeUndefined();
});

test('détail d’un message : HTML base64 → texte', () => {
  const m = versMessage(messageED.parse(message.data), '2026-2027');
  expect(m.contenu).toBe(
    "Bonjour,\nLa sortie au musée aura lieu le jeudi 26 novembre.\n• Rendez-vous à 8 h devant le lycée\n• Prévoir un pique-nique\nMerci de rapporter l'autorisation signée.",
  );
  expect(versMessage({ id: 1 }, 'a')).toMatchObject({ sujet: '(sans objet)', de: 'Expéditeur inconnu', lu: true, pieces: [] });
});

test('documents : par catégorie, plus récents d’abord, entrées illisibles et autres enfants ignorés', () => {
  const d = versDocuments(documentsED.parse(documents.data));
  expect(d.map((x) => [x.id, x.categorie, x.type])).toEqual([
    ['8102', 'Notes et bulletins', 'Note'],
    ['8201', 'Vie scolaire', 'Doc'],
    ['8301', 'Administratif', 'Doc'],
    ['8101', 'Notes et bulletins', 'Note'],
  ]);
  const parent = versDocuments(
    { notes: [{ id: 1, libelle: 'A', idEleve: 5 }, { id: 2, libelle: 'B', idEleve: 6 }, { libelle: 'sans id' }], bizarre: [{ id: 3 }] },
    '5',
  );
  expect(parent.map((x) => [x.id, x.categorie])).toEqual([
    ['1', 'Notes et bulletins'],
    ['3', 'bizarre'],
  ]);
});

test('capture : objet, contenu, expéditeur et pièces jointes des messages anonymisés', () => {
  const a = JSON.stringify(anonymiser(message.data));
  for (const secret of ['Sortie au musée', 'LAMBERT', 'autorisation-sortie', 'Claire']) expect(a).not.toContain(secret);
});
