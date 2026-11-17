// Données du mode démo : la fixture fabriquée (forme ED réelle, notes inventées), passée par le vrai mapping.
// Les notes saisies le dernier jour jouent les « nouvelles notes » de la dernière synchro.
import { versDonneesNotes } from '@/api/ecoledirecte/mapping';
import { donneesNotes } from '@/api/ecoledirecte/schemas';
import { calculer, lireNote } from '@/domain/moyennes/moteur';
import type { DonneesNotes } from '@/domain/types';
import type { Instantane } from '@/storage/base';

import fixture from '../../fixtures/ed/notes-eleve.json';

export const ELEVE_DEMO = { id: 'demo', prenom: 'Camille', nom: 'Exemple', classe: 'Terminale' };

/** Statistiques de classe inventées (la fixture n'en garde aucune) : déterministes, plausibles, dans le barème. */
function avecStatsDeClasse(d: DonneesNotes): DonneesNotes {
  const arrondi = (x: number) => Math.round(x * 4) / 4;
  return {
    ...d,
    notes: d.notes.map((n, i) => {
      const v = lireNote(n.valeurBrute);
      if (v === undefined) return n;
      const moyenne = arrondi(Math.min(n.noteSur * 0.92, Math.max(n.noteSur * 0.35, v * 0.85 + n.noteSur * 0.08 + ((i % 5) - 2) * 0.3)));
      return { ...n, classe: { moyenne, min: arrondi(n.noteSur * (0.15 + (i % 3) * 0.08)), max: arrondi(Math.min(n.noteSur, Math.max(v, moyenne) + n.noteSur * 0.15)) } };
    }),
    periodes: d.periodes.map((p) => ({
      ...p,
      matieres: p.matieres.map((m, i) =>
        m.officielle === undefined ? m : { ...m, classe: { moyenne: arrondi(m.officielle - 1.2 + (i % 4) * 0.4), min: arrondi(m.officielle * 0.55), max: arrondi(Math.min(19.5, m.officielle + 3.5)) } },
      ),
    })),
  };
}

export function instantaneDemo(): Instantane {
  const donnees = avecStatsDeClasse(versDonneesNotes(donneesNotes.parse(fixture.data)));
  const dernierJour = donnees.notes.map((n) => n.dateSaisie ?? n.date).sort().at(-1)!;
  const nouvelles = new Set(donnees.notes.filter((n) => (n.dateSaisie ?? n.date) === dernierJour).map((n) => n.id));
  const avant = { ...donnees, notes: donnees.notes.filter((n) => !nouvelles.has(n.id)) };
  const generalesAvant: Record<string, number> = {};
  for (const p of donnees.periodes) {
    const g = calculer(p, avant.notes, avant.periodes, { parametrage: avant.parametrage }).generale;
    if (g !== undefined) generalesAvant[p.code] = g;
  }
  const date = `${dernierJour}T17:30:00.000Z`;
  return { donnees, synchro: date, nouveautes: { date, noteIds: [...nouvelles], generalesAvant } };
}
