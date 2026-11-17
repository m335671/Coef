import { familleDe } from '@/features/notes/familles';

import { nomMatiere } from '../matieres';

test.each([
  ['INGEN.INNOV.DEV.DUR.', 'Ingénierie, innovation et développement durable'],
  ['Syst.Info et Num', 'Systèmes d’information et numérique'],
  ['Ens Techno Trans', 'Enseignement technologique transversal'],
  ['ED.PHYSIQUE & SPORT.', 'Éducation physique et sportive'],
  ['ENS. MORAL & CIVIQUE', 'Enseignement moral et civique'],
  ['MATHEMATIQUES TC', 'Mathématiques'],
  ['HISTOIRE-GEOGRAPHIE', 'Histoire-géographie'],
  ['ANGLAIS LV1-ETLV', 'Anglais LV1-ETLV'],
  ['ALLEMAND LV2', 'Allemand LV2'],
  ['PHILOSOPHIE', 'Philosophie'],
  ['PHYSIQUE-CHIMIE', 'Physique-chimie'],
  ['FRANCAIS', 'Français'],
  ['Éducation musicale', 'Éducation musicale'],
  ['SVT', 'SVT'],
  ['', ''],
])('%s → %s', (brut, lisible) => expect(nomMatiere(brut)).toBe(lisible));

test('le nom lisible garde la même famille que le libellé ED', () => {
  for (const [code, brut] of [
    ['IIDD', 'INGEN.INNOV.DEV.DUR.'],
    ['SIN', 'Syst.Info et Num'],
    ['EPS', 'ED.PHYSIQUE & SPORT.'],
    ['EMC', 'ENS. MORAL & CIVIQUE'],
    ['HI-GE', 'HISTOIRE-GEOGRAPHIE'],
    ['AGL1', 'ANGLAIS LV1-ETLV'],
    ['MATHS', 'MATHEMATIQUES TC'],
  ])
    expect(familleDe(code!, nomMatiere(brut!))).toBe(familleDe(code!, brut!));
});
