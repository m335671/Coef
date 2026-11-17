// Seul module qui traduit le format ED vers le domaine.
import { nomMatiere } from '@/domain/matieres';
import type {
  Cours,
  Devoir,
  DocumentEleve,
  DonneesNotes,
  EvenementVieScolaire,
  Fichier,
  Message,
  Periode,
  Profil,
  TypeEvenement,
  TypePeriode,
} from '@/domain/types';

import { decoderBase64 } from './base64';
import { ErreurED } from './erreurs';
import {
  documentED,
  type cahierDuJour,
  type CompteED,
  type devoirsAFaire,
  type DonneesNotesED,
  type emploiDuTemps,
  type messageED,
  type messagesRecus,
  type vieScolaire,
} from './schemas';
import type { z } from 'zod';

export function versProfil(c: CompteED): Profil {
  const etablissement = c.nomEtablissement ?? c.profile?.nomEtablissement ?? undefined;
  if (c.typeCompte === 'E') {
    const eleve = { id: String(c.id), prenom: c.prenom, nom: c.nom, classe: c.profile?.classe?.libelle ?? undefined, etablissement };
    return { id: String(c.id), type: 'eleve', prenom: c.prenom, nom: c.nom, eleves: [eleve] };
  }
  // Hypothèse (docs/API-ED.md) : les comptes famille listent leurs enfants dans profile.eleves.
  const eleves = (c.profile?.eleves ?? []).map((e) => ({
    id: String(e.id),
    prenom: e.prenom,
    nom: e.nom,
    classe: e.classe?.libelle ?? undefined,
    etablissement,
  }));
  return { id: String(c.id), type: 'parent', prenom: c.prenom, nom: c.nom, eleves };
}

/** « 12,5 », « 0.5 », 4 → nombre ; « » → undefined. Tout autre texte est une réponse inattendue. */
function nombre(v: string | number | null | undefined, champ: string): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v.trim().replace(',', '.'));
  if (!Number.isFinite(n)) throw new ErreurED('reponse-inattendue', `notes : ${champ} non numérique`);
  return n;
}

const requis = (v: string | number, champ: string): number => {
  const n = nombre(v, champ);
  if (n === undefined) throw new ErreurED('reponse-inattendue', `notes : ${champ} vide`);
  return n;
};

/** Statistiques de classe : absentes (chaînes vides) → undefined plutôt qu'un objet vide. */
function stats(moy?: string | null, min?: string | null, max?: string | null) {
  const s = { moyenne: nombre(moy, 'moyenne de classe'), min: nombre(min, 'minimum de classe'), max: nombre(max, 'maximum de classe') };
  return s.moyenne === undefined && s.min === undefined && s.max === undefined ? undefined : s;
}

function typePeriode(p: DonneesNotesED['periodes'][number]): TypePeriode {
  if (p.annuel) return 'annee';
  if (p.examenBlanc) return 'examen';
  return /R\d+$/.test(p.codePeriode) ? 'releve' : 'trimestre';
}

