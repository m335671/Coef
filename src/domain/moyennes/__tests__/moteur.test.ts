import * as fc from 'fast-check';

import type { MatierePeriode, Note, Periode } from '../../types';
import { calibrer } from '../calibration';
import { arrondi, calculer, lireNote, notesDeLaPeriode } from '../moteur';
import { avecHypotheses, noteNecessaire, simuler } from '../simulateur';

const periode = (matieres: MatierePeriode[], extra: Partial<Periode> = {}): Periode => ({
  code: 'A001',
  libelle: 'Trimestre 1',
  type: 'trimestre',
  debut: '2026-09-01',
  fin: '2026-11-30',
  cloture: false,
  matieres,
  ...extra,
});

let compteur = 0;
const note = (matiereCode: string, valeurBrute: string, extra: Partial<Note> = {}): Note => ({
  id: `n${compteur++}`,
  periodeCode: 'A001',
  matiereCode,
  devoir: '',
  date: '2026-10-01',
  valeurBrute,
  noteSur: 20,
  coef: 1,
  nonSignificative: false,
  ...extra,
});

const MATHS: MatierePeriode = { code: 'MATHS', libelle: 'Maths', coef: 2 };
const PHILO: MatierePeriode = { code: 'PHILO', libelle: 'Philo', coef: 1 };
const seule = (notes: Note[], m: MatierePeriode = MATHS) => calculer(periode([m]), notes, []).matieres[0]!;

describe('lecture des notes', () => {
  test.each([
    ['12,5', 12.5],
    ['12.5', 12.5],
    [' 14 ', 14],
    ['0', 0],
    ['Abs', undefined],
    ['Abs ', undefined],
    ['Disp', undefined],
    ['NE', undefined],
    ['EA', undefined],
    ['A', undefined],
    ['', undefined],
    ['12,5,3', undefined],
    ['-3', undefined],
  ])('%j → %p', (brute, attendu) => expect(lireNote(brute)).toBe(attendu));

  test('arrondi au centième, demi vers le haut', () => {
    expect(arrondi(16.125)).toBe(16.13);
    expect(arrondi(15.815)).toBe(15.82);
    expect(arrondi(7.714285)).toBe(7.71);
    expect(arrondi(10)).toBe(10);
  });
});

describe('moyenne de matière', () => {
  test('ramène sur 20 et pondère par le coef de la note', () => {
    const m = seule([note('MATHS', '0,75', { noteSur: 10, coef: 0.5 }), note('MATHS', '6,5', { coef: 2 }), note('MATHS', '3,25', { noteSur: 10, coef: 0.5 }), note('MATHS', '10', { noteSur: 10, coef: 0.5 })]);
    expect(m.moyenne).toBeCloseTo(27 / 3.5, 12);
    expect(m.notes.map((n) => n.sur20)).toEqual([1.5, 6.5, 6.5, 20]);
  });

  test('exclut absences, lettres et non significatives, en disant pourquoi', () => {
    const m = seule([note('MATHS', 'Abs '), note('MATHS', '4', { nonSignificative: true }), note('MATHS', '15')]);
    expect(m.moyenne).toBe(15);
    expect(m.notes.map((n) => n.exclue)).toEqual(['non-numerique', 'non-significative', undefined]);
  });

  test('noteSur nul : note non numérique, pas de division par zéro', () => {
    expect(seule([note('MATHS', '5', { noteSur: 0 })]).notes[0]!.exclue).toBe('non-numerique');
  });

  test('coef 0 : la note ne pèse pas ; seule note à coef 0 : pas de moyenne', () => {
    expect(seule([note('MATHS', '2', { coef: 0 }), note('MATHS', '14')]).moyenne).toBe(14);
    expect(seule([note('MATHS', '2', { coef: 0 })]).moyenne).toBeUndefined();
  });

  test('sans note : pas de moyenne', () => {
    expect(seule([]).moyenne).toBeUndefined();
  });

  test('instantané ED : ignore les notes saisies le jour du calcul ou après', () => {
    const p = periode([MATHS]);
    const notes = [note('MATHS', '10', { dateSaisie: '2026-11-15' }), note('MATHS', '20', { dateSaisie: '2026-11-16' }), note('MATHS', '18')];
    const r = calculer(p, notes, [], { saisiesAvant: '2026-11-16 01:02' }).matieres[0]!;
    expect(r.moyenne).toBe(14);
    expect(r.notes[1]!.exclue).toBe('saisie-apres-calcul');
  });
});

