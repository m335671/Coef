// Faux serveur ED pour les tests : une file de réponses, et l'historique des requêtes envoyées.

export type Envoi = { url: URL; entetes: Record<string, string>; data: Record<string, unknown> };

export function fauxServeur() {
  const envois: Envoi[] = [];
  const file: (() => Response)[] = [];
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const corps = String(init?.body ?? '');
    envois.push({
      url: new URL(String(url)),
      entetes: (init?.headers ?? {}) as Record<string, string>,
      data: JSON.parse(new URLSearchParams(corps).get('data') ?? '{}'),
    });
    const suivante = file.shift();
    if (!suivante) throw new Error('faux serveur : plus de réponse prévue');
    return suivante();
  });
  return {
    envois,
    repond(json: unknown, entetes: Record<string, string> = {}, statut = 200) {
      file.push(() => new Response(JSON.stringify(json), { status: statut, headers: entetes }));
      return this;
    },
    repondTexte(texte: string, statut: number) {
      file.push(() => new Response(texte, { status: statut }));
      return this;
    },
  };
}
