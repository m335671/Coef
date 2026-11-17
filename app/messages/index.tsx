// Messages. Sa question : « Qu'est-ce qu'on m'a écrit, et qu'est-ce que je n'ai pas encore lu ? »
import { useEffect } from 'react';
import { View } from 'react-native';

import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { messagesDemo } from '@/demo/vie';
import type { Message } from '@/domain/types';
import { useEleveActif } from '@/features/compte/eleves';
import { LigneMessage } from '@/features/vie/LigneMessage';
import { useDonnee, useDonneesED } from '@/features/vie/store';
import { Bouton, BoutonRond, Ecran, EnTete, IconeActualiser, Panneau, Section, Texte } from '@/ui/composants';
import { espace } from '@/ui/theme';

export default function Messages() {
  const [eleve] = useEleveActif();
  const cle = `messages:${eleve?.id}`;
  const etat = useDonnee<Message[]>(cle);
  const charger = useDonneesED((s) => s.charger);
  const recharger = (forcer = false) => eleve && charger(cle, (cl) => cl.messages(eleve.id), messagesDemo, forcer);
  useEffect(() => void recharger(), [cle]); // eslint-disable-line react-hooks/exhaustive-deps

  const messages = etat?.valeur ?? [];
  const nonLus = messages.filter((m) => !m.lu).length;

  return (
    <Ecran>
      <EnTete
        titre="Messages"
        retour
        action={
          <BoutonRond libelle={etat?.chargement ? 'Chargement en cours' : 'Actualiser les messages'} onPress={() => !etat?.chargement && recharger(true)}>
            <View style={{ opacity: etat?.chargement ? 0.35 : 1 }}>
              <IconeActualiser />
            </View>
          </BoutonRond>
        }
      />
      {etat?.erreur ? (
        <View style={{ gap: espace.xs }}>
          <Texte variante="liste">{etat.erreur instanceof ErreurED ? etat.erreur.message : 'Les messages n’ont pas pu être chargés.'}</Texte>
          <Bouton variante="texte" titre="Réessayer" onPress={() => recharger(true)} />
        </View>
      ) : null}
      {!etat?.valeur ? (
        etat?.chargement === false ? null : (
          <Texte variante="liste" attenue>
            Chargement de la messagerie…
          </Texte>
        )
      ) : messages.length === 0 ? (
        <Texte variante="liste" attenue>
          Aucun message cette année.
        </Texte>
      ) : (
        <Section titre="Reçus" aide={nonLus ? `${nonLus} non lu${nonLus > 1 ? 's' : ''}` : 'Tout est lu.'} rang={1}>
          <Panneau>
            {messages.map((m, i) => (
              <LigneMessage key={m.id} m={m} eleve={eleve!.id} dernier={i === messages.length - 1} />
            ))}
          </Panneau>
        </Section>
      )}
      <Texte variante="petit" attenue>
        Ouvrir un message le marque comme lu sur EcoleDirecte aussi. Lecture seule : pour répondre, passe par le site d’EcoleDirecte.
      </Texte>
    </Ecran>
  );
}
