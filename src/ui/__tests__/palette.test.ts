import * as fc from 'fast-check';

import { clesMatiere } from '@/features/notes/familles';

import { couleursDepuis, matiereDepuis } from '../palette';
import type { Couleurs } from '../theme';

// Contraste WCAG 2 entre deux couleurs « #rrggbb ».
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
const contraste = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

const graine = fc.integer({ min: 0, max: 0xffffff }).map((n) => `#${n.toString(16).padStart(6, '0')}`);
const base = {} as Couleurs; // les couleurs fixes (orange, violet) ne sont pas en jeu ici

test.each([false, true])('thème généré lisible (AA) quelle que soit la couleur, sombre=%s', (sombre) => {
  fc.assert(
    fc.property(graine, (g) => {
      const c = couleursDepuis(g, sombre, base);
      for (const hex of Object.values(c)) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      for (const fond of [c.fond, c.surface]) {
        expect(contraste(c.texte, fond)).toBeGreaterThanOrEqual(4.5);
        expect(contraste(c.attenue, fond)).toBeGreaterThanOrEqual(4.5);
        expect(contraste(c.accent, fond)).toBeGreaterThanOrEqual(4.5); // l'accent sert aussi de couleur de lien
      }
      expect(contraste(c.surAccent, c.accent)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(c.accentEncre, c.teinte50)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(c.accentEncre, c.teinte100)).toBeGreaterThanOrEqual(4.5);
    }),
  );
});

test.each([false, true])('matière à couleur choisie lisible (AA), sombre=%s', (sombre) => {
  fc.assert(
    fc.property(graine, (g) => {
      const m = matiereDepuis(g, sombre);
      expect(contraste(m.encre, m.fond)).toBeGreaterThanOrEqual(4.5);
    }),
  );
});

test('une matière se retrouve par son code ou par son nom (agenda sans code)', () => {
  expect(clesMatiere('MATHS', 'Mathématiques')).toEqual(['MATHS', 'nom:MATHEMATIQUES']);
  expect(clesMatiere('', 'Mathématiques')).toEqual(['nom:MATHEMATIQUES']);
  expect(clesMatiere('X', '')).toEqual(['X']);
});
