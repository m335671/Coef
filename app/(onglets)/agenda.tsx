// Emploi du temps. Sa question : « Quels cours aujourd'hui (ou tel jour), où, et qu'est-ce qui a changé ? »
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { MODE_DEMO } from '@/demo';
import { AUJOURDHUI_DEMO, coursDemo, devoirsDemo, LUNDI_DEMO, MAINTENANT_DEMO } from '@/demo/vie';
import type { Cours, Devoir } from '@/domain/types';
import { useEleveActif, useEleves } from '@/features/compte/eleves';
import { familleDe } from '@/features/notes/familles';
import { useDonnee, useDonneesED } from '@/features/vie/store';
import { Bouton, BoutonRond, Ecran, EnTete, Entree, Pastille, Segments, Texte, useMinute } from '@/ui/composants';
import { ajouterJours, heure, iso, jour, jourCourt, jourLong, lundiDe } from '@/ui/format';
import { Hachures } from '@/ui/graphiques';
import { espace, police, rayon, useCouleurs, useFamilles } from '@/ui/theme';

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
  const cours = (etat?.valeur ?? []).filter((x) => x.debut.startsWith(jourChoisi));
  const maintenant = MODE_DEMO ? MAINTENANT_DEMO : `${aujourdhui} ${horloge.toTimeString().slice(0, 5)}`;

  return (
    <Ecran>
      <EnTete titre="Agenda" />
      {eleves.length > 1 && eleve ? (
        <Entree rang={1}>
          <Segments libelle="Élève" options={eleves.map((e) => ({ cle: e.id, libelle: e.prenom }))} valeur={eleve.id} onChange={choisirEleve} />
        </Entree>
      ) : null}
      <Entree rang={1} style={styles.semaine}>
        <BoutonRond libelle="Semaine précédente" onPress={() => changerSemaine(-1)}>
          <Texte variante="section" style={{ color: c.accent }}>
            ‹
          </Texte>
        </BoutonRond>
        <Texte variante="section" style={{ flex: 1, textAlign: 'center' }}>
          Semaine du {jour(lundi)}
        </Texte>
        <BoutonRond libelle="Semaine suivante" onPress={() => changerSemaine(1)}>
          <Texte variante="section" style={{ color: c.accent }}>
            ›
          </Texte>
        </BoutonRond>
      </Entree>
      <Entree rang={2}>
        <Segments
          libelle="Jour"
          options={jours.map((j) => ({ cle: j, libelle: `${jourCourt(j)} ${Number(j.slice(8))}` }))}
          valeur={jourChoisi}
          onChange={setJour}
        />
      </Entree>
      <Texte variante="section" role="heading" aria-level={2}>
        {jourChoisi === aujourdhui ? 'Aujourd’hui' : jourLong(jourChoisi).replace(/^./, (x) => x.toUpperCase())}
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
        <Texte variante="liste" attenue>
          Chargement de l’emploi du temps…
        </Texte>
      ) : cours.length === 0 ? (
        <Texte variante="liste" attenue>
          Pas de cours ce jour-là.
        </Texte>
      ) : (
        <Frise cours={cours} devoirs={devoirs.filter((d) => d.pour === jourChoisi)} maintenant={jourChoisi === aujourdhui ? maintenant : undefined} />
      )}
    </Ecran>
  );
}

const PX = 1.1; // hauteur d'une minute
const minutes = (dt: string) => Number(dt.slice(11, 13)) * 60 + Number(dt.slice(14, 16));

/**
 * La journée en frise : chaque cours à la hauteur de sa durée, teinté par famille de matière ; les trous se voient.
 * Annulé : hachuré et barré. Les devoirs pour ce jour s'accrochent au cours de leur matière. Trait « maintenant ».
 * Cours qui se chevauchent (demi-groupes) : côte à côte.
 */
function Frise({ cours, devoirs, maintenant }: { cours: Cours[]; devoirs: Devoir[]; maintenant?: string }) {
  const c = useCouleurs();
  const familles = useFamilles();
  const tries = [...cours].sort((a, b) => a.debut.localeCompare(b.debut));
  const debut = Math.floor(Math.min(...tries.map((x) => minutes(x.debut))) / 60) * 60;
  const fin = Math.ceil(Math.max(...tries.map((x) => minutes(x.fin))) / 60) * 60;
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
  return (
    <View style={{ height: (fin - debut) * PX + 8 }}>
      {heures.map((h) => (
        <View key={h} style={[styles.heure, { top: (h - debut) * PX }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Texte variante="petit" attenue style={styles.libelleHeure}>
            {h / 60} h
          </Texte>
          <View style={[styles.filet, { backgroundColor: c.filet }]} />
        </View>
      ))}
      <View style={styles.colonnes}>
        {places.map(({ x, col }) => {
          const f = familles[familleDe(x.codeMatiere ?? '', x.matiere)];
          const lies = devoirs.filter((d) => d.codeMatiere && d.codeMatiere === x.codeMatiere);
          const enCours = m !== undefined && minutes(x.debut) <= m && m < minutes(x.fin);
          const hauteur = (minutes(x.fin) - minutes(x.debut)) * PX - 3;
          return (
            <View
              key={x.id}
              accessible
              accessibilityLabel={`${heure(x.debut)} à ${heure(x.fin)}, ${x.matiere}${x.salle ? `, salle ${x.salle}` : ''}${x.annule ? ', annulé' : x.modifie ? ', modifié' : ''}${lies.length ? `, ${lies.length} devoir${lies.length > 1 ? 's' : ''} pour ce jour` : ''}`}
              style={[
                styles.bloc,
                {
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
                  style={{ flex: 1, fontFamily: police.fort, color: x.annule ? c.negatif : f.encre, textDecorationLine: x.annule ? 'line-through' : 'none' }}>
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
                  {[x.salle, `jusqu’à ${heure(x.fin)}`].filter(Boolean).join(' · ')}
                </Texte>
              ) : null}
              {lies.length && hauteur > 64 ? (
                <Pastille
                  texte={lies.some((d) => d.interrogation) ? 'interro' : `${lies.length} devoir${lies.length > 1 ? 's' : ''} pour ce jour`}
                  fond={c.surface}
                  encre={lies.some((d) => d.interrogation) ? c.negatif : f.encre}
                />
              ) : null}
            </View>
          );
        })}
        {m !== undefined && m >= debut && m <= fin ? (
          <View style={[styles.maintenant, { top: (m - debut) * PX }]} accessible accessibilityLabel={`Il est ${heure(maintenant!)}`}>
            <View style={[styles.pointMaintenant, { backgroundColor: c.negatif }]} />
            <View style={{ flex: 1, height: 2, backgroundColor: c.negatif }} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  semaine: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
  heure: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: espace.s, marginTop: -9 },
  libelleHeure: { width: 40, fontVariant: ['tabular-nums'] },
  filet: { flex: 1, height: StyleSheet.hairlineWidth },
  colonnes: { position: 'absolute', top: 0, bottom: 0, left: 48, right: 0 },
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
