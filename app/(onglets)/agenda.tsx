// Emploi du temps. Sa question : « Quels cours aujourd'hui (ou tel jour), où, et qu'est-ce qui a changé ? »
// Tient sur un écran : règle horaire fixe (8 h à 18 h, élargie si un cours en sort) à la hauteur disponible. On glisse à
// gauche ou à droite pour changer de jour : la journée suit le doigt, puis la suivante arrive du bord.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { MODE_DEMO } from '@/demo';
import { AUJOURDHUI_DEMO, coursDemo, devoirsDemo, LUNDI_DEMO, MAINTENANT_DEMO } from '@/demo/vie';
import type { Cours, Devoir } from '@/domain/types';
import { useEleveActif, useEleves } from '@/features/compte/eleves';
import { useCouleurMatiere } from '@/features/notes/familles';
import { useDonnee, useDonneesED } from '@/features/vie/store';
import { Bouton, Ecran, EnTete, Entree, Feuille, Ligne, ListeSquelette, Pastille, Presse, Segments, Texte, useMinute } from '@/ui/composants';
import { ajouterJours, heure, iso, jour, jourCourt, jourLong, lundiDe } from '@/ui/format';
import { Hachures } from '@/ui/graphiques';
import { espace, police, rayon, useCouleurs } from '@/ui/theme';

