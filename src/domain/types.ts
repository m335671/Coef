// Types métier, indépendants d'EcoleDirecte. Seul api/ecoledirecte/mapping connaît le format ED.

export type TypePeriode = 'trimestre' | 'releve' | 'annee' | 'examen';

/** Une ligne de matière d'une période. Une sous-matière porte le code de sa matière parente et un sousCode. */
export type MatierePeriode = {
  code: string;
  sousCode?: string;
  libelle: string;
  coef: number;
  /** Moyenne affichée par ED, si elle existe. */
  officielle?: number;
  /** Statistiques de la classe affichées par ED (absentes si l'établissement les masque). */
  classe?: StatsClasse;
};

export type StatsClasse = { moyenne?: number; min?: number; max?: number };

export type Periode = {
  code: string;
  libelle: string;
  type: TypePeriode;
  debut: string; // AAAA-MM-JJ
  fin: string;
  cloture: boolean;
  /** Dernier calcul des moyennes par ED (« AAAA-MM-JJ HH:MM ») : les notes saisies après n'y sont pas. */
  dateCalcul?: string;
  officielleGenerale?: number;
  matieres: MatierePeriode[];
};

export type Note = {
  id: string;
  /** Période déclarée par ED. Peu fiable : ED met celle du trimestre même pour un relevé. */
  periodeCode: string;
  matiereCode: string;
  sousMatiereCode?: string;
  devoir: string;
  date: string; // AAAA-MM-JJ
  dateSaisie?: string;
  /** Valeur telle que saisie (« 12,5 », « Abs »…), avant toute interprétation. */
  valeurBrute: string;
  noteSur: number;
  coef: number;
  nonSignificative: boolean;
  typeDevoir?: string;
  /** Moyenne, minimum et maximum de la classe à ce devoir, dans le barème de la note. */
  classe?: StatsClasse;
};

/** Drapeaux du paramétrage d'établissement que le calcul respecte. */
export type Parametrage = {
  /** Moyenne générale pondérée par les coefficients de matière (sinon moyenne simple des matières). */
  moyenneCoefMatiere: boolean;
};

export type DonneesNotes = {
  periodes: Periode[];
  notes: Note[];
  parametrage: Parametrage;
};

export type Eleve = {
  id: string;
  prenom: string;
  nom: string;
  classe?: string;
  etablissement?: string;
};

/** Un compte de connexion : un élève (eleves = lui-même) ou un parent (eleves = ses enfants). */
export type Profil = {
  id: string;
  type: 'eleve' | 'parent';
  prenom: string;
  nom: string;
  eleves: Eleve[];
};
