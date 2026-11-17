// Schémas des réponses ED (format observé dans les implémentations de référence, voir docs/API-ED.md).
// Seuls les champs utilisés sont exigés ; le reste est ignoré pour survivre aux ajouts côté ED.
import { z } from 'zod';

export const enveloppe = z.object({
  code: z.number(),
  token: z.string().nullish(),
  message: z.string().nullish(), // confirmé : null sur doubleauth.awp
  data: z.unknown().optional(),
});

const eleveDeFamille = z.object({
  id: z.number(),
  prenom: z.string(),
  nom: z.string(),
  classe: z.object({ libelle: z.string() }).partial().nullish(),
});

export const compte = z.object({
  idLogin: z.number(),
  id: z.number(),
  typeCompte: z.string(),
  prenom: z.string(),
  nom: z.string(),
  nomEtablissement: z.string().nullish(),
  anneeScolaireCourante: z.string().nullish(),
  accessToken: z.string().nullish(),
  main: z.boolean().nullish(),
  profile: z
    .object({
      classe: z.object({ libelle: z.string() }).partial().nullish(),
      nomEtablissement: z.string().nullish(),
      eleves: z.array(eleveDeFamille).nullish(),
    })
    .nullish(),
});
export type CompteED = z.infer<typeof compte>;

export const donneesConnexion = z.object({ accounts: z.array(compte).min(1) });

export const questionQCM = z.object({
  question: z.string(),
  propositions: z.array(z.string()).min(1),
});

export const cleAppareil = z.object({ cn: z.string().min(1), cv: z.string().min(1) });

// notes.awp (forme confirmée, docs/API-ED.md). Nombres en chaînes, virgule ou point selon le champ.
const nombreTexte = z.union([z.string(), z.number()]);

const disciplineED = z.object({
  codeMatiere: z.string(),
  codeSousMatiere: z.string().nullish(),
  discipline: z.string(),
  coef: nombreTexte,
  sousMatiere: z.boolean().nullish(),
  moyenne: z.string().nullish(),
  moyenneClasse: z.string().nullish(),
  moyenneMin: z.string().nullish(),
  moyenneMax: z.string().nullish(),
});

const periodeED = z.object({
  codePeriode: z.string(),
  periode: z.string(),
  annuel: z.boolean().nullish(),
  examenBlanc: z.boolean().nullish(),
  dateDebut: z.string(),
  dateFin: z.string(),
  cloture: z.boolean().nullish(),
  ensembleMatieres: z.object({
    dateCalcul: z.string().nullish(),
    moyenneGenerale: z.string().nullish(),
    disciplines: z.array(disciplineED),
  }),
});

const noteED = z.object({
  id: z.union([z.number(), z.string()]),
  devoir: z.string().nullish(),
  codePeriode: z.string(),
  codeMatiere: z.string(),
  codeSousMatiere: z.string().nullish(),
  date: z.string(),
  dateSaisie: z.string().nullish(),
  coef: nombreTexte,
  noteSur: nombreTexte,
  valeur: z.string(),
  nonSignificatif: z.boolean().nullish(),
  typeDevoir: z.string().nullish(),
  moyenneClasse: z.string().nullish(),
  minClasse: z.string().nullish(),
  maxClasse: z.string().nullish(),
});

export const donneesNotes = z.object({
  periodes: z.array(periodeED),
  notes: z.array(noteED),
  parametrage: z.object({ moyenneCoefMatiere: z.boolean().nullish() }).nullish(),
});
export type DonneesNotesED = z.infer<typeof donneesNotes>;

// Étape 6 — formats SUPPOSÉS (implémentations communautaires), à confirmer par capture : docs/API-ED.md.
const idED = z.union([z.number(), z.string()]);

export const emploiDuTemps = z.array(
  z.object({
    id: idED,
    text: z.string().nullish(),
    matiere: z.string().nullish(),
    codeMatiere: z.string().nullish(),
    typeCours: z.string().nullish(),
    start_date: z.string(),
    end_date: z.string(),
    salle: z.string().nullish(),
    prof: z.string().nullish(),
    isAnnule: z.boolean().nullish(),
    isModifie: z.boolean().nullish(),
  }),
);

export const devoirsAFaire = z.record(
  z.string(),
  z.array(
    z.object({
      idDevoir: idED,
      matiere: z.string(),
      codeMatiere: z.string().nullish(),
      donneLe: z.string().nullish(),
      effectue: z.boolean().nullish(),
      interrogation: z.boolean().nullish(),
    }),
  ),
);

export const cahierDuJour = z.object({
  date: z.string(),
  matieres: z.array(
    z.object({
      matiere: z.string().nullish(),
      codeMatiere: z.string().nullish(),
      nomProf: z.string().nullish(),
      aFaire: z.object({ idDevoir: idED, contenu: z.string().nullish(), documents: z.array(z.object({ libelle: z.string().nullish() })).nullish() }).nullish(),
      contenuDeSeance: z.object({ contenu: z.string().nullish() }).nullish(),
    }),
  ),
});

const evenementED = z.object({
  id: idED,
  typeElement: z.string(),
  date: z.string(),
  displayDate: z.string().nullish(),
  libelle: z.string().nullish(),
  motif: z.string().nullish(),
  justifie: z.boolean().nullish(),
  par: z.string().nullish(),
  commentaire: z.string().nullish(),
});

export const vieScolaire = z.object({
  absencesRetards: z.array(evenementED).nullish(),
  sanctionsEncouragements: z.array(evenementED).nullish(),
  dispenses: z.array(evenementED).nullish(),
});
