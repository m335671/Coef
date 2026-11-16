// Design system maison. Direction : « achromatic ledger » (taste-skill, app, graine 721322393).
// Le chrome est à l'encre ; une seule teinte, sur la donnée principale (la moyenne prévue) ; un petit signal
// coloré seulement là où un chiffre a bougé. Fond bleu-gris de cahier plutôt que le gris neutre du kit.
import { useColorScheme } from 'react-native';

const clair = {
  fond: '#f2f4f7', // bleu-gris de cahier : le visage de l'app
  surface: '#ffffff',
  releve: '#e9ecf1', // un cran sous le fond : pression, piste de la réglette
  bord: '#e3e6eb',
  filet: '#eef0f3',
  controle: '#d0d4da',
  texte: '#0a0a0a',
  attenue: '#5e6168', // 4,5:1 sur le fond et la surface
  donnee: '#1d5fbf', // la seule teinte : la moyenne prévue
  primaire: '#141414',
  surPrimaire: '#ffffff',
  secondaire: '#e3e6eb',
  positif: '#247b50',
  negatif: '#c4242a',
  avertissement: '#92400e',
  avertissementFond: '#fffbeb',
};

export type Couleurs = typeof clair;

const sombre: Couleurs = {
  fond: '#000000',
  surface: '#111111',
  releve: '#222222',
  bord: '#2e2e2e',
  filet: '#1c1c1c',
  controle: '#444444',
  texte: '#ffffff',
  attenue: '#b4b4b4',
  donnee: '#6ea2f0', // la même teinte, relevée pour 4,5:1 sur le noir
  primaire: '#ffffff',
  surPrimaire: '#000000',
  secondaire: '#222222',
  positif: '#3fc07a',
  negatif: '#e5566f',
  avertissement: '#f0b35b',
  avertissementFond: '#2a2110',
};

/** Polices embarquées (expo-font) : aucune requête réseau. */
export const police = { normal: 'Geist_400Regular', moyen: 'Geist_500Medium', gras: 'Geist_700Bold' } as const;

/** Échelle typographique : titre 24, section 16, corps 14 (16 en lecture), petit 12 ; chiffre phare 40. */
export const taille = { phare: 40, chiffre: 30, titre: 24, section: 16, corps: 16, liste: 14, petit: 12 } as const;

/** Base 4 : marges de 16, écart unique de 12 entre blocs. */
export const espace = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

export const rayon = { carte: 8, controle: 6, puce: 4 } as const;

/** Durées (ms) des retours d'interaction ; rien n'est animé à l'entrée. */
export const duree = { pression: 90, bascule: 160 } as const;

/** Hauteur minimale d'une cible tactile. */
export const CIBLE = 44;

export function useCouleurs(): Couleurs {
  return useColorScheme() === 'dark' ? sombre : clair;
}
