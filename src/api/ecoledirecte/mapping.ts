// Seul module qui traduit le format ED vers le domaine.
import type { DonneesNotes, Periode, Profil, TypePeriode } from '@/domain/types';

import { ErreurED } from './erreurs';
import type { CompteED, DonneesNotesED } from './schemas';

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

function typePeriode(p: DonneesNotesED['periodes'][number]): TypePeriode {
  if (p.annuel) return 'annee';
  if (p.examenBlanc) return 'examen';
  return /R\d+$/.test(p.codePeriode) ? 'releve' : 'trimestre';
}

export function versDonneesNotes(d: DonneesNotesED): DonneesNotes {
  const periodes = d.periodes.map(
    (p): Periode => ({
      code: p.codePeriode,
      libelle: p.periode,
      type: typePeriode(p),
      debut: p.dateDebut,
      fin: p.dateFin,
      cloture: p.cloture ?? false,
      dateCalcul: p.ensembleMatieres.dateCalcul || undefined,
      officielleGenerale: nombre(p.ensembleMatieres.moyenneGenerale, 'moyenneGenerale'),
      matieres: p.ensembleMatieres.disciplines.map((m) => ({
        code: m.codeMatiere,
        sousCode: (m.sousMatiere && m.codeSousMatiere) || undefined,
        libelle: m.discipline,
        coef: requis(m.coef, 'coef de matière'),
        officielle: nombre(m.moyenne, 'moyenne'),
      })),
    }),
  );
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
  }));
  return { periodes, notes, parametrage: { moyenneCoefMatiere: d.parametrage?.moyenneCoefMatiere ?? true } };
}
