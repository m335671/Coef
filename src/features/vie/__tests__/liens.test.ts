import { decouperLiens } from '../liens';

test('liens : adresses web et e-mail repérées, ponctuation finale laissée au texte', () => {
  expect(decouperLiens('Voir https://exemple.fr/a?b=1. Écrire à vie.scolaire@lycee.fr, ou www.site.fr')).toEqual([
    { texte: 'Voir ' },
    { texte: 'https://exemple.fr/a?b=1', url: 'https://exemple.fr/a?b=1' },
    { texte: '. Écrire à ' },
    { texte: 'vie.scolaire@lycee.fr', url: 'mailto:vie.scolaire@lycee.fr' },
    { texte: ', ou ' },
    { texte: 'www.site.fr', url: 'https://www.site.fr' },
  ]);
  expect(decouperLiens('Rien ici')).toEqual([{ texte: 'Rien ici' }]);
});
