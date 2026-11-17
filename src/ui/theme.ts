// Design system maison, v2. Base : taste-skill « accent ladder » (une couleur franche sur les petites marques,
// ses teintes pâles sur les surfaces) ; affichage par famille de matières repris de « pastel consumer » ;
// courbe d'évolution reprise de la v1 enrichie. La v1 est gardée : docs/INTERFACE-V1.md, tag interface-v1.
import { useColorScheme } from 'react-native';

const clair = {
  fond: '#ffffff',
  surface: '#ffffff',
  teinte50: '#f0fdfa', // surfaces vivantes : carte de la moyenne, bouton secondaire
  teinte100: '#ccfbf1', // pistes, pastille active
  bord: '#e2ece9',
  filet: '#eef4f2',
  controle: '#c9d6d3',
  texte: '#0f1f1d',
  attenue: '#52615f', // 4,5:1 sur blanc et sur teinte50
  accent: '#0f766e', // la couleur de marque : moyenne, boutons, progression
  accentEncre: '#115e59', // texte sur teinte
  surAccent: '#ffffff',
  positif: '#0f766e',
  negatif: '#c2410c', // orange : se distingue du vert d'eau aussi par la clarté
  ombre: 'rgba(15,23,42,0.22)',
};

export type Couleurs = typeof clair;

const sombre: Couleurs = {
  fond: '#0b1110',
  surface: '#111a19',
  teinte50: '#0f2523',
  teinte100: '#134e4a',
  bord: '#1f2d2b',
  filet: '#18221f',
  controle: '#35504c',
  texte: '#ecfdf8',
  attenue: '#9fb3af',
  accent: '#2dd4bf',
  accentEncre: '#99f6e4',
  surAccent: '#042f2e',
  positif: '#2dd4bf',
  negatif: '#fb923c',
  ombre: 'rgba(0,0,0,0.5)',
};

/** Familles de matières (affichage « par famille ») : une teinte douce chacune, encre sombre de la même teinte. */
export type Famille = 'sciences' | 'langues' | 'lettres' | 'arts' | 'autres';

const FAMILLES_CLAIR: Record<Famille, { fond: string; encre: string }> = {
  sciences: { fond: '#e0f2fe', encre: '#0c4a6e' },
  langues: { fond: '#dcf5e5', encre: '#14532d' },
  lettres: { fond: '#fde9d7', encre: '#6b3410' },
  arts: { fond: '#fce7f3', encre: '#831843' },
  autres: { fond: '#eef2f1', encre: '#33403e' },
};

const FAMILLES_SOMBRE: typeof FAMILLES_CLAIR = {
  sciences: { fond: '#0c2a3d', encre: '#bae6fd' },
  langues: { fond: '#12301f', encre: '#bbf7d0' },
  lettres: { fond: '#3a2414', encre: '#fed7aa' },
  arts: { fond: '#3a1229', encre: '#fbcfe8' },
  autres: { fond: '#1c2624', encre: '#d5e2df' },
};

/** Polices embarquées (expo-font) : aucune requête réseau. */
export const police = { normal: 'Geist_400Regular', moyen: 'Geist_500Medium', fort: 'Geist_600SemiBold', gras: 'Geist_700Bold' } as const;

/** Échelle : chiffre phare 48, simulateur 56, titre 24, section 16, corps 15, liste 15, petit 13. */
export const taille = { phare: 48, geant: 56, chiffre: 30, titre: 24, section: 16, corps: 15, liste: 15, petit: 13 } as const;

export const espace = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 32 } as const;

/** Rayon souple, choisi une fois : cartes 16, carte phare 20, contrôles en pilule. */
export const rayon = { carte: 16, phare: 20, controle: 999, puce: 10 } as const;

/** Durées (ms). Entrées échelonnées de 50 ms, toutes coupées si l'utilisateur réduit les animations. */
export const duree = { pression: 120, entree: 450, barre: 900, compteur: 700, pas: 50 } as const;

export const CIBLE = 44;

export function useCouleurs(): Couleurs {
  return useColorScheme() === 'dark' ? sombre : clair;
}

export function useFamilles() {
  return useColorScheme() === 'dark' ? FAMILLES_SOMBRE : FAMILLES_CLAIR;
}
