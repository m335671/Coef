// Apparence choisie dans Réglages : mode clair/sombre, couleur du thème, couleur de chaque matière.
// L'enregistrement est fait par src/features/apparence.ts ; ici, l'état et sa lecture seulement.
import { useColorScheme } from 'react-native';
import { create } from 'zustand';

export type ModeAffichage = 'systeme' | 'clair' | 'sombre';

export type Apparence = {
  mode: ModeAffichage;
  /** 'coef' (thème d'origine), 'systeme' (Material You, Android 12+) ou une couleur « #rrggbb ». */
  couleur: string;
  /** Code matière → couleur « #rrggbb ». Absente : couleur de la famille de la matière. */
  matieres: Record<string, string>;
};

export const APPARENCE_DEFAUT: Apparence = { mode: 'systeme', couleur: 'coef', matieres: {} };

/** Couleurs proposées pour le thème. Ni orange ni violet : réservés à la simulation et à l'objectif. */
export const COULEURS_THEME = [
  { nom: 'Océan', couleur: '#0369a1' },
  { nom: 'Indigo', couleur: '#4338ca' },
  { nom: 'Forêt', couleur: '#15803d' },
  { nom: 'Framboise', couleur: '#be123c' },
  { nom: 'Rose', couleur: '#db2777' },
  { nom: 'Ardoise', couleur: '#475569' },
] as const;

export const COULEURS_MATIERE = [
  { nom: 'Rouge', couleur: '#ef4444' },
  { nom: 'Orange', couleur: '#f97316' },
  { nom: 'Jaune', couleur: '#eab308' },
  { nom: 'Vert', couleur: '#22c55e' },
  { nom: 'Sarcelle', couleur: '#14b8a6' },
  { nom: 'Ciel', couleur: '#0ea5e9' },
  { nom: 'Indigo', couleur: '#6366f1' },
  { nom: 'Violet', couleur: '#a855f7' },
  { nom: 'Rose', couleur: '#ec4899' },
  { nom: 'Pierre', couleur: '#78716c' },
] as const;

export const useApparence = create<Apparence & { accentSysteme?: string }>(() => ({ ...APPARENCE_DEFAUT }));

export function useSombre(): boolean {
  const mode = useApparence((s) => s.mode);
  const systeme = useColorScheme();
  return mode === 'sombre' || (mode === 'systeme' && systeme === 'dark');
}
