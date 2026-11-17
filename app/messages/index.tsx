// Messages. Sa question : « Qu'est-ce qu'on m'a écrit, et qu'est-ce que je n'ai pas encore lu ? »
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { messagesDemo } from '@/demo/vie';
import type { Message } from '@/domain/types';
import { useEleveActif } from '@/features/compte/eleves';
import { useDonnee, useDonneesED } from '@/features/vie/store';
import { Bouton, BoutonRond, Ecran, EnTete, IconeActualiser, Ligne, Panneau, Section, Texte } from '@/ui/composants';
import { heure, iso, jour } from '@/ui/format';
import { espace, police, useCouleurs } from '@/ui/theme';

export default function Messages() {
  const c = useCouleurs();
  const [eleve] = useEleveActif();
  const cle = `messages:${eleve?.id}`;
  const etat = useDonnee<Message[]>(cle);
  const charger = useDonneesED((s) => s.charger);
  const recharger = (forcer = false) => eleve && charger(cle, (cl) => cl.messages(eleve.id), messagesDemo, forcer);
  useEffect(() => void recharger(), [cle]); // eslint-disable-line react-hooks/exhaustive-deps

  const messages = etat?.valeur ?? [];
  const nonLus = messages.filter((m) => !m.lu).length;
  const aujourdhui = iso(new Date());

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
              <Ligne
                key={m.id}
                dernier={i === messages.length - 1}
                onPress={() => router.push({ pathname: '/messages/[id]', params: { id: m.id, eleve: eleve!.id } })}
                libelleAccessible={`${m.lu ? '' : 'Non lu. '}De ${m.de}. ${m.sujet}. ${jour(m.date)}${m.pieces.length ? ', avec pièce jointe' : ''}`}>
                <View style={[styles.point, { backgroundColor: m.lu ? 'transparent' : c.accent }]} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.rangee}>
                    <Texte variante="liste" numberOfLines={1} style={{ flex: 1, fontFamily: m.lu ? undefined : police.fort }}>
                      {m.de}
                    </Texte>
                    <Texte variante="petit" attenue style={{ fontVariant: ['tabular-nums'] }}>
                      {m.date.startsWith(aujourdhui) ? heure(m.date) : jour(m.date)}
                    </Texte>
                  </View>
                  <Texte variante="petit" numberOfLines={2} style={{ color: m.lu ? c.attenue : c.texte }}>
                    {m.sujet}
                    {m.pieces.length ? ` · ${m.pieces.length} pièce${m.pieces.length > 1 ? 's' : ''} jointe${m.pieces.length > 1 ? 's' : ''}` : ''}
                  </Texte>
                </View>
              </Ligne>
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

const styles = StyleSheet.create({
  point: { width: 8, height: 8, borderRadius: 4 },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
});