describe('sous-matières', () => {
  const ETT: MatierePeriode = { code: 'ETT', libelle: '2I2D', coef: 16 };
  const sous = [
    { code: 'ETT', sousCode: 'ETT', libelle: 'Techno', coef: 1 },
    { code: 'ETT', sousCode: 'SIN', libelle: 'SIN', coef: 1 },
  ];
  // Cas réel : 15,5 et 16,125 → ED affiche 15,82 (sous-matières arrondies d'abord).
  const notes = [
    ...['15', '17', '14,5'].map((v) => note('ETT', v, { sousMatiereCode: 'ETT' })),
    ...['16', '16', '17,5', '15'].map((v) => note('ETT', v, { sousMatiereCode: 'SIN' })),
  ];
  const p = periode([ETT, ...sous]);

  test('variante ed : moyenne des sous-matières arrondies', () => {
    const r = calculer(p, notes, []).matieres[0]!;
    expect(r.sousMatieres.map((s) => s.moyenne)).toEqual([15.5, 16.125]);
    expect(arrondi(r.moyenne!)).toBe(15.82);
  });

  test('variantes de calibration', () => {
    expect(arrondi(calculer(p, notes, [], { variante: 'sous-matieres-exactes' }).matieres[0]!.moyenne!)).toBe(15.81);
    expect(arrondi(calculer(p, notes, [], { variante: 'parente-sur-notes' }).matieres[0]!.moyenne!)).toBe(15.86);
  });

  test('sous-matière sans note : ignorée ; aucune : pas de moyenne', () => {
    const r = calculer(p, notes.slice(0, 3), []).matieres[0]!;
    expect(r.moyenne).toBe(15.5);
    expect(calculer(p, [], []).matieres[0]!.moyenne).toBeUndefined();
    expect(calculer(p, [], [], { variante: 'parente-sur-notes' }).matieres[0]!.moyenne).toBeUndefined();
  });

  test('hypothèse : une note saisie sur la parente compte comme une sous-matière de coef 1', () => {
    const r = calculer(p, [...notes.slice(0, 3), note('ETT', '9,5')], []).matieres[0]!;
    expect(r.moyenne).toBe((15.5 + 9.5) / 2);
  });
});

describe('moyenne générale', () => {
  test('pondérée par les coefs de matière, matières sans note exclues, moyennes de matière arrondies', () => {
    const p = periode([MATHS, PHILO, { code: 'EPS', libelle: 'EPS', coef: 6 }]);
    const r = calculer(p, [note('MATHS', '7'), note('MATHS', '8'), note('MATHS', '8'), note('PHILO', '12')], []);
    // MATHS 7,666… → 7,67 ; (7,67×2 + 12×1) / 3
    expect(r.generale).toBeCloseTo((7.67 * 2 + 12) / 3, 12);
  });

  test('paramétrage sans coef de matière : moyenne simple des matières', () => {
    const p = periode([MATHS, PHILO]);
    const r = calculer(p, [note('MATHS', '10'), note('PHILO', '16')], [], { parametrage: { moyenneCoefMatiere: false } });
    expect(r.generale).toBe(13);
  });

  test('aucune note : pas de moyenne générale ; officielle recopiée', () => {
    const r = calculer(periode([MATHS], { officielleGenerale: 12 }), [], []);
    expect(r.generale).toBeUndefined();
    expect(r.officielleGenerale).toBe(12);
  });
});

