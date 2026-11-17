// Client EcoleDirecte, parcours « application mobile » (voir docs/API-ED.md pour chaque hypothèse).
import type { z } from 'zod';

import type { Cours, Devoir, DonneesNotes, EvenementVieScolaire } from '@/domain/types';

import { ErreurReseau, requete } from '../http';
import { decoderBase64, encoderBase64 } from './base64';
import { CAPTURE, capturer } from './capture';
import { ErreurED } from './erreurs';
import { versCours, versDevoirs, versDonneesNotes, versVieScolaire } from './mapping';
import {
  cahierDuJour,
  cleAppareil,
  type CompteED,
  devoirsAFaire,
  donneesConnexion,
  donneesNotes,
  emploiDuTemps,
  enveloppe,
  questionQCM,
  vieScolaire,
} from './schemas';

export const API = 'https://api.ecoledirecte.com/v3';
/** Paramètre v= : hypothèse, à corriger ici si ED renvoie le code 517. */
export const VERSION_API = '8.0.0';
// Même User-Agent que blocksdirecte (Papillon, en production) : un User-Agent à nous serait peut-être refusé.
const USER_AGENT = `Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 EDMOBILE v${VERSION_API}`;

const CODE = { OK: 200, VIDE: 210, QCM: 250, IDENTIFIANTS: 505, VERSION: 517, JETON_INVALIDE: 520, JETON_EXPIRE: 525 };

export type CleAppareil = z.infer<typeof cleAppareil>;

/** De quoi se reconnecter sans mot de passe. À ranger dans SecureStore uniquement. */
export type Acces = {
  identifiant: string;
  uuid: string;
  typeCompte: string;
  accessToken: string;
  appareil?: CleAppareil;
};

export type Session = { token: string; comptes: CompteED[]; acces: Acces };

export type ResultatConnexion = { etape: 'connecte'; session: Session } | { etape: 'qcm'; jeton2fa: string; question: string; propositions: string[] };

type Reponse = { code: number; token?: string; data: unknown; entetes: Headers };

// Hypothèse (essai réel du 16/11/2026, 505 sans lui) : ED exige le jeton GTK avant login, même en parcours mobile.
// Les cookies posés avec lui sont gardés et renvoyés par le client HTTP natif.
let enteteGTK: Record<string, string> = {};

async function preparerGTK(): Promise<void> {
  try {
    const rep = await requete(`${API}/login.awp?gtk=1&v=${VERSION_API}`, { method: 'GET', headers: { 'User-Agent': USER_AGENT } });
    const gtk = /GTK=([^;,\s]+)/.exec(rep.headers.get('set-cookie') ?? '')?.[1];
    enteteGTK = gtk ? { 'X-Gtk': gtk } : {};
    if (CAPTURE) capturer('/login.awp?gtk=1', rep.status, rep.headers, { gtkRecu: Boolean(gtk) });
  } catch {
    enteteGTK = {}; // on tente quand même la connexion
  }
}

async function appel(chemin: string, verbe: string | undefined, data: object, entetes: Record<string, string>): Promise<Reponse> {
  const url = `${API}${chemin}?${verbe ? `verbe=${verbe}&` : ''}v=${VERSION_API}`;
  let rep: Response;
  try {
    rep = await requete(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT, ...enteteGTK, ...entetes },
      body: `data=${encodeURIComponent(JSON.stringify(data))}`,
    });
  } catch (e) {
    if (e instanceof ErreurReseau) throw new ErreurED('reseau');
    throw e;
  }
  if (rep.status >= 500) throw new ErreurED('serveur', `HTTP ${rep.status}`);
  let json: unknown;
  try {
    json = await rep.json();
  } catch {
    throw new ErreurED('reponse-inattendue', `${chemin} : pas du JSON (HTTP ${rep.status})`);
  }
  if (CAPTURE) capturer(chemin, rep.status, rep.headers, json);
  const env = valider(enveloppe, json, chemin);
  // Le jeton est renouvelé à chaque réponse : en-tête x-token, sinon champ token du corps.
  const token = rep.headers.get('x-token') || env.token || undefined;
  return { code: env.code, token, data: env.data, entetes: rep.headers };
}

