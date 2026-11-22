// Seul module qui traduit le format ED vers le domaine.
import { nomMatiere } from '@/domain/matieres';
import type {
  Cours,
  Devoir,
  DocumentEleve,
  DonneesNotes,
  EvenementVieScolaire,
  Fichier,
  Fragment,
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
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  laquo: '«',
  raquo: '»',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  euro: '€',
  deg: '°',
  copy: '©',
  bull: '•',
  ugrave: 'ù',
  ucirc: 'û',
  uuml: 'ü',
  icirc: 'î',
  iuml: 'ï',
  euml: 'ë',
  acirc: 'â',
  oelig: 'œ',
  aelig: 'æ',
  Eacute: 'É',
  Egrave: 'È',
  Ecirc: 'Ê',
  Agrave: 'À',
  Ccedil: 'Ç',
  OElig: 'Œ',
};

// Caractères 0x80–0x9F : du Windows-1252 passé tel quel (l'apostrophe de Word, 0x92, s'affichait en carré barré).
const CP1252 = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008DŽ\u008F\u0090‘’“”•–—˜™š›œ\u009DžŸ';
const depuis1252 = (car: string) => {
  const r = CP1252[car.charCodeAt(0) - 0x80] ?? '';
  return r < '\u00a0' ? '' : r;
};

/** Un lien `<a href>` : son texte, suivi de l'adresse quand elle n'y est pas déjà (rendue touchable à l'affichage). */
function lien(href: string, contenu: string): string {
  const texte = contenu.replace(/<[^>]+>/g, '').trim();
  const adresse = href.trim().replace(/^mailto:/i, '');
  if (!/^(https?:\/\/|www\.|[^\s@]+@)/i.test(adresse)) return texte;
  return !texte || adresse.includes(texte) || texte.includes(adresse) ? adresse : `${texte} (${adresse})`;
}

/** Entités HTML, caractères Windows-1252 passés tels quels, espaces invisibles. */
function decoderTexte(t: string): string {
  return t
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, nom: string) => ENTITES[nom] ?? ENTITES[nom.toLowerCase()] ?? m)
    .replace(/[\u0080-\u009f]/g, depuis1252)
    .replace(/[​﻿]/g, '');
}

const attribut = (attrs: string, nom: string) =>
  new RegExp(`\\b${nom}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i')
    .exec(attrs)
    ?.slice(2)
    .find((x) => x !== undefined);

/** « #abc », « #aabbcc », « rgb(1, 2, 3) » → « #aabbcc » ; le reste (noms de couleur, transparent) → undefined. */
function couleur(css: string): string | undefined {
  const v = css.trim().toLowerCase();
  const court = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
  if (court) return `#${court[1]}${court[1]}${court[2]}${court[2]}${court[3]}${court[3]}`;
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(v);
  return rgb
    ? `#${rgb
        .slice(1, 4)
        .map((x) => Math.min(255, Number(x)).toString(16).padStart(2, '0'))
        .join('')}`
    : undefined;
}

// Fonds presque blancs (paragraphes grisés du site officiel) : sans intérêt dans Coef, et gênants en mode sombre.
const presqueBlanc = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r! + 0.587 * g! + 0.114 * b! > 225;
};

type Style = Omit<Extract<Fragment, { texte: string }>, 'texte'>;

function styleDe(balise: string, attrs: string): Style {
  const s: Style = {};
  if (balise === 'b' || balise === 'strong') s.gras = true;
  if (balise === 'i' || balise === 'em') s.italique = true;
  if (balise === 'u') s.souligne = true;
  if (balise === 'mark') s.surligne = '#fde047';
  if (balise === 'a') {
    const href = attribut(attrs, 'href')?.trim() ?? '';
    if (/^(https?:\/\/|mailto:)/i.test(href)) s.lien = href;
  }
  for (const regle of (attribut(attrs, 'style') ?? '').split(';')) {
    const [prop, ...reste] = regle.split(':');
    const nom = prop?.trim().toLowerCase();
    const val = reste.join(':').trim().toLowerCase();
    if (nom === 'font-weight' && /bold|[6-9]00/.test(val)) s.gras = true;
    if (nom === 'font-style' && val.includes('italic')) s.italique = true;
    if (nom === 'text-decoration' && val.includes('underline')) s.souligne = true;
    if (nom === 'background' || nom === 'background-color') {
      const c = couleur(val.split(/\s+(?![^(]*\))/)[0] ?? '');
      if (c && !presqueBlanc(c)) s.surligne = c;
    }
  }
  return s;
}

const BLOC = /^(p|div|li|h[1-6]|tr|blockquote|ul|ol|table)$/;
const INVISIBLE = /^(style|script|head|title)$/;
const memeStyle = (a: Style, b: Style) =>
  a.gras === b.gras && a.italique === b.italique && a.souligne === b.souligne && a.surligne === b.surligne && a.lien === b.lien;

