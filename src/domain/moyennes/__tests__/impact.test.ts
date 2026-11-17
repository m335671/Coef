import type { MatierePeriode, Note, Periode } from '../../types';
import { impactMatiere, impactNote, leviers } from '../impact';

const periode = (matieres: MatierePeriode[]): Periode => ({ code: 'A001', libelle: 'T1', type: 'trimestre', debut: '2026-09-01', fin: '2026-11-30', cloture: false, matieres });
const note = (id: string, matiereCode: string, valeurBrute: string, coef = 1): Note => ({
  id,
  periodeCode: 'A001',
  matiereCode,
  devoir: '',
  date: '2026-10-01',
  valeurBrute,
  noteSur: 20,
  coef,
  nonSignificative: false,
});

const p = periode([
  { code: 'MATHS', libelle: 'Maths', coef: 3 },
  { code: 'PHILO', libelle: 'Philo', coef: 1 },
  { code: 'EPS', libelle: 'EPS', coef: 2 },
]);
const notes = [note('a', 'MATHS', '8'), note('b', 'MATHS', '12'), note('c', 'PHILO', '16')];

test('impact d’une note : sur sa matière et sur la générale', () => {
  // Avec : MATHS 10, PHILO 16 → (30 + 16) / 4 = 11,5. Sans « b » : MATHS 8 → (24 + 16) / 4 = 10.
  expect(impactNote(p, notes, [], 'b')).toEqual({ generale: 1.5, matiere: 2 });
  // Seule note de sa matière : la matière disparaît, son impact sur elle-même n'existe pas.
  expect(impactNote(p, notes, [], 'c')).toEqual({ generale: 11.5 - 10, matiere: undefined });
  expect(impactNote(p, notes, [], 'inconnue')).toEqual({});
});

test('impact d’une matière : générale avec moins générale sans', () => {
  expect(impactMatiere(p, notes, [], 'PHILO')).toBeCloseTo(11.5 - 10, 12);
  expect(impactMatiere(p, notes, [], 'EPS')).toBe(0);
  expect(impactMatiere(p, [note('c', 'PHILO', '16')], [], 'PHILO')).toBeUndefined();
});

test('leviers vers une générale visée : du plus accessible au moins accessible', () => {
  const l = leviers(p, notes, [], 12);
  // MATHS : 12 suffit (moyenne 10,67 ; (32 + 16) / 4 = 12). EPS sans note : 13, (30 + 16 + 26) / 6 = 12.
  // PHILO : il faudrait 19,99 (moyenne 17,995, arrondie à 18).
  expect(l.map((x) => [x.code, x.noteSeule])).toEqual([
    ['MATHS', 12],
    ['EPS', 13],
    ['PHILO', 19.99], // 17,995 arrondi à 18 par ED avant la générale
  ]);
  expect(l.find((x) => x.code === 'EPS')!.parPoint).toBe(0);
  expect(l.find((x) => x.code === 'MATHS')!.parPoint).toBeCloseTo(3 / 4, 12);
  // Objectif hors d'atteinte avec une seule note : impossibles en fin de liste, les plus lourdes d'abord.
  const loin = leviers(p, notes, [], 19.5);
  expect(loin.every((x) => x.noteSeule === undefined)).toBe(true);
  expect(loin.map((x) => x.code)).toEqual(['MATHS', 'PHILO', 'EPS']);
  // 19,5 de générale : il faudrait 20,67 de moyenne en maths (11,5 → 19,5 = +8 ; ×4/3), hors d'atteinte.
  expect(loin[0]!.moyenneVisee).toBeCloseTo(10 + 8 / (3 / 4), 9);
  // 13 de générale, pas atteignable en une note mais avec une moyenne de 12 en maths : il passe devant.
  const moyen = leviers(p, notes, [], 13);
  expect(moyen.find((x) => x.code === 'MATHS')!.moyenneVisee).toBeCloseTo(12, 9);
});

test('sans pondération par coefficient de matière', () => {
  const l = leviers(p, notes, [], 12, { parametrage: { moyenneCoefMatiere: false } });
  expect(l.find((x) => x.code === 'MATHS')!.parPoint).toBe(0.5);
});
