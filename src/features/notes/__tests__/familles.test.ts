import { instantaneDemo } from '@/demo/notes';

import { familleDe } from '../familles';
import { evolution, evolutionsMatieres } from '../vue';

test.each([
  ['MATHS', 'MATHEMATIQUES TC', 'sciences'],
  ['PH-CH', 'SPE PHYSIQUE MATHS', 'sciences'],
  ['ETT', '2I2D', 'sciences'],
  ['SVT', 'Sciences de la vie et de la Terre', 'sciences'],
  ['AGL1', 'ANGLAIS LV1-ETLV', 'langues'],
  ['ALL2', 'ALLEMAND LV2', 'langues'],
  ['ESP2', 'Espagnol LV2', 'langues'],
  ['PHILO', 'PHILOSOPHIE', 'lettres'],
  ['HI-GE', 'HISTOIRE-GEOGRAPHIE', 'lettres'],
  ['EMC', 'ENS. MORAL & CIVIQUE', 'lettres'],
  ['FRANC', 'Français', 'lettres'],
  ['EPS', 'ED.PHYSIQUE & SPORT.', 'arts'],
  ['MUSI', 'Éducation musicale', 'arts'],
  ['VS', 'Vie de classe', 'autres'],
])('%s / %s → %s', (code, libelle, famille) => expect(familleDe(code, libelle)).toBe(famille));

test('évolution : une valeur par date de note, la dernière égale à la moyenne prévue', () => {
  const i = instantaneDemo();
  const p = i.donnees.periodes[0]!;
  const e = evolution(i.donnees, p);
  expect(e.length).toBeGreaterThan(5);
  expect(e.map((x) => x.date)).toEqual([...e.map((x) => x.date)].sort());
  const m = evolution(i.donnees, p, 'MATHS');
  expect(m.at(-1)!.moyenne).toBeGreaterThan(0);
  expect(evolution(i.donnees, p, 'INCONNUE')).toEqual([]);
});

test('évolutions par matière : même dernière valeur que la courbe de la matière', () => {
  const i = instantaneDemo();
  const p = i.donnees.periodes[0]!;
  const e = evolutionsMatieres(i.donnees, p);
  expect(e.MATHS!.at(-1)).toBeCloseTo(evolution(i.donnees, p, 'MATHS').at(-1)!.moyenne, 10);
  expect(e.MATHS!.length).toBeLessThanOrEqual(evolution(i.donnees, p, 'MATHS').length);
  expect(e.INCONNUE).toBeUndefined();
});