describe('rattachement des notes aux périodes', () => {
  const t1 = periode([MATHS]);
  const r2 = periode([MATHS], { code: 'A001R002', type: 'releve', debut: '2026-10-05', fin: '2026-11-22' });
  const examen = periode([MATHS], { code: 'H000X001', type: 'examen', debut: '2026-09-01', fin: '2027-01-10' });
  const periodes = [t1, r2, examen];
  const avant = note('MATHS', '10', { date: '2026-09-20' });
  const pendant = note('MATHS', '12', { date: '2026-10-05' });
  const blanc = note('MATHS', '8', { periodeCode: 'H000X001', date: '2026-10-10' });
  const tout = [avant, pendant, blanc];

  test('relevé : par date, bornes incluses, même si ED déclare le trimestre', () => {
    expect(notesDeLaPeriode(r2, tout, periodes)).toEqual([pendant]);
    expect(notesDeLaPeriode(t1, tout, periodes)).toEqual([avant, pendant]);
  });

  test('examen blanc : uniquement ses notes', () => {
    expect(notesDeLaPeriode(examen, tout, periodes)).toEqual([blanc]);
  });
});

describe('propriétés', () => {
  const valeur = fc.integer({ min: 0, max: 80 }).map((q) => q / 4);
  const noteArb = fc.record({
    v: valeur,
    sur: fc.constantFrom(10, 20),
    coef: fc.constantFrom(0, 0.5, 1, 1.5, 2, 4),
    matiere: fc.constantFrom('MATHS', 'PHILO'),
  });
  const versNotes = (xs: { v: number; sur: number; coef: number; matiere: string }[]) =>
    xs.map((x, i) => note(x.matiere, String(Math.min(x.v, x.sur)).replace('.', ','), { id: `p${i}`, noteSur: x.sur, coef: x.coef }));
  const p = periode([MATHS, PHILO]);

  test("l'ordre des notes ne change rien", () => {
    fc.assert(
      fc.property(fc.array(noteArb, { maxLength: 15 }), fc.integer(), (xs, graine) => {
        const notes = versNotes(xs);
        const melange = [...notes].sort((a, b) => ((a.id.length * 31 + graine) % 7) - ((b.id.length * 31 + graine) % 7) || b.id.localeCompare(a.id));
        expect(calculer(p, melange, []).generale ?? -1).toBeCloseTo(calculer(p, notes, []).generale ?? -1, 9);
      }),
    );
  });

  test('une note de coef 0 ne change rien', () => {
    fc.assert(
      fc.property(fc.array(noteArb, { minLength: 1, maxLength: 15 }), valeur, (xs, v) => {
        const notes = versNotes(xs);
        const avant = calculer(p, notes, []);
        const apres = calculer(p, [...notes, note('MATHS', String(v).replace('.', ','), { coef: 0 })], []);
        expect(apres.matieres[0]!.moyenne ?? -1).toBeCloseTo(avant.matieres[0]!.moyenne ?? -1, 9);
      }),
    );
  });

  test('ajouter une note égale à la moyenne ne la change pas', () => {
    fc.assert(
      fc.property(fc.array(noteArb, { minLength: 1, maxLength: 15 }), (xs) => {
        const notes = versNotes(xs);
        const m = calculer(p, notes, []).matieres[0]!.moyenne;
        fc.pre(m !== undefined);
        const apres = calculer(p, [...notes, note('MATHS', String(m), { coef: 1 })], []);
        expect(apres.matieres[0]!.moyenne).toBeCloseTo(m!, 9);
      }),
    );
  });

  test('monotonie : une meilleure note ne fait jamais baisser une moyenne', () => {
    fc.assert(
      fc.property(fc.array(noteArb, { maxLength: 15 }), valeur, valeur, fc.constantFrom(0.5, 1, 2), (xs, a, b, coef) => {
        const [bas, haut] = a <= b ? [a, b] : [b, a];
        const notes = versNotes(xs);
        const avec = (v: number) => calculer(p, [...notes, note('MATHS', String(v).replace('.', ','), { coef })], []);
        expect(avec(haut).matieres[0]!.moyenne!).toBeGreaterThanOrEqual(avec(bas).matieres[0]!.moyenne! - 1e-9);
        expect(avec(haut).generale!).toBeGreaterThanOrEqual(avec(bas).generale! - 1e-9);
      }),
    );
  });
});

