// Emploi du temps. Sa question : « Quels cours aujourd'hui (ou tel jour), où, et qu'est-ce qui a changé ? »
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { MODE_DEMO } from '@/demo';
import { coursDemo, LUNDI_DEMO } from '@/demo/vie';
import type { Cours } from '@/domain/types';
import { useEleveActif, useEleves } from '@/features/compte/eleves';
import { useDonnee, useDonneesED } from '@/features/vie/store';
import { Bouton, BoutonRond, Ecran, EnTete, Entree, Pastille, Segments, Texte } from '@/ui/composants';
import { ajouterJours, heure, iso, jour, jourCourt, jourLong, lundiDe } from '@/ui/format';
import { espace, police, rayon, useCouleurs } from '@/ui/theme';

export default function Agenda() {
  const c = useCouleurs();
  const eleves = useEleves();
  const [eleve, choisirEleve] = useEleveActif();
  const aujourdhui = iso(new Date());
  const [lundi, setLundi] = useState(MODE_DEMO ? LUNDI_DEMO : lundiDe(aujourdhui));
  const [jourChoisi, setJour] = useState(MODE_DEMO ? LUNDI_DEMO : aujourdhui);
  const dimanche = ajouterJours(lundi, 6);
  const cle = `edt:${eleve?.id}:${lundi}`;
  const etat = useDonnee<Cours[]>(cle);
  const charger = useDonneesED((s) => s.charger);

  useEffect(() => {
    if (eleve) void charger(cle, (cl) => cl.emploiDuTemps(eleve.id, lundi, dimanche), coursDemo);
  }, [cle, eleve, lundi, dimanche, charger]);

  const changerSemaine = (n: number) => {
    const l = ajouterJours(lundi, 7 * n);
    setLundi(l);
    setJour(l);
  };
  const jours = Array.from({ length: 6 }, (_, i) => ajouterJours(lundi, i));
  const cours = (etat?.valeur ?? []).filter((x) => x.debut.startsWith(jourChoisi));
  const maintenant = `${aujourdhui} ${new Date().toTimeString().slice(0, 5)}`;

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
          <Bouton variante="texte" titre="Réessayer" onPress={() => eleve && charger(cle, (cl) => cl.emploiDuTemps(eleve.id, lundi, dimanche), coursDemo, true)} />
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
        <View style={{ gap: espace.s }}>
          {cours.map((x, i) => {
            const enCours = x.debut <= maintenant && maintenant < x.fin;
            return (
              <Entree key={x.id} rang={3 + i} style={styles.ligne}>
                <View style={styles.heures}>
                  <Texte variante="liste" style={{ fontFamily: police.fort, fontVariant: ['tabular-nums'] }}>
                    {heure(x.debut)}
                  </Texte>
                  <Texte variante="petit" attenue style={{ fontVariant: ['tabular-nums'] }}>
                    {heure(x.fin)}
                  </Texte>
                </View>
                <View
                  style={[
                    styles.carte,
                    { backgroundColor: x.annule ? c.surface : enCours ? c.teinte100 : c.teinte50, borderColor: x.annule ? c.bord : 'transparent' },
                  ]}>
                  <View style={styles.rangee}>
                    <Texte variante="liste" moyen numberOfLines={2} style={{ flex: 1, textDecorationLine: x.annule ? 'line-through' : 'none', color: x.annule ? c.attenue : c.texte }}>
                      {x.matiere}
                    </Texte>
                    {x.annule ? <Pastille texte="Annulé" fond={c.surface} encre={c.negatif} /> : x.modifie ? <Pastille texte="Modifié" /> : enCours ? <Pastille texte="Maintenant" /> : null}
                  </View>
                  <Texte variante="petit" attenue numberOfLines={1}>
                    {[x.salle, x.prof].filter(Boolean).join(' · ') || ' '}
                  </Texte>
                </View>
              </Entree>
            );
          })}
        </View>
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  semaine: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
  ligne: { flexDirection: 'row', gap: espace.m, alignItems: 'stretch' },
  heures: { width: 56, paddingTop: espace.m },
  carte: { flex: 1, borderRadius: rayon.carte, borderWidth: 1, padding: espace.m, gap: 2 },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
});
