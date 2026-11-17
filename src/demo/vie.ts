// Démo de l'étape 6 : les fixtures fabriquées, passées par le vrai mapping.
import { versCours, versDevoirs, versDocuments, versMessage, versMessages, versVieScolaire } from '@/api/ecoledirecte/mapping';
import { cahierDuJour, devoirsAFaire, documentsED, emploiDuTemps, messageED, messagesRecus, vieScolaire } from '@/api/ecoledirecte/schemas';

import edt from '../../fixtures/ed/emploidutemps.json';
import liste from '../../fixtures/ed/cahierdetexte.json';
import jour from '../../fixtures/ed/cahierdetexte-jour.json';
import vie from '../../fixtures/ed/viescolaire.json';
import documents from '../../fixtures/ed/documents.json';
import message from '../../fixtures/ed/message.json';
import messages from '../../fixtures/ed/messages.json';

export const coursDemo = () => versCours(emploiDuTemps.parse(edt.data));
export const devoirsDemo = () => versDevoirs(devoirsAFaire.parse(liste.data), [cahierDuJour.parse(jour.data)]);
export const vieScolaireDemo = () => versVieScolaire(vieScolaire.parse(vie.data));
export const messagesDemo = () => versMessages(messagesRecus.parse(messages.data), '2026-2027');
/** Détail d'un message de démo : le premier a un vrai contenu, les autres une phrase. */
export const messageDemo = (id: string) => {
  const m = versMessage(messageED.parse(message.data), '2026-2027');
  if (id === m.id) return { ...m, lu: true };
  const l = messagesDemo().find((x) => x.id === id);
  return l ? { ...l, contenu: 'Message de démonstration.' } : undefined;
};
export const documentsDemo = () => versDocuments(documentsED.parse(documents.data));
/** Le lundi de la semaine des données de démo. */
export const LUNDI_DEMO = '2026-11-16';
/** « Aujourd'hui » dans la démo : le mardi de cette semaine-là. */
export const AUJOURDHUI_DEMO = '2026-11-17';
export const MAINTENANT_DEMO = `${AUJOURDHUI_DEMO} 09:41`;
