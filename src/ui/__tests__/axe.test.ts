import { axeMoyennes, datesAxe } from '../format';

test.each([
  [[], { bas: 0, haut: 20, pas: 5 }],
  [[12.4, 13.1], { bas: 11, haut: 15, pas: 1 }],
  [[8, 17.5], { bas: 6, haut: 20, pas: 2 }],
  [[0, 20], { bas: 0, haut: 20, pas: 5 }],
  [[19.8], { bas: 18, haut: 20, pas: 1 }],
])('axe des moyennes pour %j', (valeurs, attendu) => expect(axeMoyennes(valeurs)).toEqual(attendu));

test('les bornes contiennent toujours les valeurs, restent dans 0–20 et tombent sur une graduation', () => {
  for (let a = 0; a <= 20; a += 0.7)
    for (let b = a; b <= 20; b += 1.3) {
      const { bas, haut, pas } = axeMoyennes([a, b]);
      expect(bas).toBeLessThanOrEqual(a);
      expect(haut).toBeGreaterThanOrEqual(b);
      expect(bas).toBeGreaterThanOrEqual(0);
      expect(haut).toBeLessThanOrEqual(20);
      expect(Number.isInteger((haut - bas) / pas)).toBe(true);
    }
});

test('axe des dates : un pas régulier (mois, sinon 1er et 15), sinon quatre dates égales', () => {
  expect(datesAxe('2026-09-02', '2026-11-19').map((r) => r.libelle)).toEqual(['15 sept.', '1 oct.', '15 oct.', '1 nov.', '15 nov.']);
  expect(datesAxe('2026-09-01', '2027-06-30').map((r) => r.libelle)).toEqual(['oct.', 'nov.', 'déc.', 'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin']);
  expect(datesAxe('2026-11-02', '2026-11-22')).toEqual([
    { date: '2026-11-02', libelle: '2 nov.' },
    { date: '2026-11-08', libelle: '8 nov.' },
    { date: '2026-11-15', libelle: '15 nov.' },
    { date: '2026-11-22', libelle: '22 nov.' },
  ]);
});
