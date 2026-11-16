import type { DonneesNotes, Note } from '@/domain/types';
import type { Instantane } from '@/storage/base';

import { annonce } from '../annonce';
import { comparer, DELAI_MIN_MS, synchroniser } from '../synchro';

const note = (id: string, matiereCode: string, valeurBrute: string, extra: Partial<Note> = {}): Note => ({
  id,
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

const donnees = (notes: Note[]): DonneesNotes => ({
  periodes: [
    {
      code: 'A001',
      libelle: 'Trimestre 1',
      type: 'trimestre',
      debut: '2026-09-01',
      fin: '2026-11-30',
      cloture: false,
      matieres: [
        { code: 'MATHS', libelle: 'Mathématiques', coef: 2 },
        { code: 'PHILO', libelle: 'Philosophie', coef: 1 },
      ],
    },
    { code: 'H001', libelle: 'Examen blanc', type: 'examen', debut: '2026-09-01', fin: '2026-11-30', cloture: false, matieres: [] },
  ],
  notes,
  parametrage: { moyenneCoefMatiere: true },
});

const v1 = donnees([note('1', 'MATHS', '10'), note('2', 'PHILO', '13')]);

describe('comparer', () => {
  test('première synchro : rien de nouveau', () => {
    expect(comparer(undefined, v1)).toEqual({ nouvelles: [], modifiees: [], ecarts: [] });
  });

  test('nouvelle note, note modifiée, écart de moyenne générale prévue', () => {
    const v2 = donnees([note('1', 'MATHS', '10'), note('2', 'PHILO', 'Abs'), note('3', 'MATHS', '16')]);
    const c = comparer(v1, v2);
    expect(c.nouvelles.map((n) => n.id)).toEqual(['3']);
    expect(c.modifiees.map((n) => n.id)).toEqual(['2']);
    expect(c.ecarts).toHaveLength(1);
    expect(c.ecarts[0]).toMatchObject({ avant: 11, apres: 13 });
  });

  test('rien de changé : aucun écart', () => {
    expect(comparer(v1, donnees([...v1.notes]))).toEqual({ nouvelles: [], modifiees: [], ecarts: [] });
  });

  test('période apparue : écart depuis « rien »', () => {
    const v0 = { ...v1, periodes: [] };
    expect(comparer(v0, v1).ecarts[0]).toMatchObject({ avant: undefined, apres: 11 });
  });
});

describe('synchroniser', () => {
  const memoire = () => {
    const m = new Map<string, Instantane>();
    return { m, lire: async (id: string) => m.get(id), ecrire: async (id: string, i: Instantane) => void m.set(id, i) };
  };
  const t0 = new Date('2026-11-16T08:00:00Z');
  const plus = (ms: number) => new Date(t0.getTime() + ms);

  test('première synchro puis nouveautés retenues jusqu’à la suivante qui change quelque chose', async () => {
    const depot = memoire();
    const recuperer = jest.fn().mockResolvedValueOnce(v1);
    const r1 = await synchroniser('e', recuperer, depot, { maintenant: t0 });
    expect(r1).toMatchObject({ premiere: true, depuisCache: false, nouvelles: [] });
    expect(r1.instantane.nouveautes).toEqual({ date: t0.toISOString(), noteIds: [], generalesAvant: {} });

    const v2 = donnees([...v1.notes, note('3', 'MATHS', '16')]);
    recuperer.mockResolvedValueOnce(v2);
    const r2 = await synchroniser('e', recuperer, depot, { maintenant: plus(DELAI_MIN_MS) });
    expect(r2.nouvelles.map((n) => n.id)).toEqual(['3']);
    expect(r2.instantane.nouveautes).toEqual({ date: plus(DELAI_MIN_MS).toISOString(), noteIds: ['3'], generalesAvant: { A001: 11 } });

    recuperer.mockResolvedValueOnce(v2);
    const r3 = await synchroniser('e', recuperer, depot, { maintenant: plus(2 * DELAI_MIN_MS) });
    expect(r3.nouvelles).toEqual([]);
    expect(r3.instantane.nouveautes).toEqual(r2.instantane.nouveautes);
    expect(r3.instantane.synchro).toBe(plus(2 * DELAI_MIN_MS).toISOString());
  });

  test('pas de rafale : le cache répond avant le délai, sauf synchro forcée', async () => {
    const depot = memoire();
    const recuperer = jest.fn().mockResolvedValue(v1);
    await synchroniser('e', recuperer, depot, { maintenant: t0 });
    const r = await synchroniser('e', recuperer, depot, { maintenant: plus(DELAI_MIN_MS - 1) });
    expect(r.depuisCache).toBe(true);
    expect(recuperer).toHaveBeenCalledTimes(1);
    await synchroniser('e', recuperer, depot, { maintenant: plus(1), forcer: true });
    expect(recuperer).toHaveBeenCalledTimes(2);
  });

  test('échec réseau : l’état précédent est conservé', async () => {
    const depot = memoire();
    await synchroniser('e', async () => v1, depot, { maintenant: t0 });
    await expect(synchroniser('e', () => Promise.reject(new Error('réseau')), depot, { forcer: true })).rejects.toThrow('réseau');
    expect(depot.m.get('e')!.donnees).toEqual(v1);
  });

  test('date courante par défaut', async () => {
    const r = await synchroniser('e', async () => v1, memoire());
    expect(Date.parse(r.instantane.synchro)).toBeGreaterThan(t0.getTime());
  });
});

describe('annonce', () => {
  test('une note : matière, note et moyenne prévue avec son évolution', () => {
    const v2 = donnees([...v1.notes, note('3', 'MATHS', '16 ')]);
    expect(annonce(comparer(v1, v2), v2)).toEqual({ titre: 'nouvelle note en Mathématiques', texte: '16/20 · moyenne prévue 13,00 (+2,00)' });
  });

  test('plusieurs notes, parent avec prénom, baisse', () => {
    const v2 = donnees([...v1.notes, note('3', 'MATHS', '1'), note('4', 'PHILO', '2'), note('5', 'INCONNUE', '3')]);
    expect(annonce(comparer(v1, v2), v2, 'Alex')).toEqual({
      titre: 'Alex : 3 nouvelles notes',
      texte: 'Mathématiques, Philosophie, INCONNUE · moyenne prévue 6,17 (−4,83)',
    });
  });

  test('sans moyenne précédente ni calculable', () => {
    const v0 = { ...v1, periodes: [] };
    expect(annonce(comparer(v0, v1), v1)).toBeUndefined();
    const v2 = donnees([note('9', 'MATHS', 'Abs')]);
    expect(annonce(comparer(donnees([]), v2), v2)).toEqual({ titre: 'nouvelle note en Mathématiques', texte: 'Abs/20' });
    const v3 = { ...v2, notes: [...v2.notes, note('10', 'MATHS', '12')] };
    expect(annonce(comparer({ ...v2, periodes: [] }, v3), v3)!.texte).toBe('12/20 · moyenne prévue 12,00');
  });
});