function valider<T>(schema: z.ZodType<T>, valeur: unknown, ou: string): T {
  const r = schema.safeParse(valeur);
  if (!r.success) {
    // Seuls les chemins des champs fautifs sont gardés, jamais les valeurs.
    const champs = r.error.issues.map((i) => i.path.join('.') || '(racine)').join(', ');
    throw new ErreurED('reponse-inattendue', `${ou} : ${champs}`);
  }
  return r.data;
}

function verifierCode(code: number): void {
  if (code === CODE.OK || code === CODE.VIDE) return;
  if (code === CODE.IDENTIFIANTS) throw new ErreurED('identifiants');
  if (code === CODE.VERSION) throw new ErreurED('version-api');
  if (code === CODE.JETON_INVALIDE || code === CODE.JETON_EXPIRE) throw new ErreurED('session-expiree', `code ${code}`);
  throw new ErreurED('serveur', `code ${code}`);
}

function ouvrirSession(r: Reponse, acces: Omit<Acces, 'accessToken' | 'typeCompte'>): Session {
  const { accounts } = valider(donneesConnexion, r.data, 'login');
  const principal = accounts.find((c) => c.main) ?? accounts[0]!;
  if (!r.token || !principal.accessToken) throw new ErreurED('reponse-inattendue', 'login : jeton absent');
  return {
    token: r.token,
    comptes: accounts,
    acces: { ...acces, typeCompte: principal.typeCompte, accessToken: principal.accessToken },
  };
}

/**
 * Connexion par mot de passe. Le mot de passe n'est ni stocké ni journalisé ici :
 * la reconnexion se fait ensuite avec l'accessToken (Acces).
 */
export async function connexion(p: { identifiant: string; motDePasse: string; uuid: string; appareil?: CleAppareil }): Promise<ResultatConnexion> {
  await preparerGTK();
  const r = await appel(
    '/login.awp',
    undefined,
    {
      identifiant: p.identifiant,
      motdepasse: p.motDePasse,
      isReLogin: false,
      sesouvenirdemoi: true,
      uuid: p.uuid,
      cn: p.appareil?.cn,
      cv: p.appareil?.cv,
      fa: p.appareil ? [p.appareil] : undefined,
    },
    {},
  );

  if (r.code === CODE.QCM) {
    const jeton2fa = r.entetes.get('2fa-token') ?? r.token;
    if (!jeton2fa) throw new ErreurED('reponse-inattendue', 'login : jeton 2FA absent');
    const q = await appel('/connexion/doubleauth.awp', 'get', {}, { '2fa-token': jeton2fa });
    verifierCode(q.code);
    const { question, propositions } = valider(questionQCM, q.data, 'doubleauth');
    return { etape: 'qcm', jeton2fa, question: decoderBase64(question), propositions: propositions.map(decoderBase64) };
  }
  verifierCode(r.code);
  return { etape: 'connecte', session: ouvrirSession(r, { identifiant: p.identifiant, uuid: p.uuid, appareil: p.appareil }) };
}

/** Réponse au QCM. Rend la clé d'appareil (cn/cv) à repasser à connexion() puis à conserver. */
export async function repondreQCM(jeton2fa: string, choix: string): Promise<CleAppareil> {
  const r = await appel('/connexion/doubleauth.awp', 'post', { choix: encoderBase64(choix) }, { '2fa-token': jeton2fa });
  if (r.code === CODE.IDENTIFIANTS) throw new ErreurED('qcm-echoue');
  verifierCode(r.code);
  return valider(cleAppareil, r.data, 'doubleauth');
}

/** Reconnexion silencieuse. L'accessToken est à usage unique : le nouveau doit être sauvegardé. */
export async function reconnexion(acces: Acces): Promise<Session> {
  await preparerGTK();
  const r = await appel(
    '/login.awp',
    undefined,
    {
      identifiant: acces.identifiant,
      uuid: acces.uuid,
      isReLogin: true,
      motdepasse: '???',
      typeCompte: acces.typeCompte,
      accesstoken: acces.accessToken,
      fa: acces.appareil ? [acces.appareil] : undefined,
    },
    {},
  );
  if (r.code !== CODE.OK) throw new ErreurED('session-expiree', `relogin code ${r.code}`);
  return ouvrirSession(r, acces);
}

