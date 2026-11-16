// Schémas des réponses ED (format observé dans les implémentations de référence, voir docs/API-ED.md).
// Seuls les champs utilisés sont exigés ; le reste est ignoré pour survivre aux ajouts côté ED.
import { z } from 'zod';

export const enveloppe = z.object({
  code: z.number(),
  token: z.string().optional(),
  message: z.string().optional(),
  data: z.unknown().optional(),
});

const eleveDeFamille = z.object({
  id: z.number(),
  prenom: z.string(),
  nom: z.string(),
  classe: z.object({ libelle: z.string() }).partial().optional(),
});

export const compte = z.object({
  idLogin: z.number(),
  id: z.number(),
  typeCompte: z.string(),
  prenom: z.string(),
  nom: z.string(),
  nomEtablissement: z.string().optional(),
  anneeScolaireCourante: z.string().optional(),
  accessToken: z.string().optional(),
  main: z.boolean().optional(),
  profile: z
    .object({
      classe: z.object({ libelle: z.string() }).partial().optional(),
      nomEtablissement: z.string().optional(),
      eleves: z.array(eleveDeFamille).optional(),
    })
    .optional(),
});
export type CompteED = z.infer<typeof compte>;

export const donneesConnexion = z.object({ accounts: z.array(compte).min(1) });

export const questionQCM = z.object({
  question: z.string(),
  propositions: z.array(z.string()).min(1),
});

export const cleAppareil = z.object({ cn: z.string().min(1), cv: z.string().min(1) });
