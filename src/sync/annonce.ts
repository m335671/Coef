// Texte des notifications de nouvelles notes. Moyenne toujours étiquetée « prévue ».
import { arrondi } from '@/domain/moyennes/moteur';
import type { DonneesNotes, Message, Note } from '@/domain/types';

import type { Comparaison } from './synchro';

export const virgule = (x: number) => arrondi(x).toFixed(2).replace('.', ',');

/** Libellé de matière d'une note (sous-matière si elle en a une). */
export function libelleMatiere(d: DonneesNotes, n: Note): string {
  for (const p of d.periodes) {
    const m = p.matieres.find((x) => x.code === n.matiereCode && x.sousCode === n.sousMatiereCode);
    if (m) return m.libelle;
  }
  return n.matiereCode;
}

/** Ce qui a changé sur une note modifiée : « 12/20 → 14/20 », « coef 1 → 2 », « ne compte plus »… */
function changement(avant: Note, apres: Note): string {
  const parts: string[] = [];
  if (avant.valeurBrute.trim() !== apres.valeurBrute.trim() || avant.noteSur !== apres.noteSur)
    parts.push(`${avant.valeurBrute.trim()}/${avant.noteSur} → ${apres.valeurBrute.trim()}/${apres.noteSur}`);
  if (avant.coef !== apres.coef) parts.push(`coef ${String(avant.coef).replace('.', ',')} → ${String(apres.coef).replace('.', ',')}`);
  if (avant.nonSignificative !== apres.nonSignificative) parts.push(apres.nonSignificative ? 'ne compte plus' : 'compte désormais');
  return parts.join(', ');
}

/**
 * Notification d'une synchro : nouvelles notes et notes modifiées (valeur, barème, coefficient, prise en compte),
 * avec la moyenne prévue du trimestre et son évolution. Rien de changé : pas de notification.
 */
export function annonce(c: Comparaison, d: DonneesNotes, prenom?: string): { titre: string; texte: string } | undefined {
  const changees = [...c.nouvelles, ...c.modifiees];
  const [premiere] = changees;
  if (!premiere) return undefined;
  const pour = prenom ? `${prenom} : ` : '';
  const matieres = [...new Set(changees.map((n) => libelleMatiere(d, n)))];
  const s = (n: number) => (n > 1 ? 's' : '');
  const nN = c.nouvelles.length;
  const nM = c.modifiees.length;
  let titre: string;
  let texte: string;
  if (changees.length === 1 && nN === 1) {
    titre = `${pour}nouvelle note en ${matieres[0]}`;
    texte = `${premiere.valeurBrute.trim()}/${premiere.noteSur}`;
  } else if (changees.length === 1) {
    titre = `${pour}note modifiée en ${matieres[0]}`;
    texte = (c.precedentes[premiere.id] && changement(c.precedentes[premiere.id]!, premiere)) || `${premiere.valeurBrute.trim()}/${premiere.noteSur}`;
  } else {
    titre = `${pour}${[nN ? `${nN} nouvelle${s(nN)} note${s(nN)}` : '', nM ? `${nM} note${s(nM)} modifiée${s(nM)}` : ''].filter(Boolean).join(', ')}`;
    texte = matieres.join(', ');
  }
  const e = c.ecarts.find((x) => x.periode.type === 'trimestre' && x.apres !== undefined);
  if (e) {
    const delta = e.avant === undefined ? '' : ` (${e.apres! >= e.avant ? '+' : '−'}${virgule(Math.abs(e.apres! - e.avant))})`;
    texte += ` · moyenne prévue ${virgule(e.apres!)}${delta}`;
  }
  return { titre, texte };
}

/** Notification de nouveaux messages : l'expéditeur et le sujet (jamais le contenu, que la synchro ne lit pas). */
export function annonceMessages(nouveaux: Message[], prenom?: string): { titre: string; texte: string } | undefined {
  const [premier] = nouveaux;
  if (!premier) return undefined;
  const pour = prenom ? `${prenom} : ` : '';
  if (nouveaux.length === 1) return { titre: `${pour}nouveau message de ${premier.de}`, texte: premier.sujet };
  return { titre: `${pour}${nouveaux.length} nouveaux messages`, texte: `de ${[...new Set(nouveaux.map((m) => m.de))].join(', ')}` };
}

/** Messages arrivés depuis la liste précédente, non lus. Sans liste précédente (première fois), aucun. */
export function nouveauxMessages(avant: Message[] | undefined, apres: Message[]): Message[] {
  if (!avant) return [];
  const connus = new Set(avant.map((m) => m.id));
  return apres.filter((m) => !connus.has(m.id) && !m.lu);
}
