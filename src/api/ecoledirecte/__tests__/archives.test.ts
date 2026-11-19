import { ClientED } from '../client';

/** Client dont `post` répond selon l'année demandée (`archive=` vide : l'année en cours). */
function client(reponses: Record<string, unknown>) {
  const appels: string[] = [];
  const c = Object.create(ClientED.prototype) as ClientED;
  c.post = async (chemin: string) => {
    const archive = /archive=([^&]*)/.exec(chemin)?.[1] ?? '';
    appels.push(archive);
    const r = reponses[archive];
    if (r instanceof Error) throw r;
    return r ?? {};
  };
  return { c, appels };
}

const doc = (id: number) => ({ notes: [{ id, libelle: `Bulletin ${id}`, type: 'Note', date: '2025-01-10' }] });

test('documents : remonte les années passées et s’arrête à la première sans rien de neuf', async () => {
  const { c, appels } = client({ '': doc(1), '2025-2026': doc(2), '2024-2025': doc(3) });
  const d = await c.documents(undefined, '2026-11-19');
  expect(d.map((x) => [x.id, x.archive])).toEqual([
    ['1', undefined],
    ['2', '2025-2026'],
    ['3', '2024-2025'],
  ]);
  expect(appels).toEqual(['', '2025-2026', '2024-2025', '2023-2024']);
});

test('documents : ED qui ignore le paramètre ou refuse une année ne casse rien', async () => {
  const ignore = client({ '': doc(1), '2025-2026': doc(1) });
  expect((await ignore.c.documents(undefined, '2026-11-19')).map((x) => x.id)).toEqual(['1']);
  const refus = client({ '': doc(1), '2025-2026': new Error('refus') });
  expect((await refus.c.documents(undefined, '2026-11-19')).map((x) => x.id)).toEqual(['1']);
});
