// Démo de l'étape 6 : les fixtures fabriquées, passées par le vrai mapping.
import { versCours, versDevoirs, versVieScolaire } from '@/api/ecoledirecte/mapping';
import { cahierDuJour, devoirsAFaire, emploiDuTemps, vieScolaire } from '@/api/ecoledirecte/schemas';

import edt from '../../fixtures/ed/emploidutemps.json';
import liste from '../../fixtures/ed/cahierdetexte.json';
import jour from '../../fixtures/ed/cahierdetexte-jour.json';
import vie from '../../fixtures/ed/viescolaire.json';

export const coursDemo = () => versCours(emploiDuTemps.parse(edt.data));
export const devoirsDemo = () => versDevoirs(devoirsAFaire.parse(liste.data), [cahierDuJour.parse(jour.data)]);
export const vieScolaireDemo = () => versVieScolaire(vieScolaire.parse(vie.data));
/** Le lundi de la semaine des données de démo. */
export const LUNDI_DEMO = '2026-11-16';
/** « Aujourd'hui » dans la démo : le mardi de cette semaine-là. */
export const AUJOURDHUI_DEMO = '2026-11-17';
export const MAINTENANT_DEMO = `${AUJOURDHUI_DEMO} 09:41`;
