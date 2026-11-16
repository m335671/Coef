// Seul module qui traduit le format ED vers le domaine.
import type { Profil } from '@/domain/types';
import type { CompteED } from './schemas';

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
