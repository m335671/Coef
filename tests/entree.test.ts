// Régression : la tâche de fond doit être définie par le point d'entrée, avant expo-router. Sinon, au réveil
// de l'app sans écran par Android, aucun écran n'est chargé et la tâche n'existe pas (elle ne tournait jamais).
import { readFileSync } from 'fs';
import { join } from 'path';

test('le point d’entrée définit la tâche de fond avant de charger expo-router', () => {
  const racine = join(__dirname, '..');
  const main = JSON.parse(readFileSync(join(racine, 'package.json'), 'utf8')).main as string;
  const source = readFileSync(join(racine, main), 'utf8');
  const tache = source.indexOf("import './src/sync/tache'");
  const routeur = source.indexOf("import 'expo-router/entry'");
  expect(tache).toBeGreaterThanOrEqual(0);
  expect(routeur).toBeGreaterThan(tache);
});