describe('simulateur', () => {
  const p = periode([MATHS, PHILO]);
  const notes = [note('MATHS', '8'), note('PHILO', '12')];

  test('une note hypothétique change la moyenne instantanément', () => {
    const r = simuler(p, notes, [], [{ matiereCode: 'MATHS', valeur: 16, noteSur: 20, coef: 1 }]);
    expect(r.matieres[0]!.moyenne).toBe(12);
    expect(r.matieres[0]!.notes[1]!.id).toBe('hypothese-0');
  });

  test('quelle note pour atteindre X ?', () => {
    const hyp = { matiereCode: 'MATHS', noteSur: 20, coef: 1 };
    // MATHS : (8 + x) / 2 ≥ 11 → x = 14
    expect(noteNecessaire(p, notes, [], hyp, { portee: 'matiere', code: 'MATHS' }, 11)).toBe(14);
    // générale : (m×2 + 12) / 3 ≥ 12 → m ≥ 12. 15,99 suffit : MATHS = 11,995, arrondi à 12 par ED avant la générale.
    expect(noteNecessaire(p, notes, [], hyp, { portee: 'generale' }, 12)).toBe(15.99);
    expect(noteNecessaire(p, notes, [], hyp, { portee: 'matiere', code: 'MATHS' }, 3)).toBe(0);
    expect(noteNecessaire(p, notes, [], hyp, { portee: 'matiere', code: 'MATHS' }, 15)).toBeUndefined();
    expect(noteNecessaire(p, notes, [], hyp, { portee: 'matiere', code: 'INCONNUE' }, 1)).toBeUndefined();
  });

  test('note au centième sur un barème de 10', () => {
    const r = noteNecessaire(p, notes, [], { matiereCode: 'MATHS', noteSur: 10, coef: 1 }, { portee: 'matiere', code: 'MATHS' }, 10.5);
    // (8 + 2x) / 2 ≥ 10,5 → x ≥ 6,5
    expect(r).toBe(6.5);
  });
});

describe('calibration', () => {
  const p = periode([MATHS, PHILO], { officielleGenerale: 11.33, dateCalcul: '2026-11-16 01:02' });
  p.matieres = [
    { ...MATHS, officielle: 11 },
    { ...PHILO, officielle: 12 },
  ];
  const notes = [note('MATHS', '10'), note('MATHS', '12'), note('PHILO', '12'), note('PHILO', '2', { dateSaisie: '2026-11-16' })];

  test('tout juste au centième : calcul vérifié, variante ed retenue', () => {
    const { retenue, toutes } = calibrer(p, notes, []);
    expect(retenue).toMatchObject({ variante: 'ed', verifie: true, ecartMax: 0, comparees: 3 });
    expect(toutes).toHaveLength(3);
  });

  test("écart : stocké, pas vérifié ; moyenne introuvable : écart infini", () => {
    const faux = { ...p, matieres: [{ ...MATHS, officielle: 10.5 }, { ...PHILO, officielle: 12 }, { code: 'EPS', libelle: 'EPS', coef: 1, officielle: 15 }] };
    const { retenue } = calibrer(faux, notes, []);
    expect(retenue.verifie).toBe(false);
    expect(retenue.ecarts.find((e) => e.libelle === 'Maths')!.ecart).toBeCloseTo(0.5, 9);
    expect(retenue.ecartMax).toBe(Infinity);
  });

  test('rien à comparer : non vérifié', () => {
    const { retenue } = calibrer(periode([MATHS]), notes, []);
    expect(retenue).toMatchObject({ comparees: 0, verifie: false, ecartMax: 0 });
  });

  test('un établissement qui calcule autrement : la variante qui colle est proposée', () => {
    const q = periode([
      { code: 'ETT', libelle: '2I2D', coef: 1, officielle: 15.86 },
      { code: 'ETT', sousCode: 'A', libelle: 'A', coef: 1 },
      { code: 'ETT', sousCode: 'B', libelle: 'B', coef: 1 },
    ]);
    const n = [...['15', '17', '14,5'].map((v) => note('ETT', v, { sousMatiereCode: 'A' })), ...['16', '16', '17,5', '15'].map((v) => note('ETT', v, { sousMatiereCode: 'B' }))];
    const { retenue } = calibrer(q, n, []);
    expect(retenue).toMatchObject({ variante: 'parente-sur-notes', verifie: true });
  });

  test('libellé des sous-matières dans les écarts', () => {
    const q = periode([MATHS, { code: 'MATHS', sousCode: 'ALG', libelle: 'Algèbre', coef: 1, officielle: 9 }]);
    const { retenue } = calibrer(q, [note('MATHS', '10', { sousMatiereCode: 'ALG' })], []);
    expect(retenue.ecarts[0]!.libelle).toBe('Algèbre (ALG)');
  });
});

