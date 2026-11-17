// Familles de matières pour l'affichage « par famille ». Heuristique sur le code et le libellé ED (pas de champ
// ED pour ça) : ce qui n'est pas reconnu va dans « Autres matières », jamais dans une mauvaise famille.
import type { Famille } from '@/ui/theme';

export const NOM_FAMILLE: Record<Famille, string> = {
  sciences: 'Sciences et techno',
  langues: 'Langues',
  lettres: 'Lettres et société',
  arts: 'Arts et sport',
  autres: 'Autres matières',
};

export const ORDRE_FAMILLES: Famille[] = ['sciences', 'langues', 'lettres', 'arts', 'autres'];

// L'ordre compte : « ED. PHYSIQUE & SPORT » est du sport avant d'être de la physique.
const REGLES: [Famille, RegExp][] = [
  ['langues', /\b(LV\d|ANGL|AGL|ALL|ESP|ITA|ITAL|PORT|CHIN|JAP|RUSS|ARAB|HEBR|LATIN|LAT|GREC|LCA|ANGLAIS|ALLEMAND|ESPAGNOL|ITALIEN|ETLV|DNL)\w*/],
  ['arts', /\b(EPS|SPORT|ARTS?|MUSI|PLAST|THEAT|CINE|DANSE|ED\.? ?PHYS)\w*/],
  ['sciences', /\b(MATH|PH-CH|PHYS|CHIM|SVT|SCIEN|NSI|SNT|SI\b|2I2D|ETT|SIN|TECHN|INFO|BIOL|ENS\.? ?SCI|STI|STL|SPE PHYS|ING)\w*/],
  ['lettres', /\b(FRAN|FRANC|PHILO|HIST|HI-GE|GEO|EMC|ENS\.? MORAL|SES|ECO|HGGSP|HLP|DROIT|LITT)\w*/],
];

const normaliser = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();

export function familleDe(code: string, libelle: string): Famille {
  const texte = `${normaliser(code)} ${normaliser(libelle)}`;
  return REGLES.find(([, re]) => re.test(texte))?.[0] ?? 'autres';
}
