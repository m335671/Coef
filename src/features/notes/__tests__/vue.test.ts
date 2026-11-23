import { instantaneDemo } from '@/demo/notes';

import { periodeParDefaut, periodesAffichees, vueNotes } from '../vue';

const i = instantaneDemo();

test('périodes affichées : sans examen blanc vide, avec relevés et année', () => {
  expect(periodesAffichees(i.donnees).map((p) => p.code)).toEqual(['A001', 'A001R001', 'A001R002', 'A002', 'A999Z']);
});

test('période par défaut : le trimestre en cours, sinon le dernier avec des notes', () => {
  expect(periodeParDefaut(i.donnees, '2026-11-17')?.code).toBe('A001');
  expect(periodeParDefaut(i.donnees, '2027-08-01')?.code).toBe('A001');
  expect(periodeParDefaut({ ...i.donnees, notes: [] }, '2027-08-01')?.code).toBe('A001');
  // Premier jour du 2e trimestre, encore sans note : le 1er reste affiché.
  expect(periodeParDefaut(i.donnees, '2026-11-23')?.code).toBe('A001');
  // Sans aucune note : le trimestre en cours.
  expect(periodeParDefaut({ ...i.donnees, notes: [] }, '2026-11-23')?.code).toBe('A002');
});

test('vue du trimestre : calcul vérifié contre ED, nouvelles notes du dernier jour, écart depuis la synchro', () => {
  const v = vueNotes(i, 'A001')!;
  expect(v.calibration.verifie).toBe(true);
  expect(v.nouvelles.map((n) => n.dateSaisie)).toEqual(['2026-11-16', '2026-11-16']);
  expect(v.ecart).toBeCloseTo(v.resultat.generale! - i.nouveautes.generalesAvant.A001!, 12);
  expect(v.depuis).toBe(i.nouveautes.date);
  expect(v.enAvance).toBe(2);
  // La réglette d'une matière à sous-matières reprend les notes de ses sous-matières.
  const ett = v.matieres.find((m) => m.matiere.code === 'ETT')!;
  expect(ett.sur20.length).toBe(ett.matiere.sousMatieres.flatMap((s) => s.notes).filter((n) => !n.exclue).length);
});

test('relevé fermé : pas de nouvelles notes, pas d’écart ; période inconnue : rien', () => {
  const v = vueNotes(i, 'A001R001')!;
  expect(v.nouvelles).toEqual([]);
  expect(v.ecart).toBeCloseTo(0, 12);
  expect(vueNotes(i, 'XXXX')).toBeUndefined();
  expect(vueNotes({ ...i, nouveautes: { ...i.nouveautes, generalesAvant: {} } }, 'A001')!.ecart).toBeUndefined();
});
