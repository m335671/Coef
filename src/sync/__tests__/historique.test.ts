import { ajouterBilan, type BilanFond, decrireBilan, MAX_HISTORIQUE, regularite } from '../historique';

const maintenant = new Date('2026-11-23T18:00:00Z');
const il_y_a = (h: number, extra: Partial<BilanFond> = {}): BilanFond => ({
  date: new Date(maintenant.getTime() - h * 3_600_000).toISOString(),
  resultat: 'ok',
  ...extra,
});

test('historique : le plus récent d’abord, borné', () => {
  let h: BilanFond[] = [];
  for (let i = 0; i < MAX_HISTORIQUE + 5; i++) h = ajouterBilan(h, il_y_a(-i));
  expect(h).toHaveLength(MAX_HISTORIQUE);
  expect(Date.parse(h[0]!.date)).toBeGreaterThan(Date.parse(h[1]!.date));
});

test('description d’un bilan', () => {
  expect(decrireBilan(il_y_a(0))).toBe('rien de nouveau');
  expect(decrireBilan(il_y_a(0, { notifiees: 2 }))).toBe('2 notifications');
  expect(decrireBilan(il_y_a(0, { resultat: 'echec', erreur: 'ErreurED : EcoleDirecte est injoignable.' }))).toBe(
    'échec (ErreurED : EcoleDirecte est injoignable.)',
  );
  expect(decrireBilan(il_y_a(0, { resultat: 'premier-plan' }))).toBe('app ouverte, elle s’en est chargée');
});

test('rythme normal : une par heure, ou rien encore', () => {
  expect(regularite([], maintenant)).toEqual({ irregulier: false });
  expect(
    regularite(
      [0.5, 1.5, 2.6, 3.7, 4.9].map((x) => il_y_a(x)),
      maintenant,
    ),
  ).toEqual({ irregulier: false });
});

test('anormal : dernière vérification trop ancienne (un test récent ne compte pas)', () => {
  const r = regularite([il_y_a(0.1, { test: true }), il_y_a(8)], maintenant);
  expect(r).toEqual({ irregulier: true, raison: 'aucune vérification depuis 8 h' });
});

test('anormal : écart médian au-delà de 3 h', () => {
  const r = regularite(
    [1, 5, 10, 15, 20].map((x) => il_y_a(x)),
    maintenant,
  );
  expect(r.irregulier).toBe(true);
  expect(r.irregulier && r.raison).toMatch(/toutes les 5 h/);
});
