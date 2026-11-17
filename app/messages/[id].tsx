// Un message. Sa question : « Qu'est-ce qu'on me dit, et quels fichiers vont avec ? »
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { messageDemo } from '@/demo/vie';
import type { Message } from '@/domain/types';
import { LigneFichier } from '@/features/vie/LigneFichier';
import { marquerLu, useDonnee, useDonneesED } from '@/features/vie/store';
import { Bouton, Ecran, EnTete, Entree, Panneau, Pastille, Section, Texte } from '@/ui/composants';
import { heure, jourLong } from '@/ui/format';
import { espace } from '@/ui/theme';

export default function DetailMessage() {
  const { id, eleve } = useLocalSearchParams<{ id: string; eleve: string }>();
  const cle = `message:${eleve}:${id}`;
  const etat = useDonnee<Message>(cle);
  const apercu = useDonnee<Message[]>(`messages:${eleve}`)?.valeur?.find((m) => m.id === id);
  const charger = useDonneesED((s) => s.charger);
  const ouvrir = (forcer = false) =>
    charger(
      cle,
      (cl) => cl.message(eleve, id),
      () => messageDemo(id)!,
      forcer,
    );
  useEffect(() => void ouvrir(), [cle]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (etat?.valeur) marquerLu(eleve, id);
  }, [etat?.valeur, eleve, id]);

  const m = etat?.valeur ?? apercu;
  return (
    <Ecran>
      <EnTete titre="Message" retour />
      {m ? (
        <Entree rang={1} style={{ gap: espace.s }}>
          <Texte variante="section">{m.sujet}</Texte>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espace.s, alignItems: 'center' }}>
            <Pastille texte={m.de} />
            {m.date ? (
              <Texte variante="petit" attenue>
                {jourLong(m.date.slice(0, 10))} à {heure(m.date)}
              </Texte>
            ) : null}
          </View>
        </Entree>
      ) : null}
      {etat?.erreur ? (
        <View style={{ gap: espace.xs }}>
          <Texte variante="liste">{etat.erreur instanceof ErreurED ? etat.erreur.message : 'Le message n’a pas pu être chargé.'}</Texte>
          <Bouton variante="texte" titre="Réessayer" onPress={() => ouvrir(true)} />
        </View>
      ) : null}
      <Entree rang={2}>
        <Panneau style={{ paddingVertical: espace.l }}>
          <Texte selectable variante="liste" attenue={!etat?.valeur?.contenu}>
            {etat?.valeur ? etat.valeur.contenu || 'Message vide.' : 'Chargement du message…'}
          </Texte>
        </Panneau>
      </Entree>
      {m && m.pieces.length > 0 ? (
        <Section titre={m.pieces.length > 1 ? 'Pièces jointes' : 'Pièce jointe'} aide="Téléchargée chez EcoleDirecte, ouverte sur le téléphone." rang={3}>
          <Panneau>
            {m.pieces.map((f, i) => (
              <LigneFichier key={f.id} f={f} dernier={i === m.pieces.length - 1} />
            ))}
          </Panneau>
        </Section>
      ) : null}
    </Ecran>
  );
}
