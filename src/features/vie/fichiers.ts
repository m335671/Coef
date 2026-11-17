// Pièces jointes et documents : téléchargés depuis ED dans le cache de l'app, puis ouverts par le visualiseur
// du téléphone (aperçu, ou à défaut le menu « Ouvrir avec »). Un seul fichier gardé : le dernier ouvert.
import { Directory, File, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';

import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { MODE_DEMO } from '@/demo';
import type { Fichier } from '@/domain/types';

import { useCompte } from '../compte/store';

const EXTENSIONS: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'text/plain': 'txt' };

/** Nom de fichier sûr, avec une extension tirée du type si le libellé n'en a pas. */
export function nomFichier(libelle: string, typeMime?: string): string {
  const base =
    libelle
      .replace(/[\/:*?"<>|\u0000-\u001f]/g, '_')
      .trim()
      .slice(0, 120) || 'document';
  const ext = typeMime ? EXTENSIONS[typeMime] : undefined;
  return ext && !/\.[a-z0-9]{2,5}$/i.test(base) ? `${base}.${ext}` : base;
}

const dossier = () => new Directory(Paths.cache, 'fichiers-ed');

/** Efface les fichiers téléchargés (« Tout effacer », déconnexion). */
export function effacerFichiers(): void {
  try {
    const d = dossier();
    if (d.exists) d.delete();
  } catch {
    // rien à effacer
  }
}

export async function ouvrirFichier(f: Fichier): Promise<void> {
  if (MODE_DEMO) throw new ErreurED('reponse-inattendue', 'Pas de téléchargement en démo.');
  if (!useCompte.getState().client && useCompte.getState().horsLigne) await useCompte.getState().restaurer();
  const client = useCompte.getState().client;
  if (!client) throw new ErreurED('reseau');
  const { octets, typeMime } = await client.telecharger(f);
  effacerFichiers();
  const d = dossier();
  d.create();
  const fichier = new File(d, nomFichier(f.libelle, typeMime));
  fichier.create({ overwrite: true });
  await fichier.write(octets);
  try {
    if (await fichier.canPreview()) return await fichier.preview();
  } catch {
    // pas d'aperçu : menu de partage
  }
  await shareAsync(fichier.uri, { mimeType: typeMime, dialogTitle: f.libelle });
}
