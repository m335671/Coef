import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { calibrer } from '@/domain/moyennes/calibration';
import { calculer } from '@/domain/moyennes/moteur';

import notesEleve from '../../../../fixtures/ed/notes-eleve.json';
import { versDonneesNotes } from '../mapping';
import { donneesNotes } from '../schemas';

const lire = (json: { data: unknown }) => versDonneesNotes(donneesNotes.parse(json.data));

describe('notes.awp → domaine', () => {
  const d = lire(notesEleve);

  test('périodes typées, dont relevés, année et examen blanc', () => {
    expect(d.periodes.map((p) => [p.code, p.type])).toEqual([
      ['A001', 'trimestre'],
      ['A001R001', 'releve'],
      ['A001R002', 'releve'],
      ['A002', 'trimestre'],
      ['A999Z', 'annee'],
      ['H000X001', 'examen'],
    ]);
    expect(d.periodes[0]).toMatchObject({ dateCalcul: '2026-11-16 01:02', cloture: false, debut: '2026-09-02', fin: '2026-11-22' });
    expect(d.periodes[3]!.officielleGenerale).toBeUndefined();
  });

  test('sous-matières, coefs de matière, moyennes officielles à virgule', () => {
    const ett = d.periodes[0]!.matieres.filter((m) => m.code === 'ETT');
    expect(ett.map((m) => [m.sousCode, m.coef])).toEqual([
      [undefined, 16],
      ['ETT', 1],
      ['SIN', 1],
    ]);
    expect(typeof d.periodes[0]!.officielleGenerale).toBe('number');
  });

  test('notes : coef avec point, barème, absence, non significative', () => {
    const maths = d.notes.filter((n) => n.matiereCode === 'MATHS');
    expect(maths[0]).toMatchObject({ valeurBrute: 'Abs ', noteSur: 20, coef: 2, periodeCode: 'A001' });
    expect(maths.some((n) => n.coef === 0.5 && n.noteSur === 10)).toBe(true);
    expect(d.notes.filter((n) => n.nonSignificative)).toHaveLength(1);
    expect(d.notes.find((n) => n.sousMatiereCode === 'SIN')).toBeDefined();
    expect(d.parametrage).toEqual({ moyenneCoefMatiere: true });
  });

  // Fixture dorée : notes inventées, moyennes « officielles » recalculées par un script indépendant
  // avec les règles vérifiées sur une classe réelle (docs/API-ED.md).
  test.each(['A001', 'A001R001', 'A001R002'])('%s : calcul vérifié avec la variante ed', (code) => {
    const p = d.periodes.find((x) => x.code === code)!;
    const { retenue } = calibrer(p, d.notes, d.periodes, d.parametrage);
    expect(retenue.ecarts.filter((e) => e.ecart > 0)).toEqual([]);
    expect(retenue).toMatchObject({ variante: 'ed', verifie: true });
    expect(retenue.comparees).toBeGreaterThan(5);
  });

  test('le cas discriminant : seule la variante ed tombe juste au trimestre', () => {
    const { toutes } = calibrer(d.periodes[0]!, d.notes, d.periodes, d.parametrage);
    expect(toutes.map((c) => [c.variante, c.verifie])).toEqual([
      ['ed', true],
      ['sous-matieres-exactes', false],
      ['parente-sur-notes', false],
    ]);
  });

  test('sans le filtre de date de calcul, les notes du jour faussent la comparaison', () => {
    const p = d.periodes[0]!;
    const toutesNotes = calculer(p, d.notes, d.periodes, { parametrage: d.parametrage });
    const instantane = calculer(p, d.notes, d.periodes, { parametrage: d.parametrage, saisiesAvant: p.dateCalcul });
    expect(toutesNotes.generale).not.toBeCloseTo(instantane.generale!, 2);
  });
});

// Calibration sur la capture réelle anonymisée, gardée hors du dépôt (fixtures/prive, ignoré par git).
const REELLE = join(__dirname, '../../../../fixtures/prive/notes-reelles.json');
(existsSync(REELLE) ? describe : describe.skip)('calibration réelle (fichier local)', () => {
  const d = existsSync(REELLE) ? lire(JSON.parse(readFileSync(REELLE, 'utf8'))) : undefined;

  test.each(['A001', 'A001R001', 'A001R002'])('%s : toutes les moyennes ED retrouvées au centième', (code) => {
    const p = d!.periodes.find((x) => x.code === code)!;
    const { retenue } = calibrer(p, d!.notes, d!.periodes, d!.parametrage);
    expect(retenue.ecarts.filter((e) => e.ecart > 0)).toEqual([]);
    expect(retenue.variante).toBe('ed');
  });
});

describe('réponses inattendues : erreur claire, jamais de moyenne fausse', () => {
  const base = notesEleve.data;
  const avecNote = (champ: string, valeur: unknown) => ({ ...base, notes: [{ ...base.notes[1]!, [champ]: valeur }] });

  test.each([
    ['coef', 'deux', 'coef de note non numérique'],
    ['noteSur', '', 'noteSur vide'],
  ])('%s = %j', (champ, valeur, message) => {
    expect(() => versDonneesNotes(donneesNotes.parse(avecNote(champ, valeur)))).toThrow(expect.objectContaining({ detail: `notes : ${message}` }));
  });

  test('champ requis absent : refusé par le schéma', () => {
    expect(donneesNotes.safeParse({ ...base, notes: [{ id: 1 }] }).success).toBe(false);
  });

  test('nombres déjà numériques et champs facultatifs absents acceptés', () => {
    const n = { id: 'x', codePeriode: 'A001', codeMatiere: 'M', date: '2026-10-01', coef: 2, noteSur: 20, valeur: '12' };
    const periode = { codePeriode: 'A001', periode: 'T1', dateDebut: '2026-09-01', dateFin: '2026-11-30', annuel: null, cloture: null, ensembleMatieres: { dateCalcul: null, disciplines: [{ codeMatiere: 'M', discipline: 'M', coef: '2,5', sousMatiere: true, codeSousMatiere: '' }] } };
    const d = versDonneesNotes(donneesNotes.parse({ periodes: [periode], notes: [n] }));
    expect(d.periodes[0]).toMatchObject({ type: 'trimestre', cloture: false, dateCalcul: undefined, officielleGenerale: undefined });
    expect(d.periodes[0]!.matieres[0]).toMatchObject({ coef: 2.5, sousCode: undefined, officielle: undefined });
    expect(d.notes[0]).toMatchObject({ coef: 2, devoir: '', nonSignificative: false, sousMatiereCode: undefined, dateSaisie: undefined });
    expect(d.parametrage.moyenneCoefMatiere).toBe(true);
  });
});
