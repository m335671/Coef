// Vie scolaire. Sa question : « Où j'en suis côté absences, retards et sanctions, et qu'est-ce qui reste à justifier ? »
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { messagesDemo, vieScolaireDemo } from '@/demo/vie';
import type { EvenementVieScolaire, Message, TypeEvenement } from '@/domain/types';
import { useEleveActif, useEleves } from '@/features/compte/eleves';
import { useDonnee, useDonneesED } from '@/features/vie/store';
import { Bouton, BoutonRond, Ecran, EnTete, Entree, IconeReglages, Ligne, Panneau, Pastille, Section, Segments, Texte } from '@/ui/composants';
import { jour } from '@/ui/format';
import { espace, police, rayon, useCouleurs } from '@/ui/theme';

const GROUPES: { titre: string; types: TypeEvenement[] }[] = [
  { titre: 'Absences', types: ['absence'] },
  { titre: 'Retards', types: ['retard'] },
  { titre: 'Punitions et sanctions', types: ['punition', 'sanction'] },
  { titre: 'Encouragements', types: ['encouragement'] },
  { titre: 'Dispenses et autres', types: ['dispense', 'autre'] },
];

export default function VieScolaire() {
  const c = useCouleurs();
  const eleves = useEleves();
  const [eleve, choisirEleve] = useEleveActif();
  const cle = `vie:${eleve?.id}`;
  const etat = useDonnee<EvenementVieScolaire[]>(cle);
  const charger = useDonneesED((s) => s.charger);

  const cleMessages = `messages:${eleve?.id}`;
  const nonLus = (useDonnee<Message[]>(cleMessages)?.valeur ?? []).filter((m) => !m.lu);
  useEffect(() => {
    if (!eleve) return;
    void charger(cle, (cl) => cl.vieScolaire(eleve.id), vieScolaireDemo);
    void charger(cleMessages, (cl) => cl.messages(eleve.id), messagesDemo);
  }, [cle, cleMessages, eleve, charger]);

  const evts = etat?.valeur ?? [];
  const compte = (t: TypeEvenement[]) => evts.filter((e) => t.includes(e.type)).length;
  const aJustifier = evts.filter((e) => (e.type === 'absence' || e.type === 'retard') && e.justifie === false).length;
  const tuiles = [
    { titre: 'Absences', n: compte(['absence']) },
    { titre: 'Retards', n: compte(['retard']) },
    { titre: 'Sanctions', n: compte(['punition', 'sanction']) },
    { titre: 'Encouragements', n: compte(['encouragement']) },
  ];

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
      <Entree rang={1}>
        <Panneau>
          <Ligne
            onPress={() => router.push('/messages')}
            libelleAccessible={nonLus.length ? `Messages, ${nonLus.length} non lu${nonLus.length > 1 ? 's' : ''}` : 'Messages, tout est lu'}>
            <IconeEnveloppe />
            <View style={{ flex: 1 }}>
              <Texte variante="liste" moyen>
                Messages
              </Texte>
              <Texte variante="petit" attenue numberOfLines={1}>
                {nonLus.length ? `De ${nonLus[0]!.de}` : 'Tout est lu'}
              </Texte>
            </View>
            {nonLus.length ? <Pastille texte={`${nonLus.length} non lu${nonLus.length > 1 ? 's' : ''}`} fond={c.surface} encre={c.negatif} /> : null}
          </Ligne>
          <Ligne dernier onPress={() => router.push('/documents')} libelleAccessible="Documents : bulletins, certificats">
            <IconeDocument />
            <View style={{ flex: 1 }}>
              <Texte variante="liste" moyen>
                Documents
              </Texte>
              <Texte variante="petit" attenue numberOfLines={1}>
                Bulletins, certificats
              </Texte>
            </View>
          </Ligne>
        </Panneau>
      </Entree>
      {etat?.erreur ? (
        <View style={{ gap: espace.xs }}>
          <Texte variante="liste">{etat.erreur instanceof ErreurED ? etat.erreur.message : 'La vie scolaire n’a pas pu être chargée.'}</Texte>
          <Bouton variante="texte" titre="Réessayer" onPress={() => eleve && charger(cle, (cl) => cl.vieScolaire(eleve.id), vieScolaireDemo, true)} />
        </View>
      ) : null}
      {!etat?.valeur && etat?.chargement !== false ? (
        <Texte variante="liste" attenue>
          Chargement de la vie scolaire…
        </Texte>
      ) : (
        <>
          <Entree rang={2} style={[styles.compteurs, { backgroundColor: c.teinte50 }]}>
            {tuiles.map((t) => (
              <View key={t.titre} style={styles.compteur} accessible accessibilityLabel={`${t.n} ${t.titre.toLowerCase()}`}>
                <Texte style={{ fontFamily: police.gras, fontSize: 20, lineHeight: 24, color: t.n ? c.accent : c.attenue, fontVariant: ['tabular-nums'] }}>
                  {t.n}
                </Texte>
                <Texte variante="petit" numberOfLines={1} adjustsFontSizeToFit style={{ color: c.accentEncre }}>
                  {t.titre}
                </Texte>
              </View>
            ))}
          </Entree>
          {aJustifier > 0 ? (
            <Entree rang={2}>
              <Texte variante="liste">
                {aJustifier} absence{aJustifier > 1 ? 's' : ''} ou retard{aJustifier > 1 ? 's' : ''} non justifié{aJustifier > 1 ? 's' : ''}.
              </Texte>
            </Entree>
          ) : null}
          {evts.length === 0 ? (
            <Texte variante="liste" attenue>
              Rien à signaler pour l’instant.
            </Texte>
          ) : null}
          {GROUPES.map((g, i) => {
            const liste = evts.filter((e) => g.types.includes(e.type));
            if (liste.length === 0) return null;
            return (
              <Section key={g.titre} titre={g.titre} rang={3 + i}>
                <Panneau>
                  {liste.map((e, j) => (
                    <Ligne key={e.id} dernier={j === liste.length - 1}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Texte variante="liste" moyen>
                          {e.libelle}
                        </Texte>
                        <Texte variante="petit" attenue>
                          {[jour(e.date), e.motif, e.par].filter(Boolean).join(' · ')}
                        </Texte>
                      </View>
                      {e.type === 'absence' || e.type === 'retard' ? (
                        e.justifie ? (
                          <Pastille texte="Justifié" />
                        ) : (
                          <Pastille texte="À justifier" fond={c.surface} encre={c.negatif} />
                        )
                      ) : null}
                    </Ligne>
                  ))}
                </Panneau>
              </Section>
            );
          })}
        </>
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  compteurs: { flexDirection: 'row', borderRadius: rayon.carte, paddingVertical: espace.s, paddingHorizontal: espace.xs },
  compteur: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 2 },
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