describe('retouches de vraies notes dans la simulation', () => {
  const p = periode([MATHS]);
  const a = note('MATHS', '10');
  const b = note('MATHS', '16');
  const ns = note('MATHS', '4', { nonSignificative: true });
  const moy = (notes: Note[]) => calculer(p, notes, []).matieres[0]!.moyenne;

  test('sans retouche, rien ne change', () => expect(avecHypotheses(p, [a, b], [], [])).toEqual([a, b]));
  test('une autre valeur remplace la vraie', () => expect(moy(avecHypotheses(p, [a, b], [], [{ noteId: a.id, valeur: 12.5 }]))).toBe(14.25));
  test('compte: false retire la note du calcul', () => expect(moy(avecHypotheses(p, [a, b], [], [{ noteId: a.id, compte: false }]))).toBe(16));
  test('compte: true compte une note non significative', () => expect(moy(avecHypotheses(p, [a, ns], [], [{ noteId: ns.id, compte: true }]))).toBe(7));
  test('une retouche sur une note inconnue est sans effet', () => expect(moy(avecHypotheses(p, [a, b], [], [{ noteId: 'disparue', compte: false }]))).toBe(13));
  test('une note ajoutée garde son titre, sinon « Note simulée »', () => {
    const [titree, sans] = avecHypotheses(p, [], [
      { matiereCode: 'MATHS', valeur: 15, noteSur: 20, coef: 1, titre: ' Contrôle 5 ' },
      { matiereCode: 'MATHS', valeur: 12, noteSur: 20, coef: 1 },
    ]);
    expect([titree!.devoir, sans!.devoir]).toEqual(['Contrôle 5', 'Note simulée']);
  });
  test('les notes réelles ne sont pas modifiées', () => {
    avecHypotheses(p, [a], [], [{ noteId: a.id, valeur: 2 }]);
    expect(a.valeurBrute).toBe('10');
  });
});

test('matière ignorée dans la simulation : elle sort de la générale, les autres ne bougent pas', () => {
  const p = periode([MATHS, PHILO]);
  const notes = [note('MATHS', '8'), note('PHILO', '16')];
  expect(calculer(p, notes, []).generale).toBeCloseTo((8 * 2 + 16) / 3, 10);
  const r = calculer(p, avecHypotheses(p, notes, [{ matiereCode: 'MATHS', valeur: 20, noteSur: 20, coef: 1 }], [], ['MATHS']), []);
  expect(r.generale).toBe(16);
  expect(r.matieres.find((m) => m.code === 'MATHS')!.moyenne).toBeUndefined();
});
