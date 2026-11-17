import { instantaneDemo } from '@/demo/notes';
import type { Note } from '@/domain/types';

import { annonceRemplacement, remplacerSimulees } from '../remplacement';

const d = instantaneDemo().donnees;
const p = d.periodes[0]!;
const cle = `demo:${p.code}`;
const note = (x: Partial<Note>): Note => ({
  id: 'n1',
  periodeCode: p.code,
  matiereCode: 'MATHS',
  devoir: 'DS',
  date: p.debut,
  valeurBrute: '14',
  noteSur: 20,
  coef: 1,
  nonSignificative: false,
  ...x,
});
const sim = {
  notes: {
    [cle]: [
      { matiereCode: 'MATHS', valeur: 15, noteSur: 20, coef: 1 },
      { matiereCode: 'MATHS', valeur: 12, noteSur: 20, coef: 1 },
      { matiereCode: 'PHILO', valeur: 10, noteSur: 20, coef: 1 },
    ],
  },
};

test('la vraie note prend la place de la plus ancienne simulée de sa matière', () => {
  const n = note({});
  const r = remplacerSimulees(sim, 'demo', [n], { ...d, notes: [...d.notes, n] }, '2026-11-17T10:00:00Z');
  expect(r.notes[cle]!.map((h) => [h.matiereCode, h.valeur])).toEqual([
    ['MATHS', 12],
    ['PHILO', 10],
  ]);
  expect(r.nouveaux).toEqual([{ cle, hypothese: sim.notes[cle]![0], noteId: 'n1', date: '2026-11-17T10:00:00Z' }]);
  expect(r.remplacees).toHaveLength(1);
  const a = annonceRemplacement(r.nouveaux, { ...d, notes: [...d.notes, n] }, () => 'Maths');
  expect(a).toEqual({ titre: 'Ta note simulée est arrivée', texte: 'Maths 14/20 (simulée : 15/20). La vraie note remplace la simulée.' });
});

test('rien ne bouge : autre élève, autre matière, hors période, note non chiffrée ou non significative', () => {
  const autres = [
    note({ id: 'a', matiereCode: 'SVT' }),
    note({ id: 'b', date: '1999-01-01' }),
    note({ id: 'c', valeurBrute: 'Abs' }),
    note({ id: 'e', nonSignificative: true }),
  ];
  expect(remplacerSimulees(sim, 'demo', autres, d, 'x').nouveaux).toEqual([]);
  expect(remplacerSimulees(sim, 'autre', [note({})], d, 'x').nouveaux).toEqual([]);
  expect(annonceRemplacement([], d, () => '')).toBeUndefined();
});

test('deux vraies notes, deux simulées remplacées ; l’historique garde les plus récentes en tête', () => {
  const ns = [note({ id: 'n2', date: p.fin }), note({ id: 'n1' })];
  const r = remplacerSimulees({ ...sim, remplacees: [{ cle, hypothese: sim.notes[cle]![2]!, noteId: 'vieux', date: 'avant' }] }, 'demo', ns, d, 'x');
  expect(r.nouveaux.map((x) => x.noteId)).toEqual(['n1', 'n2']);
  expect(r.notes[cle]!.map((h) => h.matiereCode)).toEqual(['PHILO']);
  expect(r.remplacees.map((x) => x.noteId)).toEqual(['n1', 'n2', 'vieux']);
});