/**
 * HTML d'un message → fragments mis en forme : gras, italique, souligné, surligné, liens ; images intégrées (`data:`)
 * seulement. Une image hébergée ailleurs n'est pas chargée (ce serait une requête hors d'EcoleDirecte). La couleur du
 * texte est ignorée : choisie pour un fond blanc, elle serait illisible en mode sombre.
 */
export function htmlEnFragments(html: string): Fragment[] {
  const pile: { balise: string; style: Style }[] = [];
  const sortie: Fragment[] = [];
  let invisible = 0;
  const ajouter = (t: string) => {
    if (!t || invisible) return;
    const style: Style = Object.assign({}, ...pile.map((p) => p.style));
    const prec = sortie.at(-1);
    if (prec && 'texte' in prec && memeStyle(prec, style)) prec.texte += t;
    else sortie.push({ texte: t, ...style });
  };
  for (const m of html.matchAll(/<!--[^]*?-->|<(\/?)([a-z][a-z0-9]*)\b([^>]*)>|([^<]+)|</gi)) {
    if (m[4] !== undefined) {
      ajouter(decoderTexte(m[4].replace(/\s+/g, ' ')));
      continue;
    }
    const balise = m[2]?.toLowerCase();
    if (!balise) continue;
    const ferme = m[1] === '/';
    const attrs = m[3] ?? '';
    if (INVISIBLE.test(balise)) invisible = Math.max(0, invisible + (ferme ? -1 : 1));
    else if (balise === 'br') ajouter('\n');
    else if (balise === 'img') {
      const src = attribut(attrs, 'src') ?? '';
      if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(src) && !invisible) sortie.push({ image: src });
      else ajouter('[image non affichée]');
    } else if (ferme) {
      const i = pile.map((p) => p.balise).lastIndexOf(balise);
      if (i >= 0) pile.splice(i);
      if (BLOC.test(balise)) ajouter('\n');
    } else {
      if (balise === 'li') ajouter('• ');
      if (!/\/\s*$/.test(attrs)) pile.push({ balise, style: styleDe(balise, attrs) });
    }
  }
  // Pas d'espace autour des sauts de ligne, une ligne vide au plus, rien au début ni à la fin.
  const propres: Fragment[] = [];
  let fin = '\n\n';
  for (const f of sortie) {
    if (!('texte' in f)) {
      propres.push(f);
      fin = '\n\n';
      continue;
    }
    let t = f.texte.replace(/[ \t]*\n[ \t]*/g, '\n').replace(/\n{3,}/g, '\n\n');
    if (fin.endsWith('\n')) t = t.replace(/^ +/, '');
    t = fin === '\n\n' ? t.replace(/^\n+/, '') : fin.endsWith('\n') ? t.replace(/^\n+/, '\n') : t;
    if (!t) continue;
    propres.push({ ...f, texte: t });
    fin = (fin + t).slice(-2);
  }
  while (propres.length) {
    const d = propres.at(-1)!;
    if (!('texte' in d)) break;
    const t = d.texte.replace(/\s+$/, '');
    if (t) {
      propres[propres.length - 1] = { ...d, texte: t };
      break;
    }
    propres.pop();
  }
  return propres;
}

/** HTML d'ED (consigne, message) → texte : sauts de ligne gardés, liens écrits en clair, balises retirées, entités décodées. */
export function htmlEnTexte(html: string): string {
  return html
    .replace(/<a\b[^>]*?href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, contenu: string) => lien(href, contenu))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/[^]*/, decoderTexte)
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

/** Contenu ED en base64 → fragments mis en forme ; invalide ou vide → undefined (l'écran garde le texte simple). */
function richeED(b64?: string | null): Fragment[] | undefined {
  if (!b64) return undefined;
  try {
    const f = htmlEnFragments(decoderBase64(b64));
    return f.length ? f : undefined;
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
    riche: richeED(m.content),
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
export function versDocuments(d: Record<string, unknown>, eleveId?: string, archive?: string): DocumentEleve[] {
  const sortie: DocumentEleve[] = [];
  for (const [cle, liste] of Object.entries(d)) {
    if (!Array.isArray(liste)) continue;
    for (const brut of liste) {
      const r = documentED.safeParse(brut);
      if (!r.success) continue;
      const x = r.data;
      if (eleveId && x.idEleve !== undefined && x.idEleve !== null && String(x.idEleve) !== eleveId && String(x.idEleve) !== '0') continue;
      const f: Fichier = { id: String(x.id), libelle: x.libelle || 'Document', type: x.type || 'Doc', date: x.date?.slice(0, 10) || undefined };
      sortie.push({ ...f, categorie: CATEGORIES[cle] ?? cle, ...(archive ? { archive } : {}) });
    }
  }
  return sortie.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}
