// Données du mode démo : la fixture fabriquée (forme ED réelle, notes inventées), passée par le vrai mapping.
// Les notes saisies le dernier jour jouent les « nouvelles notes » de la dernière synchro.
import { versDonneesNotes } from '@/api/ecoledirecte/mapping';
import { donneesNotes } from '@/api/ecoledirecte/schemas';
import { calculer } from '@/domain/moyennes/moteur';
import type { Instantane } from '@/storage/base';

import fixture from '../../fixtures/ed/notes-eleve.json';

export const ELEVE_DEMO = { id: 'demo', prenom: 'Camille', nom: 'Exemple', classe: 'Terminale' };

export function instantaneDemo(): Instantane {
  const donnees = versDonneesNotes(donneesNotes.parse(fixture.data));
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
