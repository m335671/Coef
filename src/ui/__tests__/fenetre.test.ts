import { fenetre, valeurAu } from '../format';

const pts = [
  { date: '2026-09-10', valeur: 12 },
  { date: '2026-10-01', valeur: 13 },
  { date: '2026-11-05', valeur: 14 },
];

test('fenêtre : part de la valeur en cours au début choisi', () => {
  expect(fenetre(pts, '2026-10-15')).toEqual([
    { date: '2026-10-15', valeur: 13 },
    { date: '2026-11-05', valeur: 14 },
  ]);
  expect(fenetre(pts, '2026-10-01')).toEqual(pts.slice(1));
  expect(fenetre(pts, '2026-01-01')).toEqual(pts);
  expect(fenetre(pts, '2026-12-01')).toEqual([{ date: '2026-12-01', valeur: 14 }]);
});

test('valeur au jour : dernier point à cette date ou avant', () => {
  expect(valeurAu(pts, '2026-09-01')).toBeUndefined();
  expect(valeurAu(pts, '2026-10-01')).toBe(13);
  expect(valeurAu(pts, '2026-10-20')).toBe(13);
  expect(valeurAu(pts, '2027-01-01')).toBe(14);
});
