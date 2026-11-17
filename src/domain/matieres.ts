// Noms de matières lisibles. ED envoie des libellés d'établissement, souvent en majuscules et abrégés
// (« INGEN.INNOV.DEV.DUR. », « ED.PHYSIQUE & SPORT. ») : on les met en casse de phrase, accents rétablis,
// abréviations développées. Ce qui n'est pas reconnu garde ses mots, seulement remis en casse de phrase.

const cle = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

/** Libellés connus en entier (clé normalisée → nom). Prioritaires sur le mot à mot. */
const CONNUS: Record<string, string> = {
  'INGEN INNOV DEV DUR': 'Ingénierie, innovation et développement durable',
  'SYST INFO ET NUM': 'Systèmes d’information et numérique',
  'ENS TECHNO TRANS': 'Enseignement technologique transversal',
  'ED PHYSIQUE SPORT': 'Éducation physique et sportive',
  'ENS MORAL CIVIQUE': 'Enseignement moral et civique',
  'SPE PHYSIQUE MATHS': 'Physique-chimie et maths (spécialité)',
  'SC VIE TERRE': 'Sciences de la vie et de la Terre',
  'SCIENCES ECONO SOCIALES': 'Sciences économiques et sociales',
  'SCIENCES ECO SOCIALES': 'Sciences économiques et sociales',
  'HIST GEO GEOPOL SC POL': 'Histoire-géo, géopolitique et sciences politiques',
  'HUMAN LITTER PHILO': 'Humanités, littérature et philosophie',
  'NUMERIQUE SC INFORM': 'Numérique et sciences informatiques',
  'SC NUMERIQUES TECHNOL': 'Sciences numériques et technologie',
  'ACCOMPAGNEMT PERSO': 'Accompagnement personnalisé',
  'VIE DE CLASSE': 'Vie de classe',
};

/** Mot ED (clé) → mot lisible, en minuscules sauf nom propre. */
const MOTS: Record<string, string> = {
  MATHEMATIQUES: 'mathématiques',
  MATHS: 'maths',
  FRANCAIS: 'français',
  HISTOIRE: 'histoire',
  GEOGRAPHIE: 'géographie',
  PHYSIQUE: 'physique',
  CHIMIE: 'chimie',
  EDUCATION: 'éducation',
  ED: 'éducation',
  ENS: 'enseignement',
  SC: 'sciences',
  SCI: 'sciences',
  ECONO: 'économiques',
  ECO: 'économie',
  ECONOMIQUES: 'économiques',
  TECHNO: 'technologie',
  TECHNOLOGIE: 'technologie',
  TECHNOLOGIQUE: 'technologique',
  INFO: 'informatique',
  NUM: 'numérique',
  NUMERIQUE: 'numérique',
  SYST: 'systèmes',
  INGEN: 'ingénierie',
  INNOV: 'innovation',
  DEV: 'développement',
  DUR: 'durable',
  MUSICALE: 'musicale',
  ARTS: 'arts',
  PLASTIQUES: 'plastiques',
  ANGLAIS: 'anglais',
  ALLEMAND: 'allemand',
  ESPAGNOL: 'espagnol',
  ITALIEN: 'italien',
  LATIN: 'latin',
  GREC: 'grec',
  PHILOSOPHIE: 'philosophie',
  LITTERATURE: 'littérature',
  ETRANGERE: 'étrangère',
  ETRANGERES: 'étrangères',
  LANGUE: 'langue',
  LANGUES: 'langues',
  SPE: 'spécialité',
  SPECIALITE: 'spécialité',
  OPTION: 'option',
  ET: 'et',
  DE: 'de',
  DES: 'des',
  LA: 'la',
  LE: 'le',
  TERRE: 'Terre',
  VIE: 'vie',
};

/** Sigles gardés en majuscules : niveaux de langue, enseignements de spécialité connus. */
const SIGLE = /^(LV\d|LV[ABC]|ETLV|EPS|SVT|SES|NSI|SNT|EMC|HGGSP|HLP|LLCER|LLCE|AMC|DNL|STI2D|STL|STMG|STD2A|2I2D|SIN|ITEC|EE|AC|AP|EPI|DS|CAV|ETT)$/;

/** « TC » (tronc commun) n'aide pas l'élève : retiré. */
const RETIRES = new Set(['TC']);

export function nomMatiere(brut: string): string {
  const texte = brut.trim();
  if (!texte) return texte;
  const k = cle(texte);
  const connu = CONNUS[k];
  if (connu) return connu;
  // Libellé déjà en casse mixte (saisi proprement par l'établissement) : on n'y touche pas.
  if (/[a-zà-ÿ]/.test(texte)) return texte.replace(/\s*&\s*/g, ' et ');

  const mots = texte
    .replace(/\s*&\s*/g, ' et ')
    .split(/(\s+|-|\.)/)
    .filter((x) => x && x !== '.' && !/^\s+$/.test(x));
  const sortie: string[] = [];
  for (const m of mots) {
    if (m === '-') {
      sortie.push('-');
      continue;
    }
    const n = cle(m);
    if (RETIRES.has(n)) continue;
    if (SIGLE.test(n)) sortie.push(n);
    else sortie.push(MOTS[n] ?? m.toLowerCase());
  }
  const phrase = sortie.join(' ').replace(/ - /g, '-').replace(/\s+/g, ' ').trim();
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}
