// Vie scolaire. Sa question : « Où j'en suis côté absences, retards et sanctions, et qu'est-ce qui reste à justifier ? »
// Chaque carte ouvre son détail ; messages, documents et réglages sont rangés ici plutôt que dans un onglet de plus.
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { documentsDemo, messagesDemo, vieScolaireDemo } from '@/demo/vie';
import type { DocumentEleve, EvenementVieScolaire, Message } from '@/domain/types';
import { useEleveActif, useEleves } from '@/features/compte/eleves';
import { aJustifier, dansGroupe, type Groupe, GROUPES } from '@/features/vie/groupes';
import { LigneFichier } from '@/features/vie/LigneFichier';
import { LigneMessage } from '@/features/vie/LigneMessage';
import { useDonnee, useDonneesED } from '@/features/vie/store';
import { Bouton, BoutonRond, Ecran, EnTete, Entree, IconeReglages, Panneau, Presse, Section, Segments, Texte } from '@/ui/composants';
import { espace, police, useCouleurs } from '@/ui/theme';
import { Tuile } from '@/ui/Tuile';

const DOCS_MAX = 5;

export default function VieScolaire() {
  const c = useCouleurs();
  const eleves = useEleves();
  const [eleve, choisirEleve] = useEleveActif();
  const cle = `vie:${eleve?.id}`;
  const cleMessages = `messages:${eleve?.id}`;
  const etat = useDonnee<EvenementVieScolaire[]>(cle);
  const cleDocs = `documents:${eleve?.id}`;
  const messages = useDonnee<Message[]>(cleMessages)?.valeur;
  const nonLus = (messages ?? []).filter((m) => !m.lu);
  // Les non lus d'abord (jusqu'à 3), complétés par les plus récents.
  const recents = [...nonLus, ...(messages ?? []).filter((m) => m.lu)].slice(0, Math.max(3, Math.min(nonLus.length, 5)));
  const docs = useDonnee<DocumentEleve[]>(cleDocs)?.valeur;
  const charger = useDonneesED((s) => s.charger);

  useEffect(() => {
    if (!eleve) return;
    void charger(cle, (cl) => cl.vieScolaire(eleve.id), vieScolaireDemo);
    void charger(cleMessages, (cl) => cl.messages(eleve.id), messagesDemo);
    void charger(cleDocs, (cl) => cl.documents(eleve.id), documentsDemo);
  }, [cle, cleMessages, cleDocs, eleve, charger]);

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
      </View>

      <Section
        titre="Messages"
        aide={!messages ? 'Chargement…' : nonLus.length ? `${nonLus.length} non lu${nonLus.length > 1 ? 's' : ''}` : 'Tout est lu'}
        rang={6}
        action={messages?.length ? <LienToutVoir libelle={`Tous les messages (${messages.length})`} onPress={() => router.push('/messages')} /> : undefined}>
        {messages?.length ? (
          <Panneau>
            {recents.map((m, i) => (
              <LigneMessage key={m.id} m={m} eleve={eleve!.id} dernier={i === recents.length - 1} />
            ))}
          </Panneau>
        ) : messages ? (
          <Texte variante="liste" attenue>
            Aucun message cette année.
          </Texte>
        ) : null}
      </Section>

      <Section
        titre="Documents"
        aide="Bulletins, certificats : touche pour ouvrir."
        rang={7}
        action={
          docs && docs.length > DOCS_MAX ? (
            <LienToutVoir libelle={`Tous les documents (${docs.length})`} onPress={() => router.push('/documents')} />
          ) : undefined
        }>
        {docs?.length ? (
          <Panneau>
            {docs.slice(0, DOCS_MAX).map((d, i, l) => (
              <LigneFichier key={`${d.type}-${d.id}`} f={d} dernier={i === l.length - 1} />
            ))}
          </Panneau>
        ) : (
          <Texte variante="liste" attenue>
            {docs ? 'Aucun document pour l’instant.' : 'Chargement…'}
          </Texte>
        )}
      </Section>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  colonne: { gap: espace.m },
  paire: { flexDirection: 'row', gap: espace.m },
  lien: { minHeight: 44, justifyContent: 'center', paddingHorizontal: espace.xs },
});

function LienToutVoir({ libelle, onPress }: { libelle: string; onPress: () => void }) {
  const c = useCouleurs();
  return (
    <Presse onPress={onPress} libelleAccessible={libelle} style={styles.lien}>
      <Texte variante="petit" style={{ color: c.accent, fontFamily: police.fort }}>
        Tout voir
      </Texte>
    </Presse>
  );
}
