// Synchro : cache d'abord, une seule requête notes.awp par élève, détection des nouvelles notes et de l'écart
// de moyenne générale prévue depuis la synchro précédente.
import { calculer } from '@/domain/moyennes/moteur';
import type { DonneesNotes, Note, Periode } from '@/domain/types';
import type { Instantane, Nouveautes } from '@/storage/base';

export type Depot = {
  lire(eleveId: string): Promise<Instantane | undefined>;
  ecrire(eleveId: string, i: Instantane): Promise<void>;
};

export type EcartPeriode = { periode: Periode; avant?: number; apres?: number };

export type Comparaison = {
  nouvelles: Note[];
  modifiees: Note[];
  /** Version d'avant de chaque note modifiée (par id), pour annoncer « 12 → 14 ». */
  precedentes: Record<string, Note>;
  ecarts: EcartPeriode[];
};

// Valeur nettoyée : un espace ajouté par ED n'est pas une modification à annoncer.
const empreinte = (n: Note) => `${n.valeurBrute.trim()}|${n.noteSur}|${n.coef}|${n.nonSignificative}`;

const generale = (d: DonneesNotes, p: Periode) => calculer(p, d.notes, d.periodes, { parametrage: d.parametrage }).generale;

/** Différences entre deux états. Sans état précédent (première synchro), rien n'est « nouveau ». */
export function comparer(avant: DonneesNotes | undefined, apres: DonneesNotes): Comparaison {
  if (!avant) return { nouvelles: [], modifiees: [], precedentes: {}, ecarts: [] };
  const anciennes = new Map(avant.notes.map((n) => [n.id, n]));
  const nouvelles = apres.notes.filter((n) => !anciennes.has(n.id));
  const modifiees = apres.notes.filter((n) => anciennes.has(n.id) && empreinte(anciennes.get(n.id)!) !== empreinte(n));
  const ecarts = apres.periodes
    .filter((p) => p.type !== 'examen')
    .map((p) => {
      const ancienne = avant.periodes.find((x) => x.code === p.code);
      return { periode: p, avant: ancienne && generale(avant, ancienne), apres: generale(apres, p) };
    })
    .filter((e) => e.avant !== e.apres);
  return { nouvelles, modifiees, precedentes: Object.fromEntries(modifiees.map((n) => [n.id, anciennes.get(n.id)!])), ecarts };
}

export type ResultatSynchro = Comparaison & { instantane: Instantane; premiere: boolean; depuisCache: boolean };

/** Délai minimal entre deux appels à ED pour un même élève : pas de rafales. */
export const DELAI_MIN_MS = 5 * 60_000;

export async function synchroniser(
  eleveId: string,
  recuperer: () => Promise<DonneesNotes>,
  depot: Depot,
  options: { maintenant?: Date; forcer?: boolean } = {},
): Promise<ResultatSynchro> {
  const maintenant = options.maintenant ?? new Date();
  const avant = await depot.lire(eleveId);
  if (avant && !options.forcer && maintenant.getTime() - Date.parse(avant.synchro) < DELAI_MIN_MS) {
    return { instantane: avant, nouvelles: [], modifiees: [], precedentes: {}, ecarts: [], premiere: false, depuisCache: true };
  }
  const donnees = await recuperer();
  const c = comparer(avant?.donnees, donnees);
  const date = maintenant.toISOString();
  const nouveautes: Nouveautes =
    c.nouvelles.length + c.modifiees.length > 0
      ? {
          date,
          noteIds: [...c.nouvelles, ...c.modifiees].map((n) => n.id),
          generalesAvant: Object.fromEntries(c.ecarts.filter((e) => e.avant !== undefined).map((e) => [e.periode.code, e.avant!])),
        }
      : (avant?.nouveautes ?? { date, noteIds: [], generalesAvant: {} });
  const instantane = { donnees, synchro: date, nouveautes };
  await depot.ecrire(eleveId, instantane);
  return { ...c, instantane, premiere: !avant, depuisCache: false };
}