export default function Agenda() {
  const c = useCouleurs();
  const eleves = useEleves();
  const [eleve, choisirEleve] = useEleveActif();
  const horloge = useMinute();
  const aujourdhui = MODE_DEMO ? AUJOURDHUI_DEMO : iso(horloge);
  const [lundi, setLundi] = useState(MODE_DEMO ? LUNDI_DEMO : lundiDe(aujourdhui));
  const [jourChoisi, setJour] = useState(aujourdhui);
  const dimanche = ajouterJours(lundi, 6);
  const cle = `edt:${eleve?.id}:${lundi}`;
  const etat = useDonnee<Cours[]>(cle);
  const charger = useDonneesED((s) => s.charger);

  const cleDevoirs = `devoirs:${eleve?.id}`;
  const devoirs = useDonnee<Devoir[]>(cleDevoirs)?.valeur ?? [];
  useEffect(() => {
    if (eleve) void charger(cle, (cl) => cl.emploiDuTemps(eleve.id, lundi, dimanche), coursDemo);
  }, [cle, eleve, lundi, dimanche, charger]);
  useEffect(() => {
    if (eleve) void charger(cleDevoirs, (cl) => cl.devoirs(eleve.id), devoirsDemo);
  }, [cleDevoirs, eleve, charger]);

  const changerSemaine = (n: number) => {
    const l = ajouterJours(lundi, 7 * n);
    setLundi(l);
    setJour(l);
  };
  const jours = Array.from({ length: 6 }, (_, i) => ajouterJours(lundi, i));
  // Jour suivant ou précédent, en passant d'une semaine à l'autre (un dimanche compte comme après le samedi).
  const decaler = (n: number) => {
    const i = jours.includes(jourChoisi) ? jours.indexOf(jourChoisi) : 6;
    const j = i + n;
    if (j < 0) {
      const l = ajouterJours(lundi, -7);
      setLundi(l);
      setJour(ajouterJours(l, 5));
    } else if (j > 5) changerSemaine(1);
    else setJour(jours[j]!);
  };
  // La journée suit le doigt ; lâchée assez loin, elle sort par le bord et la suivante entre par l'autre.
  const { width: largeur } = useWindowDimensions();
  const reduit = useReducedMotion();
  const tx = useSharedValue(0);
  const arriver = (n: number) => {
    decaler(n);
    tx.value = n * largeur;
    tx.value = reduit ? 0 : withTiming(0, { duration: 220 });
  };
  const glisser = usePanGesture({
    activeOffsetX: [-14, 14],
    failOffsetY: [-16, 16],
    onUpdate: (e) => {
      'worklet';
      tx.value = e.translationX;
    },
    onDeactivate: (e) => {
      'worklet';
      const n = e.translationX < -60 || e.velocityX < -600 ? 1 : e.translationX > 60 || e.velocityX > 600 ? -1 : 0;
      if (n === 0) tx.value = withSpring(0, { damping: 20, stiffness: 220 });
      else
        tx.value = withTiming(-n * largeur, { duration: 160 }, (fini) => {
          if (fini) runOnJS(arriver)(n);
        });
    },
  });
  const suit = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  const [dispo, setDispo] = useState(0);
  const [ouvert, setOuvert] = useState<Cours>();
  const cours = (etat?.valeur ?? []).filter((x) => x.debut.startsWith(jourChoisi));
  const maintenant = MODE_DEMO ? MAINTENANT_DEMO : `${aujourdhui} ${horloge.toTimeString().slice(0, 5)}`;

  return (
    <Ecran fixe>
      <EnTete titre="Agenda" />
      {eleves.length > 1 && eleve ? (
        <Entree rang={1}>
          <Segments libelle="Élève" options={eleves.map((e) => ({ cle: e.id, libelle: e.prenom }))} valeur={eleve.id} onChange={choisirEleve} />
        </Entree>
      ) : null}
      <Entree rang={1} style={styles.semaine}>
        <Presse onPress={() => changerSemaine(-1)} libelleAccessible={`Semaine précédente (semaine du ${jour(lundi)})`} style={styles.fleche}>
          <Texte variante="liste" style={{ color: c.accent, fontFamily: police.fort }}>
            ‹
          </Texte>
        </Presse>
        {jours.map((j) => {
          const actif = j === jourChoisi;
          return (
            <View key={j} style={{ flex: 1 }}>
              <Presse
                onPress={() => setJour(j)}
                libelleAccessible={jourLong(j)}
                role="tab"
                selectionne={actif}
                style={[styles.jour, { backgroundColor: actif ? c.teinte100 : 'transparent' }]}>
                <Texte variante="petit" style={{ fontSize: 11, lineHeight: 14, color: actif ? c.accentEncre : c.attenue }}>
                  {jourCourt(j)}
                </Texte>
                <Texte
                  variante="liste"
                  style={{
                    lineHeight: 20,
                    fontFamily: police.fort,
                    fontVariant: ['tabular-nums'],
                    color: actif ? c.accentEncre : j === aujourdhui ? c.accent : c.texte,
                  }}>
                  {Number(j.slice(8))}
                </Texte>
              </Presse>
            </View>
          );
        })}
        <Presse onPress={() => changerSemaine(1)} libelleAccessible="Semaine suivante" style={styles.fleche}>
          <Texte variante="liste" style={{ color: c.accent, fontFamily: police.fort }}>
            ›
          </Texte>
        </Presse>
      </Entree>
      <GestureDetector gesture={glisser}>
        <View style={styles.zone} accessibilityHint="Glisser à gauche ou à droite pour changer de jour">
          <Animated.View style={[styles.zone, suit]}>
            <Texte variante="liste" moyen role="heading" aria-level={2}>
              {(jourChoisi === aujourdhui ? `Aujourd’hui, ${jourLong(jourChoisi)}` : jourLong(jourChoisi)).replace(/^./, (x) => x.toUpperCase())}
            </Texte>
            {etat?.erreur ? (
              <View style={{ gap: espace.xs }}>
                <Texte variante="liste">{etat.erreur instanceof ErreurED ? etat.erreur.message : 'L’emploi du temps n’a pas pu être chargé.'}</Texte>
                <Bouton
                  variante="texte"
                  titre="Réessayer"
                  onPress={() => eleve && charger(cle, (cl) => cl.emploiDuTemps(eleve.id, lundi, dimanche), coursDemo, true)}
                />
              </View>
            ) : null}
            {!etat?.valeur && etat?.chargement !== false ? (
              <ListeSquelette lignes={4} libelle="Chargement de l’emploi du temps" />
            ) : (
              <View style={{ flex: 1 }} onLayout={(e) => setDispo(e.nativeEvent.layout.height)}>
                <Frise
                  cours={cours}
                  devoirs={devoirs.filter((d) => d.pour === jourChoisi)}
                  maintenant={jourChoisi === aujourdhui ? maintenant : undefined}
                  dispo={dispo}
                  onCours={setOuvert}
                />
              </View>
            )}
          </Animated.View>
        </View>
      </GestureDetector>
      <FicheCours cours={ouvert} devoirs={devoirs} eleve={eleve?.id ?? ''} onFermer={() => setOuvert(undefined)} />
    </Ecran>
  );
}

// Hauteur d’une minute : celle qui fait tenir la journée dans l’écran, entre PX_MIN (on défile alors un peu) et PX_MAX
// (une journée courte ne s’étire pas sur tout l’écran).
const PX_MIN = 0.7;
const PX_MAX = 1.4;
const DEBUT = 8 * 60;
const FIN = 18 * 60;
const minutes = (dt: string) => Number(dt.slice(11, 13)) * 60 + Number(dt.slice(14, 16));

/**
 * La journée en frise : chaque cours à la hauteur de sa durée, teinté par famille de matière ; les trous se voient.
 * Annulé : hachuré et barré. Les devoirs pour ce jour s'accrochent au cours de leur matière. Trait « maintenant ».
 * Cours qui se chevauchent (demi-groupes) : côte à côte.
 */
