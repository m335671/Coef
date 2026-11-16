// Règle de confidentialité : seul src/api/http.ts a le droit de parler au réseau.
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

const RACINE = join(__dirname, '..');
const AUTORISE = 'src/api/http.ts';
const INTERDITS = [/\bfetch\s*\(/, /XMLHttpRequest/, /\bWebSocket\b/, /from ['"](axios|ky|ofetch|got|undici)['"]/];

function fichiers(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return fichiers(p);
    return /\.(ts|tsx|js|jsx)$/.test(f) ? [p] : [];
  });
}

test('aucun accès réseau hors de src/api/http.ts', () => {
  const fautifs = ['app', 'src', 'fixtures', 'modules']
    .flatMap((d) => fichiers(join(RACINE, d)))
    .map((p) => relative(RACINE, p).split(sep).join('/'))
    .filter((p) => p !== AUTORISE)
    .filter((p) => INTERDITS.some((re) => re.test(readFileSync(join(RACINE, p), 'utf8'))));
  expect(fautifs).toEqual([]);
});
