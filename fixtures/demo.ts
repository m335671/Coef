// Données fabriquées pour le mode démo : aucun élève, établissement ou identifiant réel.
import type { DonneesNotes } from '@/domain/types';

export const demo: DonneesNotes = {
  periodes: [
    {
      code: 'A001',
      libelle: 'Trimestre 1',
      type: 'trimestre',
      debut: '2026-09-01',
      fin: '2026-11-30',
      cloture: false,
      matieres: [
        { code: 'FRANC', libelle: 'Français', coef: 4 },
        { code: 'MATHS', libelle: 'Mathématiques', coef: 4 },
        { code: 'HIGEO', libelle: 'Histoire-géographie', coef: 3 },
        { code: 'ANGL', libelle: 'Anglais LV1', coef: 3 },
        { code: 'SVT', libelle: 'SVT', coef: 2 },
        { code: 'EPS', libelle: 'EPS', coef: 2 },
      ],
    },
  ],
  parametrage: { moyenneCoefMatiere: true },
  notes: [
    { id: 'n1', periodeCode: 'A001', matiereCode: 'FRANC', devoir: 'Dictée', date: '2026-09-18', valeurBrute: '14', noteSur: 20, coef: 1, nonSignificative: false },
    { id: 'n2', periodeCode: 'A001', matiereCode: 'FRANC', devoir: 'Rédaction', date: '2026-10-09', valeurBrute: '12,5', noteSur: 20, coef: 2, nonSignificative: false },
    { id: 'n3', periodeCode: 'A001', matiereCode: 'MATHS', devoir: 'Interrogation fractions', date: '2026-09-25', valeurBrute: '8', noteSur: 10, coef: 0.5, nonSignificative: false },
    { id: 'n4', periodeCode: 'A001', matiereCode: 'MATHS', devoir: 'Contrôle chapitre 2', date: '2026-10-16', valeurBrute: '15,25', noteSur: 20, coef: 2, nonSignificative: false },
    { id: 'n5', periodeCode: 'A001', matiereCode: 'HIGEO', devoir: 'Croquis', date: '2026-10-02', valeurBrute: 'Abs', noteSur: 20, coef: 1, nonSignificative: false },
    { id: 'n6', periodeCode: 'A001', matiereCode: 'HIGEO', devoir: 'Évaluation', date: '2026-10-14', valeurBrute: '11', noteSur: 20, coef: 1, nonSignificative: false },
    { id: 'n7', periodeCode: 'A001', matiereCode: 'ANGL', devoir: 'Oral', date: '2026-10-06', valeurBrute: '17', noteSur: 20, coef: 1, nonSignificative: false },
    { id: 'n8', periodeCode: 'A001', matiereCode: 'ANGL', devoir: 'Test de vocabulaire', date: '2026-11-04', valeurBrute: '6', noteSur: 20, coef: 1, nonSignificative: true },
    { id: 'n9', periodeCode: 'A001', matiereCode: 'SVT', devoir: 'TP', date: '2026-11-06', valeurBrute: '16', noteSur: 20, coef: 1, nonSignificative: false },
  ],
};
