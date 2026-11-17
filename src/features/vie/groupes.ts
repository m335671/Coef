import type { EvenementVieScolaire, TypeEvenement } from '@/domain/types';

/** Les cartes de Vie scolaire ; chacune ouvre son détail (`/evenements?groupe=<cle>`). */
export const GROUPES = [
  { cle: 'absences', titre: 'Absences', types: ['absence'] },
  { cle: 'retards', titre: 'Retards', types: ['retard'] },
  { cle: 'sanctions', titre: 'Punitions et sanctions', court: 'Sanctions', types: ['punition', 'sanction'] },
  { cle: 'encouragements', titre: 'Encouragements', types: ['encouragement'] },
  { cle: 'autres', titre: 'Dispenses et autres', types: ['dispense', 'autre'] },
] as const satisfies readonly { cle: string; titre: string; court?: string; types: readonly TypeEvenement[] }[];

export type Groupe = (typeof GROUPES)[number];

export const dansGroupe = (g: Groupe, e: EvenementVieScolaire) => (g.types as readonly TypeEvenement[]).includes(e.type);

export const aJustifier = (e: EvenementVieScolaire) => (e.type === 'absence' || e.type === 'retard') && e.justifie === false;
