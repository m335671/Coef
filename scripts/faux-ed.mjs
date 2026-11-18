// Faux serveur EcoleDirecte, local, pour essayer les notifications de nouvelles notes sur un émulateur Android.
// Il répond avec les fixtures inventées de fixtures/ed (aucune donnée réelle) ; on y ajoute une note à la demande.
//
//   node scripts/faux-ed.mjs [port]                 démarre le serveur (8787 par défaut)
//   curl http://localhost:8787/ajouter-note         une nouvelle note apparaîtra à la prochaine synchro
//
// L'APK d'essai se construit avec EXPO_PUBLIC_FAUX_ED=http://10.0.2.2:8787/v3 (10.0.2.2 = la machine hôte vue
// depuis l'émulateur). Recette complète : docs/REPRISE.md, « Essayer les notifications ».
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.argv[2] ?? 8787);
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'ed');
const lire = (f) => JSON.parse(fs.readFileSync(path.join(FIXTURES, f), 'utf8'));

const notes = lire('notes-eleve.json');
let ajoutees = 0;

const ROUTES = [
  [/\/login\.awp/, () => lire('login-eleve.json')],
  [/\/notes\.awp/, () => notes],
  [/\/emploidutemps\.awp/, () => lire('emploidutemps.json')],
  [/\/cahierdetexte\/\d{4}-\d\d-\d\d\.awp/, () => lire('cahierdetexte-jour.json')],
  [/\/cahierdetexte\.awp/, () => lire('cahierdetexte.json')],
  [/\/viescolaire\.awp/, () => lire('viescolaire.json')],
  [/\/messages\/[^/]+\.awp/, () => lire('message.json')],
  [/\/messages\.awp/, () => lire('messages.json')],
  [/\/elevesDocuments\.awp/, () => lire('documents.json')],
];

function ajouterNote() {
  const modele = notes.data.notes.find((n) => /^\d/.test(n.valeur)) ?? notes.data.notes[0];
  const jour = new Date().toISOString().slice(0, 10);
  ajoutees += 1;
  notes.data.notes.push({
    ...modele,
    id: 900000 + ajoutees,
    devoir: `Note d’essai ${ajoutees}`,
    date: jour,
    dateSaisie: jour,
    valeur: String(12 + (ajoutees % 8)),
    noteSur: '20',
  });
  return { ajoutees, matiere: modele.codeMatiere };
}

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
    const json = (corps, entetes = {}) => {
      res.writeHead(200, { 'content-type': 'application/json', ...entetes });
      res.end(JSON.stringify(corps));
    };
    console.log(new Date().toISOString().slice(11, 19), req.method, url.pathname);
    if (url.pathname === '/ajouter-note') return json(ajouterNote());
    if (url.pathname.endsWith('/login.awp') && url.searchParams.get('gtk') === '1') return json({}, { 'set-cookie': 'GTK=gtk-essai; path=/' });
    const route = ROUTES.find(([motif]) => motif.test(url.pathname));
    if (!route) {
      res.writeHead(404);
      return res.end();
    }
    return json(route[1](), { 'x-token': 'jeton-essai' });
  })
  .listen(PORT, () => console.log(`Faux ED sur http://localhost:${PORT}/v3 — nouvelle note : curl http://localhost:${PORT}/ajouter-note`));
