import documents from '../../../../fixtures/ed/documents.json';
import message from '../../../../fixtures/ed/message.json';
import messages from '../../../../fixtures/ed/messages.json';
import { anonymiser } from '../capture';
import { anneeScolaire, htmlEnFragments, versDocuments, versMessage, versMessages } from '../mapping';
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
    "Bonjour,\nLa sortie au musée aura lieu le jeudi 26 novembre, rendez-vous devant le musée Imaginaire.\n• Rendez-vous à 8 h devant le lycée\n• Prévoir un pique-nique\n\nMerci de rapporter l'autorisation signée.\nM. Exemple\nProfesseur d'histoire",
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

describe('mise en forme des messages', () => {
  // Forme du message officiel (exemple inventé) : paragraphes grisés, gras, surlignage rouge, image intégrée, signature.
  const PNG = 'data:image/png;base64,iVBORw0KGgo=';
  const html =
    '<p style="background-color:#f3f4f6">Bonjour,</p>' +
    '<p style="background:#f3f4f6">À compter du <strong>Vendredi 27 Novembre</strong>, tous les élèves sont attendus au ' +
    '<span style="background-color: rgb(231, 76, 60)"><b>Gymnase Imaginaire</b></span> pour l&rsquo;activité.</p>' +
    `<p><img src="${PNG}" alt="plan"></p><p><img src="https://cartes.example.com/plan.png"></p>` +
    '<p>Voir <a href="https://exemple.fr/infos">la page</a>.</p><style>p{color:red}</style>' +
    '<p><b>M. Exemple</b><br><i>Enseignant d’EPS</i></p>';
  const f = htmlEnFragments(html);

  test('gras, surlignage (sans les fonds presque blancs), liens, italique', () => {
    expect(f).toContainEqual({ texte: 'Vendredi 27 Novembre', gras: true });
    expect(f).toContainEqual({ texte: 'Gymnase Imaginaire', gras: true, surligne: '#e74c3c' });
    expect(f).toContainEqual({ texte: 'la page', lien: 'https://exemple.fr/infos' });
    expect(f).toContainEqual({ texte: 'Enseignant d’EPS', italique: true });
    expect(f.some((x) => 'texte' in x && x.surligne === '#f3f4f6')).toBe(false);
  });

  test('image intégrée gardée, image hébergée ailleurs jamais chargée, CSS ignoré', () => {
    expect(f).toContainEqual({ image: PNG });
    const texte = f.map((x) => ('texte' in x ? x.texte : '[img]')).join('');
    expect(texte).toContain('[image non affichée]');
    expect(texte).not.toContain('cartes.example.com');
    expect(texte).not.toContain('color:red');
  });

  test('texte : paragraphes séparés, apostrophes décodées, pas de blanc au début ni à la fin', () => {
    const texte = f.map((x) => ('texte' in x ? x.texte : '[img]')).join('');
    expect(texte.startsWith('Bonjour,\n')).toBe(true);
    expect(texte).toContain('pour l’activité.');
    expect(texte).not.toMatch(/\n{3,}/);
    expect(texte.endsWith('Enseignant d’EPS')).toBe(true);
  });

  test('versMessage : texte simple et version mise en forme', () => {
    const m = versMessage(
      messageED.parse({ ...message.data, content: Buffer.from('<p>A <b>B</b></p>', 'utf8').toString('base64') }),
      '2026-2027',
    );
    expect(m.contenu).toBe('A B');
    expect(m.riche).toEqual([{ texte: 'A ' }, { texte: 'B', gras: true }]);
  });
});
