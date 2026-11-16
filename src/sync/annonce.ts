// Texte des notifications de nouvelles notes. Moyenne toujours étiquetée « prévue ».
import { arrondi } from '@/domain/moyennes/moteur';
import type { DonneesNotes, Note } from '@/domain/types';

import type { Comparaison } from './synchro';

export const virgule = (x: number) => arrondi(x).toFixed(2).replace('.', ',');

function libelle(d: DonneesNotes, n: Note): string {
  for (const p of d.periodes) {
    const m = p.matieres.find((x) => x.code === n.matiereCode && x.sousCode === n.sousMatiereCode);
    if (m) return m.libelle;
  }
  return n.matiereCode;
}

export function annonce(c: Comparaison, d: DonneesNotes, prenom?: string): { titre: string; texte: string } | undefined {
  const [premiere] = c.nouvelles;
  if (!premiere) return undefined;
  const pour = prenom ? `${prenom} : ` : '';
  const matieres = [...new Set(c.nouvelles.map((n) => libelle(d, n)))];
  const titre = c.nouvelles.length === 1 ? `${pour}nouvelle note en ${matieres[0]}` : `${pour}${c.nouvelles.length} nouvelles notes`;
  let texte = c.nouvelles.length === 1 ? `${premiere.valeurBrute.trim()}/${premiere.noteSur}` : matieres.join(', ');
  const e = c.ecarts.find((x) => x.periode.type === 'trimestre' && x.apres !== undefined);
  if (e) {
    const delta = e.avant === undefined ? '' : ` (${e.apres! >= e.avant ? '+' : '−'}${virgule(Math.abs(e.apres! - e.avant))})`;
    texte += ` · moyenne prévue ${virgule(e.apres!)}${delta}`;
  }
  return { titre, texte };
}