export function versDonneesNotes(d: DonneesNotesED): DonneesNotes {
  const periodes = d.periodes.map((p): Periode => ({
    code: p.codePeriode,
    libelle: p.periode,
    type: typePeriode(p),
    debut: p.dateDebut,
    fin: p.dateFin,
    cloture: p.cloture ?? false,
    dateCalcul: p.ensembleMatieres.dateCalcul || undefined,
    officielleGenerale: nombre(p.ensembleMatieres.moyenneGenerale, 'moyenneGenerale'),
    classeGenerale: stats(p.ensembleMatieres.moyenneClasse, p.ensembleMatieres.moyenneMin, p.ensembleMatieres.moyenneMax),
    matieres: p.ensembleMatieres.disciplines.map((m) => ({
      code: m.codeMatiere,
      sousCode: (m.sousMatiere && m.codeSousMatiere) || undefined,
      libelle: nomMatiere(m.discipline),
      coef: requis(m.coef, 'coef de matière'),
      officielle: nombre(m.moyenne, 'moyenne'),
      classe: stats(m.moyenneClasse, m.moyenneMin, m.moyenneMax),
    })),
  }));
  const notes = d.notes.map((n) => ({
    id: String(n.id),
    periodeCode: n.codePeriode,
    matiereCode: n.codeMatiere,
    sousMatiereCode: n.codeSousMatiere || undefined,
    devoir: n.devoir ?? '',
    date: n.date,
    dateSaisie: n.dateSaisie || undefined,
    valeurBrute: n.valeur,
    noteSur: requis(n.noteSur, 'noteSur'),
    coef: requis(n.coef, 'coef de note'),
    nonSignificative: n.nonSignificatif ?? false,
    typeDevoir: n.typeDevoir || undefined,
    classe: stats(n.moyenneClasse, n.minClasse, n.maxClasse),
  }));
  return { periodes, notes, parametrage: { moyenneCoefMatiere: d.parametrage?.moyenneCoefMatiere ?? true } };
}

// --- Étape 6 (formats supposés, voir docs/API-ED.md) ---

const ENTITES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  eacute: 'é',
  egrave: 'è',
  agrave: 'à',
  ccedil: 'ç',
  ecirc: 'ê',
  ocirc: 'ô',
  rsquo: '’',
  laquo: '«',
  raquo: '»',
};

/** HTML d'ED (consigne de devoir) → texte : sauts de ligne gardés, balises retirées, entités décodées. */
export function htmlEnTexte(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (m, nom: string) => ENTITES[nom.toLowerCase()] ?? m)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Contenu ED en base64 → texte ; un base64 invalide donne undefined plutôt qu'une exception. */
function contenuED(b64?: string | null): string | undefined {
  if (!b64) return undefined;
  try {
    return htmlEnTexte(decoderBase64(b64)) || undefined;
  } catch {
    return undefined;
  }
}

export function versCours(d: z.infer<typeof emploiDuTemps>): Cours[] {
  return d
    .map((c) => ({
      id: String(c.id),
      matiere: nomMatiere(c.matiere || c.text || 'Cours'),
      codeMatiere: c.codeMatiere || undefined,
      debut: c.start_date.slice(0, 16),
      fin: c.end_date.slice(0, 16),
      salle: c.salle || undefined,
      prof: c.prof || undefined,
      type: c.typeCours || undefined,
      annule: c.isAnnule ?? false,
      modifie: c.isModifie ?? false,
    }))
    .sort((a, b) => a.debut.localeCompare(b.debut));
}

/** Liste des devoirs à faire, enrichie du contenu des jours dont le détail a été chargé. */
export function versDevoirs(liste: z.infer<typeof devoirsAFaire>, jours: z.infer<typeof cahierDuJour>[]): Devoir[] {
  const details = new Map<string, Pick<Devoir, 'contenu' | 'prof' | 'seance' | 'pieces'>>();
  for (const j of jours)
    for (const m of j.matieres)
      if (m.aFaire) {
        const pieces = (m.aFaire.documents ?? []).map((d) => d.libelle).filter((x): x is string => !!x);
        details.set(String(m.aFaire.idDevoir), {
          contenu: contenuED(m.aFaire.contenu),
          prof: m.nomProf?.trim() || undefined,
          seance: contenuED(m.contenuDeSeance?.contenu),
          pieces: pieces.length ? pieces : undefined,
        });
      }
  return Object.entries(liste)
    .flatMap(([pour, devoirs]) =>
      devoirs.map((dv) => ({
        id: String(dv.idDevoir),
        pour,
        matiere: nomMatiere(dv.matiere),
        codeMatiere: dv.codeMatiere || undefined,
        donneLe: dv.donneLe || undefined,
        effectue: dv.effectue ?? false,
        interrogation: dv.interrogation ?? false,
        ...details.get(String(dv.idDevoir)),
      })),
    )
    .sort((a, b) => a.pour.localeCompare(b.pour) || a.matiere.localeCompare(b.matiere));
}

