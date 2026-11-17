// Outils des builds d'essai (EXPO_PUBLIC_CAPTURE=1) et message d'erreur affiché à l'écran.
import { File, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';

import { CAPTURE, capturerErreur, texteCaptures } from '@/api/ecoledirecte/capture';
import { ErreurED } from '@/api/ecoledirecte/erreurs';

/** Message pour l'écran. Dans les builds d'essai, la cause réelle des erreurs hors ED (et elle est capturée). */
export function messageErreur(e: unknown, contexte: string): string {
  if (e instanceof ErreurED) return CAPTURE && e.detail ? `${e.message} (${e.detail})` : e.message;
  return CAPTURE ? `Erreur inattendue : ${capturerErreur(contexte, e)}` : 'Erreur inattendue.';
}

/** Essai seulement : écrit les captures anonymisées dans un fichier du cache de l'app et ouvre le partage. */
export async function exporterCaptures(): Promise<void> {
  const fichier = new File(Paths.cache, 'coef-capture.json');
  fichier.create({ overwrite: true });
  await fichier.write(texteCaptures());
  // text/plain : toutes les applis de notes et de fichiers l'acceptent (application/json n'en propose presque aucune).
  await shareAsync(fichier.uri, { mimeType: 'text/plain', dialogTitle: 'Captures Coef (anonymisées)' });
}
