// Types métier, indépendants d'EcoleDirecte. Seul api/ecoledirecte/mapping connaît le format ED.

export type Periode = {
  id: string;
  libelle: string;
};

export type Matiere = {
  code: string;
  libelle: string;
  coef: number;
};

export type Note = {
  id: string;
  periodeId: string;
  matiereCode: string;
  devoir: string;
  date: string; // AAAA-MM-JJ
  /** Valeur telle que saisie (« 12,5 », « Abs »…), avant toute interprétation. */
  valeurBrute: string;
  noteSur: number;
  coef: number;
  nonSignificative: boolean;
};

export type DonneesNotes = {
  periodes: Periode[];
  matieres: Matiere[];
  notes: Note[];
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
