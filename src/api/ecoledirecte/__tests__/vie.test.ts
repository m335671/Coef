import edt from '../../../../fixtures/ed/emploidutemps.json';
import liste from '../../../../fixtures/ed/cahierdetexte.json';
import jour from '../../../../fixtures/ed/cahierdetexte-jour.json';
import vie from '../../../../fixtures/ed/viescolaire.json';
import { htmlEnTexte, versCours, versDevoirs, versVieScolaire } from '../mapping';
import { cahierDuJour, devoirsAFaire, emploiDuTemps, vieScolaire } from '../schemas';

test('HTML ED → texte : paragraphes, listes, entités', () => {
  expect(htmlEnTexte('<p>Exercices 12 &agrave; 15.</p><p>Revoir<br>d&#39;une suite.</p>')).toBe("Exercices 12 à 15.\nRevoir\nd'une suite.");
  expect(htmlEnTexte('<ul><li>Lire</li><li>Écrire</li></ul>')).toBe('• Lire\n• Écrire');
  expect(htmlEnTexte('&inconnue; <b>gras</b>')).toBe('&inconnue; gras');
});

test('emploi du temps : cours triés, annulés et modifiés repérés, horaires courts', () => {
  const c = versCours(emploiDuTemps.parse(edt.data));
  expect(c).toHaveLength(17);
  expect(c[0]).toMatchObject({ debut: '2026-11-16 08:00', fin: '2026-11-16 10:00', matiere: 'MATHEMATIQUES', salle: 'B204', annule: false });
  expect(c.filter((x) => x.annule).map((x) => x.codeMatiere)).toEqual(['ALL2']);
  expect(c.filter((x) => x.modifie).map((x) => x.codeMatiere)).toEqual(['HI-GE']);
});

test('devoirs : par date, consigne décodée pour les jours chargés, base64 invalide ignoré', () => {
  const d = versDevoirs(devoirsAFaire.parse(liste.data), [cahierDuJour.parse(jour.data)]);
  expect(d.map((x) => [x.pour, x.codeMatiere])).toEqual([
    ['2026-11-18', 'PH-CH'],
    ['2026-11-19', 'MATHS'],
    ['2026-11-19', 'PHILO'],
    ['2026-11-24', 'AGL1'],
  ]);
  expect(d[0]).toMatchObject({ interrogation: true, effectue: false, contenu: undefined });
  expect(d[1]!.contenu).toBe("Exercices 12 à 15 page 84.\nRevoir la définition de la limite\nd'une suite.");
  expect(d[1]!.effectue).toBe(true);
  expect(d[2]!.contenu).toBe('• Lire le texte distribué\n• Préparer deux questions');
  const casse = versDevoirs({ '2026-11-30': [{ idDevoir: 9, matiere: 'M' }] }, [{ date: '2026-11-30', matieres: [{ aFaire: { idDevoir: 9, contenu: '%%%' } }] }]);
  expect(casse[0]!.contenu).toBeUndefined();
});

test('vie scolaire : types reconnus, plus récents d’abord, champs vides absents', () => {
  const v = versVieScolaire(vieScolaire.parse(vie.data));
  expect(v.map((x) => x.type)).toEqual(['retard', 'encouragement', 'absence', 'punition', 'absence']);
  expect(v.find((x) => x.type === 'retard')).toMatchObject({ libelle: '10 minutes', justifie: false, motif: undefined });
  expect(versVieScolaire({ absencesRetards: [{ id: 1, typeElement: 'Incident', date: '2026-01-01' }] })[0]!.type).toBe('autre');
  expect(versVieScolaire({})).toEqual([]);
});