function Frise({
  cours,
  devoirs,
  maintenant,
  dispo,
  onCours,
}: {
  cours: Cours[];
  devoirs: Devoir[];
  maintenant?: string;
  dispo: number;
  onCours: (x: Cours) => void;
}) {
  const c = useCouleurs();
  const couleurMatiere = useCouleurMatiere();
  const tries = [...cours].sort((a, b) => a.debut.localeCompare(b.debut));
  const debut = Math.floor(Math.min(DEBUT, ...tries.map((x) => minutes(x.debut))) / 60) * 60;
  const fin = Math.ceil(Math.max(FIN, ...tries.map((x) => minutes(x.fin))) / 60) * 60;
  const colonnes: number[] = [];
  const places = tries.map((x) => {
    let col = 0;
    while (colonnes[col] !== undefined && colonnes[col]! > minutes(x.debut)) col++;
    colonnes[col] = minutes(x.fin);
    return { x, col };
  });
  const n = Math.max(colonnes.length, 1);
  const heures = Array.from({ length: (fin - debut) / 60 + 1 }, (_, i) => debut + i * 60);
  const m = maintenant ? minutes(maintenant) : undefined;
  const PX = dispo > 0 ? Math.min(Math.max((dispo - 16) / (fin - debut), PX_MIN), PX_MAX) : 1.1;
  const hauteurTotale = (fin - debut) * PX + 16;
  return (
    <ScrollView scrollEnabled={hauteurTotale > dispo + 1} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 10, paddingBottom: 6 }}>
      <View style={{ height: (fin - debut) * PX }}>
        {heures.map((h) => (
          <View key={h} style={[styles.heure, { top: (h - debut) * PX }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Texte variante="petit" attenue style={styles.libelleHeure}>
              {h / 60} h
            </Texte>
            <View style={[styles.filet, { backgroundColor: c.filet }]} />
          </View>
        ))}
        <View style={styles.colonnes}>
          <View style={styles.calque}>
            {places.map(({ x, col }) => {
              const f = couleurMatiere(x.codeMatiere ?? '', x.matiere);
              const lies = devoirs.filter((d) => d.codeMatiere && d.codeMatiere === x.codeMatiere);
              const enCours = m !== undefined && minutes(x.debut) <= m && m < minutes(x.fin);
              const hauteur = (minutes(x.fin) - minutes(x.debut)) * PX - 3;
              return (
                <Pressable
                  key={x.id}
                  onPress={() => onCours(x)}
                  accessibilityRole="button"
                  accessibilityHint="Ouvre le détail du cours"
                  accessibilityLabel={`De ${heure(x.debut)} à ${heure(x.fin)}, ${x.matiere}${x.salle ? `, salle ${x.salle}` : ''}${x.annule ? ', annulé' : x.modifie ? ', modifié' : ''}${lies.length ? `, ${lies.length} devoir${lies.length > 1 ? 's' : ''} pour ce jour` : ''}`}
                  style={({ pressed }) => [
                    styles.bloc,
                    {
                      opacity: pressed ? 0.75 : 1,
                      top: (minutes(x.debut) - debut) * PX,
                      height: hauteur,
                      left: `${(col / n) * 100}%`,
                      width: `${100 / n}%`,
                      backgroundColor: x.annule ? c.surface : f.fond,
                      borderColor: x.annule ? c.negatif : enCours ? f.encre : 'transparent',
                      borderStyle: x.annule ? 'dashed' : 'solid',
                    },
                  ]}>
                  {x.annule ? <Hachures /> : null}
                  <View style={styles.rangee}>
                    <Texte
                      variante="liste"
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontFamily: police.fort,
                        color: x.annule ? c.negatif : f.encre,
                        textDecorationLine: x.annule ? 'line-through' : 'none',
                      }}>
                      {x.matiere}
                    </Texte>
                    {x.annule ? (
                      <Pastille texte="Annulé" fond={c.surface} encre={c.negatif} />
                    ) : x.modifie ? (
                      <Pastille texte="Modifié" fond={c.surface} encre={f.encre} />
                    ) : null}
                  </View>
                  {hauteur > 40 ? (
                    <Texte variante="petit" numberOfLines={1} style={{ color: x.annule ? c.attenue : f.encre }}>
                      {[`${heure(x.debut)} – ${heure(x.fin)}`, x.salle].filter(Boolean).join(' · ')}
                    </Texte>
                  ) : null}
                  {lies.length && hauteur > 64 ? (
                    <Pastille
                      texte={lies.some((d) => d.interrogation) ? 'interro' : `${lies.length} devoir${lies.length > 1 ? 's' : ''} pour ce jour`}
                      fond={c.surface}
                      encre={lies.some((d) => d.interrogation) ? c.negatif : f.encre}
                    />
                  ) : null}
                </Pressable>
              );
            })}
            {tries.length === 0 ? (
              <View style={styles.vide}>
                <Texte variante="liste" attenue>
                  Pas de cours ce jour-là.
                </Texte>
              </View>
            ) : null}
            {m !== undefined && m >= debut && m <= fin ? (
              <View style={[styles.maintenant, { top: (m - debut) * PX }]} accessible accessibilityLabel={`Il est ${heure(maintenant!)}`}>
                <View style={[styles.pointMaintenant, { backgroundColor: c.negatif }]} />
                <View style={{ flex: 1, height: 2, backgroundColor: c.negatif }} />
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

/** Le détail d'un cours : horaires, salle, professeur, état, devoirs pour ce jour (les toucher ouvre le devoir). */
function FicheCours({ cours: x, devoirs, eleve, onFermer }: { cours?: Cours; devoirs: Devoir[]; eleve: string; onFermer: () => void }) {
  const c = useCouleurs();
  const couleurMatiere = useCouleurMatiere();
  if (!x) return null;
  const f = couleurMatiere(x.codeMatiere ?? '', x.matiere);
  const lies = devoirs.filter((d) => d.pour === x.debut.slice(0, 10) && d.codeMatiere && d.codeMatiere === x.codeMatiere);
  const infos: [string, string | undefined][] = [
    ['Horaires', `${jourLong(x.debut.slice(0, 10)).replace(/^./, (l) => l.toUpperCase())}, de ${heure(x.debut)} à ${heure(x.fin)}`],
    ['Salle', x.salle],
    ['Enseignant', x.prof],
    ['Type', x.type && x.type !== 'COURS' ? x.type.toLowerCase().replace(/^./, (l) => l.toUpperCase()) : undefined],
  ];
  return (
    <Feuille visible onFermer={onFermer} titre={x.matiere}>
      <View style={styles.rangee}>
        <View style={[styles.pastilleFamille, { backgroundColor: f.trait }]} />
        {x.annule ? (
          <Pastille texte="Annulé" fond={c.surface} encre={c.negatif} />
        ) : x.modifie ? (
          <Pastille texte="Modifié" />
        ) : (
          <Pastille texte="Cours prévu" />
        )}
      </View>
      <View>
        {infos
          .filter((i): i is [string, string] => !!i[1])
          .map(([libelle, valeur], i, l) => (
            <Ligne key={libelle} dernier={i === l.length - 1 && lies.length === 0}>
              <Texte variante="petit" attenue style={{ width: 92 }}>
                {libelle}
              </Texte>
              <Texte variante="liste" style={{ flex: 1 }}>
                {valeur}
              </Texte>
            </Ligne>
          ))}
        {lies.map((d, i) => (
          <Ligne
            key={d.id}
            dernier={i === lies.length - 1}
            onPress={() => {
              onFermer();
              router.push({ pathname: '/devoir/[id]', params: { id: d.id, eleve } });
            }}
            libelleAccessible={`${d.interrogation ? 'Interrogation' : 'Devoir'} pour ce jour. Ouvrir`}>
            <Texte variante="petit" attenue style={{ width: 92 }}>
              {d.interrogation ? 'Interro' : 'Devoir'}
            </Texte>
            <Texte variante="liste" numberOfLines={2} style={{ flex: 1, color: d.interrogation ? c.negatif : c.texte }}>
              {d.contenu?.replace(/\s+/g, ' ').trim() || 'Voir le devoir'}
            </Texte>
          </Ligne>
        ))}
      </View>
    </Feuille>
  );
}

const styles = StyleSheet.create({
  pastilleFamille: { width: 10, height: 10, borderRadius: 5 },
  semaine: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  fleche: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  jour: { minHeight: 44, borderRadius: rayon.puce + 4, alignItems: 'center', justifyContent: 'center' },
  zone: { flex: 1, gap: espace.s },
  vide: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  heure: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: espace.s, marginTop: -9 },
  libelleHeure: { width: 40, fontVariant: ['tabular-nums'] },
  filet: { flex: 1, height: StyleSheet.hairlineWidth },
  // Fenêtre fixe des cours (ils glissent dedans sans passer sur la règle des heures).
  colonnes: { position: 'absolute', top: -10, bottom: -6, left: 42, right: 0, overflow: 'hidden' },
  calque: { position: 'absolute', top: 10, bottom: 6, left: 6, right: 0 },
  bloc: {
    position: 'absolute',
    borderRadius: rayon.puce + 2,
    borderWidth: 1.5,
    paddingHorizontal: espace.s,
    paddingVertical: 6,
    gap: 2,
    overflow: 'hidden',
    marginRight: 3,
  },
  maintenant: { position: 'absolute', left: -6, right: 0, flexDirection: 'row', alignItems: 'center', marginTop: -5 },
  pointMaintenant: { width: 10, height: 10, borderRadius: 5 },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
});
