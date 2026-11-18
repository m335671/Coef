import type { Note } from '@/domain/types';

import { deplacer, ordonner, trierNotes } from '../ordre';

test('ordonner : l’ordre choisi d’abord, les inconnus ensuite dans leur ordre', () => {
  expect(ordonner(['a', 'b', 'c', 'd'], ['c', 'a', 'z'], (x) => x)).toEqual(['c', 'a', 'b', 'd']);
  expect(ordonner(['a', 'b'], [], (x) => x)).toEqual(['a', 'b']);
});

test('deplacer : un cran, rien aux bords', () => {
  expect(deplacer(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
  expect(deplacer(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b']);
  expect(deplacer(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
  expect(deplacer(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c']);
});

const note = (id: string, valeurBrute: string, noteSur: number, date: string) => ({ id, valeurBrute, noteSur, date }) as Note;

test('trierNotes : ramené sur 20, absences à la fin', () => {
  const n = [note('a', '8', 10, '2026-10-01'), note('b', '12', 20, '2026-10-03'), note('c', 'Abs', 20, '2026-10-05'), note('d', '19', 20, '2026-10-02')];
  expect(trierNotes(n, 'meilleures').map((x) => x.id)).toEqual(['d', 'a', 'b', 'c']);
  expect(trierNotes(n, 'moins-bonnes').map((x) => x.id)).toEqual(['b', 'a', 'd', 'c']);
  expect(trierNotes(n, 'recentes').map((x) => x.id)).toEqual(['c', 'b', 'd', 'a']);
});