/** Appels authentifiés, avec reconnexion silencieuse une fois si le jeton a expiré. */
export class ClientED {
  private renouvellement?: Promise<void>;

  constructor(
    private session: Session,
    /** Appelé à chaque rotation de l'accessToken, pour le sauvegarder. */
    private readonly surNouvelAcces: (acces: Acces) => Promise<void> | void,
  ) {}

  get comptes(): CompteED[] {
    return this.session.comptes;
  }

  async post(chemin: string, data: object = {}, verbe: 'get' | 'put' = 'get'): Promise<unknown> {
    let r = await appel(chemin, verbe, data, { 'X-Token': this.session.token });
    if (r.code === CODE.JETON_INVALIDE || r.code === CODE.JETON_EXPIRE) {
      await this.renouveler();
      r = await appel(chemin, verbe, data, { 'X-Token': this.session.token });
    }
    verifierCode(r.code);
    if (r.token) this.session.token = r.token;
    return r.data;
  }

  /** Une seule reconnexion à la fois : l'accessToken ne sert qu'une fois. */
  private renouveler(): Promise<void> {
    this.renouvellement ??= (async () => {
      try {
        this.session = await reconnexion(this.session.acces);
        await this.surNouvelAcces(this.session.acces);
      } finally {
        this.renouvellement = undefined;
      }
    })();
    return this.renouvellement;
  }

  /** Cours entre deux dates (AAAA-MM-JJ). Chemin et format supposés : docs/API-ED.md. */
  async emploiDuTemps(eleveId: string, debut: string, fin: string): Promise<Cours[]> {
    const data = await this.post(`/E/${eleveId}/emploidutemps.awp`, { dateDebut: debut, dateFin: fin, avecTrous: false });
    return versCours(valider(emploiDuTemps, data, 'emploidutemps'));
  }

  /**
   * Devoirs à faire, avec la consigne des `joursDetailles` prochains jours à partir d'aujourd'hui (une requête
   * par jour, en file : pas de rafale). La liste d'ED contient aussi les jours passés (capture réelle) : sans ce
   * filtre, le détail chargé était celui des devoirs déjà rendus. Chemins : docs/API-ED.md.
   */
  async devoirs(eleveId: string, joursDetailles = 7, aujourdhui = jourLocal()): Promise<Devoir[]> {
    const liste = valider(devoirsAFaire, await this.post(`/Eleves/${eleveId}/cahierdetexte.awp`, {}), 'cahierdetexte');
    const jours = [];
    for (const date of Object.keys(liste)
      .filter((j) => j >= aujourdhui)
      .sort()
      .slice(0, joursDetailles)) {
      jours.push(valider(cahierDuJour, await this.post(`/Eleves/${eleveId}/cahierdetexte/${date}.awp`, {}), 'cahierdetexte/jour'));
    }
    return versDevoirs(liste, jours);
  }

  /**
   * Coche ou décoche des devoirs « effectués » : la première écriture vers ED. Verbe `put` et corps
   * `idDevoirsEffectues` / `idDevoirsNonEffectues` supposés (docs/API-ED.md).
   */
  async marquerDevoirs(eleveId: string, faits: string[], nonFaits: string[] = []): Promise<void> {
    await this.post(`/Eleves/${eleveId}/cahierdetexte.awp`, { idDevoirsEffectues: faits.map(Number), idDevoirsNonEffectues: nonFaits.map(Number) }, 'put');
  }

  /** Absences, retards, sanctions, encouragements, dispenses. Chemin et format supposés : docs/API-ED.md. */
  async vieScolaire(eleveId: string): Promise<EvenementVieScolaire[]> {
    return versVieScolaire(valider(vieScolaire, await this.post(`/eleves/${eleveId}/viescolaire.awp`, {}), 'viescolaire'));
  }

  /** Notes, périodes et paramétrage d'un élève, validés puis traduits vers le domaine. */
  async notes(eleveId: string): Promise<DonneesNotes> {
    const data = await this.post(`/eleves/${eleveId}/notes.awp`, { anneeScolaire: '' });
    return versDonneesNotes(valider(donneesNotes, data, 'notes'));
  }
}

/** Date du jour (AAAA-MM-JJ) dans le fuseau du téléphone. */
function jourLocal(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