function typeEvenement(t: string): TypeEvenement {
  const x = t.toLowerCase();
  const connus: TypeEvenement[] = ['absence', 'retard', 'punition', 'sanction', 'encouragement', 'dispense'];
  return connus.find((k) => x.startsWith(k)) ?? 'autre';
}

export function versVieScolaire(d: z.infer<typeof vieScolaire>): EvenementVieScolaire[] {
  return [...(d.absencesRetards ?? []), ...(d.sanctionsEncouragements ?? []), ...(d.dispenses ?? [])]
    .map((e) => ({
      id: `${e.typeElement}-${e.id}`,
      type: typeEvenement(e.typeElement),
      date: e.date.slice(0, 16),
      libelle: e.libelle || e.displayDate || e.typeElement,
      motif: e.motif || undefined,
      justifie: e.justifie ?? undefined,
      par: e.par || undefined,
      commentaire: e.commentaire || undefined,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

// --- Étape 7 : messagerie et documents ---

/** Année scolaire de la messagerie (« 2026-2027 ») : elle commence en août. */
export function anneeScolaire(jour: string): string {
  const a = Number(jour.slice(0, 4));
  return Number(jour.slice(5, 7)) >= 8 ? `${a}-${a + 1}` : `${a - 1}-${a}`;
}

function expediteur(f: z.infer<typeof messageED>['from']): string {
  if (!f) return 'Expéditeur inconnu';
  const nom = [f.civilite, f.prenom, f.nom].filter(Boolean).join(' ').trim();
  return f.name?.trim() || nom || 'Expéditeur inconnu';
}

export function versMessage(m: z.infer<typeof messageED>, annee: string): Message {
  return {
    id: String(m.id),
    sujet: m.subject?.trim() || '(sans objet)',
    de: expediteur(m.from),
    date: (m.date ?? '').slice(0, 16),
    lu: m.read ?? true,
    pieces: (m.files ?? []).map((f) => ({
      id: String(f.id),
      libelle: f.libelle || 'Pièce jointe',
      type: f.type || 'PIECE_JOINTE',
      date: f.date || undefined,
      annee,
    })),
    contenu: contenuED(m.content),
  };
}

export function versMessages(d: z.infer<typeof messagesRecus>, annee: string): Message[] {
  return (d.messages.received ?? []).map((m) => versMessage(m, annee)).sort((a, b) => b.date.localeCompare(a.date));
}

const CATEGORIES: Record<string, string> = {
  notes: 'Notes et bulletins',
  viescolaire: 'Vie scolaire',
  administratifs: 'Administratif',
  inscriptions: 'Inscriptions',
  entreprises: 'Stages et entreprises',
  factures: 'Factures',
};

/** Documents rangés par catégorie ; les entrées illisibles sont ignorées, une catégorie inconnue garde son nom. */
export function versDocuments(d: Record<string, unknown>, eleveId?: string): DocumentEleve[] {
  const sortie: DocumentEleve[] = [];
  for (const [cle, liste] of Object.entries(d)) {
    if (!Array.isArray(liste)) continue;
    for (const brut of liste) {
      const r = documentED.safeParse(brut);
      if (!r.success) continue;
      const x = r.data;
      if (eleveId && x.idEleve !== undefined && x.idEleve !== null && String(x.idEleve) !== eleveId && String(x.idEleve) !== '0') continue;
      const f: Fichier = { id: String(x.id), libelle: x.libelle || 'Document', type: x.type || 'Doc', date: x.date?.slice(0, 10) || undefined };
      sortie.push({ ...f, categorie: CATEGORIES[cle] ?? cle });
    }
  }
  return sortie.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}
