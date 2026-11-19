// Repère les adresses web et e-mail d'un texte, pour les rendre touchables.

export type Morceau = { texte: string; url?: string };

const ADRESSE = /(https?:\/\/[^\s<>()]+|www\.[^\s<>()]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/gi;

/** Coupe le texte en morceaux ; une adresse donne un morceau avec son `url` (la ponctuation finale reste du texte). */
export function decouperLiens(texte: string): Morceau[] {
  const sortie: Morceau[] = [];
  let i = 0;
  for (const m of texte.matchAll(ADRESSE)) {
    const brut = m[0].replace(/[.,;:!?'’"»]+$/, '');
    const debut = m.index;
    if (debut > i) sortie.push({ texte: texte.slice(i, debut) });
    const url = brut.includes('@') && !/^https?:|^www\./i.test(brut) ? `mailto:${brut}` : /^www\./i.test(brut) ? `https://${brut}` : brut;
    sortie.push({ texte: brut, url });
    i = debut + brut.length;
  }
  if (i < texte.length) sortie.push({ texte: texte.slice(i) });
  return sortie;
}
