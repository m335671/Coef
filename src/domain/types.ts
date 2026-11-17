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

/** Un cours de l'emploi du temps. Dates locales « AAAA-MM-JJ HH:MM ». */
export type Cours = {
  id: string;
  matiere: string;
  codeMatiere?: string;
  debut: string;
  fin: string;
  salle?: string;
  prof?: string;
  type?: string;
  annule: boolean;
  modifie: boolean;
};

/** Un devoir du cahier de textes, à faire pour `pour` (AAAA-MM-JJ). */
export type Devoir = {
  id: string;
  pour: string;
  matiere: string;
  codeMatiere?: string;
  donneLe?: string;
  effectue: boolean;
  interrogation: boolean;
  /** Consigne en texte brut (ED l'envoie en HTML encodé en base64), si le détail du jour a été chargé. */
  contenu?: string;
  prof?: string;
  /** Ce qui a été fait en classe ce jour-là (contenu de séance), en texte brut. */
  seance?: string;
  /** Noms des pièces jointes (le téléchargement viendra avec les documents). */
  pieces?: string[];
};

export type TypeEvenement = 'absence' | 'retard' | 'punition' | 'sanction' | 'encouragement' | 'dispense' | 'autre';

/** Un événement de vie scolaire : absence, retard, punition, sanction, encouragement, dispense. */
export type EvenementVieScolaire = {
  id: string;
  type: TypeEvenement;
  date: string;
  libelle: string;
  motif?: string;
  justifie?: boolean;
  par?: string;
  commentaire?: string;
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
