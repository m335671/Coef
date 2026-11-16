// Calibration : compare le calcul prévu aux moyennes officielles ED et retient la variante qui colle le mieux.
import type { Note, Parametrage, Periode } from '../types';
import { arrondi, calculer, type ResultatMatiere, VARIANTES, type Variante } from './moteur';

export type Ecart = { libelle: string; prevue?: number; officielle: number; ecart: number };

export type Calibration = {
  variante: Variante;
  /** Plus grand écart en points sur 20 (Infinity si ED a une moyenne que le calcul ne trouve pas). */
  ecartMax: number;
  ecarts: Ecart[];
  /** Nombre de moyennes officielles comparées (0 : rien n'est vérifié). */
  comparees: number;
  /** Toutes les moyennes comparées tombent juste au centième. */
  verifie: boolean;
};

function comparer(prevue: number | undefined, officielle: number, libelle: string): Ecart {
  const ecart = prevue === undefined ? Infinity : Math.abs(arrondi(prevue) - officielle);
  return { libelle, prevue, officielle, ecart };
}

function lignes(m: ResultatMatiere): ResultatMatiere[] {
  return [m, ...m.sousMatieres];
}

/** Compare chaque variante aux moyennes ED, en ignorant les notes saisies après le calcul ED. */
export function calibrer(p: Periode, notes: Note[], periodes: Periode[], parametrage?: Parametrage): { retenue: Calibration; toutes: Calibration[] } {
  const toutes = (Object.keys(VARIANTES) as Variante[]).map((variante): Calibration => {
    const r = calculer(p, notes, periodes, { variante, parametrage, saisiesAvant: p.dateCalcul });
    const ecarts = r.matieres
      .flatMap(lignes)
      .filter((m) => m.officielle !== undefined)
      .map((m) => comparer(m.moyenne, m.officielle!, m.sousCode ? `${m.libelle} (${m.sousCode})` : m.libelle));
    if (r.officielleGenerale !== undefined) ecarts.push(comparer(r.generale, r.officielleGenerale, 'Moyenne générale'));
    // 0,001 près : ED et nous arrondissons au centième, l'écart vaut 0 ou au moins 0,01.
    const ecartMax = Math.max(0, ...ecarts.map((e) => e.ecart));
    return { variante, ecartMax, ecarts, comparees: ecarts.length, verifie: ecarts.length > 0 && ecartMax < 0.001 };
  });
  // « ed » d'abord : elle gagne les égalités.
  const retenue = toutes.reduce((a, b) => (b.ecartMax < a.ecartMax ? b : a));
  return { retenue, toutes };
}
