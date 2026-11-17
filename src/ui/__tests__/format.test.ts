import { ajouterJours, ecart, heure, jour, jourCourt, jourLong, lireNombre, lundiDe, moyenne } from '../format';

test('dates : lundi de la semaine, jours relatifs, libellés', () => {
  expect(lundiDe('2026-11-19')).toBe('2026-11-16');
  expect(lundiDe('2026-11-16')).toBe('2026-11-16');
  expect(lundiDe('2026-11-22')).toBe('2026-11-16');
  expect(ajouterJours('2026-11-30', 1)).toBe('2026-12-01');
  expect(jourLong('2026-11-19')).toBe('jeudi 19 nov.');
  expect(jourCourt('2026-11-16')).toBe('lun.');
  expect(jour('2026-01-05')).toBe('5 janv.');
  expect(heure('2026-11-16 08:00')).toBe('8 h');
  expect(heure('2026-11-16 10:15')).toBe('10 h 15');
});

test('nombres : moyenne, écart signé, saisie', () => {
  expect(moyenne(12.5)).toBe('12,50');
  expect(ecart(0.354)).toBe('+0,35');
  expect(ecart(-1.2)).toBe('−1,20');
  expect(ecart(0)).toBe('0,00');
  expect(lireNombre('14,5')).toBe(14.5);
  expect(lireNombre('abc')).toBeUndefined();
});
