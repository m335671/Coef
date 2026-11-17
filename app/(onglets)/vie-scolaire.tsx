// Vie scolaire. Sa question : « Où j'en suis côté absences, retards et sanctions, et qu'est-ce qui reste à justifier ? »
// Chaque carte ouvre son détail ; messages, documents et réglages sont rangés ici plutôt que dans un onglet de plus.
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { messagesDemo, vieScolaireDemo } from '@/demo/vie';
import type { EvenementVieScolaire, Message } from '@/domain/types';
import { useEleveActif, useEleves } from '@/features/compte/eleves';
import { aJustifier, dansGroupe, type Groupe, GROUPES } from '@/features/vie/groupes';
import { useDonnee, useDonneesED } from '@/features/vie/store';
import { Bouton, BoutonRond, Ecran, EnTete, Entree, IconeReglages, Segments, Texte } from '@/ui/composants';
import { espace, police, useCouleurs } from '@/ui/theme';
import { Tuile } from '@/ui/Tuile';

export default function VieScolaire() {
  const c = useCouleurs();
  const eleves = useEleves();
  const [eleve, choisirEleve] = useEleveActif();
  const cle = `vie:${eleve?.id}`;
  const cleMessages = `messages:${eleve?.id}`;
  const etat = useDonnee<EvenementVieScolaire[]>(cle);
  const nonLus = (useDonnee<Message[]>(cleMessages)?.valeur ?? []).filter((m) => !m.lu);
  const charger = useDonneesED((s) => s.charger);

  useEffect(() => {
    if (!eleve) return;
    void charger(cle, (cl) => cl.vieScolaire(eleve.id), vieScolaireDemo);
    void charger(cleMessages, (cl) => cl.messages(eleve.id), messagesDemo);
  }, [cle, cleMessages, eleve, charger]);

  const evts = etat?.valeur ?? [];
  const pret = !!etat?.valeur || etat?.chargement === false;
  const [absences, retards, sanctions, encouragements, autres] = GROUPES;

  const carte = (g: Groupe, rang: number) => {
    const n = evts.filter((e) => dansGroupe(g, e)).length;
    const nJ = evts.filter((e) => dansGroupe(g, e) && aJustifier(e)).length;
    const titre = 'court' in g ? g.court : g.titre;
    return (
      <Tuile
        rang={rang}
        fond={c.teinte50}
        onPress={() => router.push({ pathname: '/evenements', params: { groupe: g.cle } })}
        libelle={`${n} ${g.titre.toLowerCase()}${nJ ? `, dont ${nJ} à justifier` : ''}. Voir le détail`}>
        <Texte style={{ fontFamily: police.gras, fontSize: 34, lineHeight: 40, color: n ? c.accent : c.attenue, fontVariant: ['tabular-nums'] }}>
          {pret ? n : '–'}
        </Texte>
        <Texte variante="liste" moyen style={{ color: c.accentEncre }}>
          {titre}
        </Texte>
        <Texte variante="petit" style={{ color: nJ ? c.negatif : c.attenue }}>
          {nJ ? `${nJ} à justifier` : n ? 'Voir le détail' : 'Aucun'}
        </Texte>
      </Tuile>
    );
  };

  return (
    <Ecran>
      <EnTete
        titre="Vie scolaire"
        action={
          <BoutonRond libelle="Réglages" onPress={() => router.push('/reglages')}>
            <IconeReglages />
          </BoutonRond>
        }
      />
      {eleves.length > 1 && eleve ? (
        <Entree rang={1}>
          <Segments libelle="Élève" options={eleves.map((e) => ({ cle: e.id, libelle: e.prenom }))} valeur={eleve.id} onChange={choisirEleve} />
        </Entree>
      ) : null}
      {etat?.erreur ? (
        <View style={{ gap: espace.xs }}>
          <Texte variante="liste">{etat.erreur instanceof ErreurED ? etat.erreur.message : 'La vie scolaire n’a pas pu être chargée.'}</Texte>
          <Bouton variante="texte" titre="Réessayer" onPress={() => eleve && charger(cle, (cl) => cl.vieScolaire(eleve.id), vieScolaireDemo, true)} />
        </View>
      ) : null}

      <View style={styles.colonne}>
        <View style={styles.paire}>
          {carte(absences, 1)}
          {carte(retards, 2)}
        </View>
        <View style={styles.paire}>
          {carte(sanctions, 3)}
          {carte(encouragements, 4)}
        </View>
        {evts.some((e) => dansGroupe(autres, e)) ? (
          <View style={styles.paire}>
            {carte(autres, 5)}
            <View style={{ flex: 1 }} />
          </View>
        ) : null}

        <View style={styles.paire}>
          <Tuile
            rang={6}
            fond={c.surface}
            bord={c.bord}
            onPress={() => router.push('/messages')}
            libelle={nonLus.length ? `Messages : ${nonLus.length} non lu${nonLus.length > 1 ? 's' : ''}` : 'Messages : tout est lu'}>
            <IconeEnveloppe />
            <Texte variante="liste" moyen style={{ marginTop: espace.s }}>
              Messages
            </Texte>
            <Texte variante="petit" numberOfLines={2} style={{ color: nonLus.length ? c.negatif : c.attenue }}>
              {nonLus.length ? `${nonLus.length} non lu${nonLus.length > 1 ? 's' : ''} · ${nonLus[0]!.de}` : 'Tout est lu'}
            </Texte>
          </Tuile>
          <Tuile rang={7} fond={c.surface} bord={c.bord} onPress={() => router.push('/documents')} libelle="Documents : bulletins, certificats">
            <IconeDocument />
            <Texte variante="liste" moyen style={{ marginTop: espace.s }}>
              Documents
            </Texte>
            <Texte variante="petit" attenue numberOfLines={2}>
              Bulletins, certificats
            </Texte>
          </Tuile>
        </View>
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  colonne: { gap: espace.m },
  paire: { flexDirection: 'row', gap: espace.m },
});

function IconeEnveloppe() {
  const c = useCouleurs();
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={14} rx={2.5} />
      <Path d="M4 7l8 6 8-6" />
    </Svg>
  );
}

function IconeDocument() {
  const c = useCouleurs();
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <Path d="M14 3v5h5M9 13h6M9 17h4" />
    </Svg>
  );
}
