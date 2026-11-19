// Accueil. Sa question : « Qu'est-ce qui m'attend aujourd'hui, et où en sont mes moyennes ? » Chaque tuile ouvre son onglet.
// Pas de nom affiché en grand : l'écran doit pouvoir passer en capture d'écran.
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { MODE_DEMO } from '@/demo';
import { AUJOURDHUI_DEMO, coursDemo, devoirsDemo, MAINTENANT_DEMO, vieScolaireDemo } from '@/demo/vie';
import type { Cours, Devoir, EvenementVieScolaire } from '@/domain/types';
import { useEleveActif } from '@/features/compte/eleves';
import { useCouleurMatiere } from '@/features/notes/familles';
import { useNotes } from '@/features/notes/store';
import { useSimulation } from '@/features/notes/simulation';
import { evolution, periodeParDefaut, vueNotes } from '@/features/notes/vue';
import { useDonnee, useDonneesED } from '@/features/vie/store';
import { libelleMatiere } from '@/sync/annonce';
import {
  BoutonRond,
  Courbe,
  Ecart,
  Ecran,
  EnTete,
  Entree,
  IconeActualiser,
  IconeReglages,
  Pastille,
  Presse,
  Pulsation,
  Squelette,
  Texte,
  useDemarrage,
  useMinute,
} from '@/ui/composants';
import { ajouterJours, brute, ecart, heure, iso, jour, jourCourt, jourLong, lundiDe, moyenne } from '@/ui/format';
import { Anneau } from '@/ui/graphiques';
import { Tuile } from '@/ui/Tuile';
import { espace, police, useCouleurs } from '@/ui/theme';

export default function Accueil() {
  const c = useCouleurs();
  const couleurMatiere = useCouleurMatiere();
  const [eleve] = useEleveActif();
  const id = eleve?.id ?? '';
  const horloge = useMinute();
  const aujourdhui = MODE_DEMO ? AUJOURDHUI_DEMO : iso(horloge);
  const maintenant = MODE_DEMO ? MAINTENANT_DEMO : `${aujourdhui} ${horloge.toTimeString().slice(0, 5)}`;
  const lundi = lundiDe(aujourdhui);
  const cles = { edt: `edt:${id}:${lundi}`, devoirs: `devoirs:${id}`, vie: `vie:${id}` };

  // Mêmes clés que les onglets : ce qui est chargé ici leur sert aussi (et l'inverse).
  const chargerNotes = useNotes((s) => s.charger);
  const charger = useDonneesED((s) => s.charger);
  const tout = (forcer = false) => {
    if (!id) return;
    void chargerNotes(id, forcer);
    void charger(cles.edt, (cl) => cl.emploiDuTemps(id, lundi, ajouterJours(lundi, 6)), coursDemo, forcer);
    void charger(cles.devoirs, (cl) => cl.devoirs(id), devoirsDemo, forcer);
    void charger(cles.vie, (cl) => cl.vieScolaire(id), vieScolaireDemo, forcer);
  };
  useEffect(tout, [id, lundi, cles.edt, cles.devoirs, cles.vie, chargerNotes, charger]);

  const etatNotes = useNotes((s) => s.eleves[id]);
  const instantane = etatNotes?.instantane;
  const etatEdt = useDonnee<Cours[]>(cles.edt);
  const etatDevoirs = useDonnee<Devoir[]>(cles.devoirs);
  const cours = etatEdt?.valeur ?? [];
  const devoirs = etatDevoirs?.valeur ?? [];
  const vie = useDonnee<EvenementVieScolaire[]>(cles.vie)?.valeur ?? [];
  // Squelette tant que la donnée n'est pas là (et un court instant au lancement, pour que tout arrive d'un bloc).
  const demarrage = useDemarrage();
  const pret = (e?: { valeur?: unknown; chargement?: boolean }) => !demarrage && (e?.valeur !== undefined || e?.chargement === false);
  const occupe = !!etatNotes?.chargement || !!etatEdt?.chargement || !!etatDevoirs?.chargement;

  const vue = useMemo(() => {
    const p = instantane && periodeParDefaut(instantane.donnees, aujourdhui);
    return instantane && p ? vueNotes(instantane, p.code) : undefined;
  }, [instantane, aujourdhui]);

  const restants = cours.filter((x) => !x.annule && x.fin > maintenant).sort((a, b) => a.debut.localeCompare(b.debut));
  const prochain = restants[0];
  const aFaire = devoirs.filter((d) => !d.effectue && d.pour > aujourdhui);
  const pour = aFaire.map((d) => d.pour).sort()[0];
  const lot = aFaire.filter((d) => d.pour === pour);
  const aJustifier = vie.filter((e) => (e.type === 'absence' || e.type === 'retard') && e.justifie === false);
  const g = vue?.resultat.generale;
  const classe = vue?.periode.classeGenerale?.moyenne;
  const simulation = useSimulation();
  useEffect(() => void simulation.charger(), [simulation.charger]); // eslint-disable-line react-hooks/exhaustive-deps
  const objectif = simulation.objectifAffiche !== false ? simulation.objectif : undefined;
  const reperes = [
    ...(classe !== undefined ? [{ valeur: classe, couleur: c.attenue }] : []),
    ...(objectif !== undefined ? [{ valeur: objectif, couleur: c.objectif }] : []),
  ];
  const courbe = useMemo(() => (instantane && vue ? evolution(instantane.donnees, vue.periode).map((x) => x.moyenne) : []), [instantane, vue]);
  const recentes = useMemo(() => {
    if (!vue || !instantane) return [];
    const ids = new Set(vue.matieres.flatMap(({ matiere: m }) => [...m.notes, ...m.sousMatieres.flatMap((s) => s.notes)].map((n) => n.id)));
    return instantane.donnees.notes
      .filter((n) => ids.has(n.id))
      // Les dernières reçues (date de saisie par le professeur), pas les derniers devoirs : une note d'un vieux
      // contrôle saisie aujourd'hui apparaît en tête.
      .sort((a, b) => (b.dateSaisie ?? b.date).localeCompare(a.dateSaisie ?? a.date) || b.date.localeCompare(a.date))
      .slice(0, 4);
  }, [vue, instantane]);
  const nouvelles = new Set(vue?.nouvelles.map((n) => n.id));
  const duJour = cours.filter((x) => x.debut.startsWith(aujourdhui)).sort((a, b) => a.debut.localeCompare(b.debut));
  const aVenir = [...aFaire].sort((a, b) => a.pour.localeCompare(b.pour)).slice(0, 4);
  const famille = prochain ? couleurMatiere(prochain.codeMatiere ?? '', prochain.matiere) : undefined;
  const date = new Date(`${aujourdhui}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Ecran>
      <View>
        <Entree>
          <Texte variante="petit" attenue style={{ marginTop: espace.s }}>
            {date.replace(/^./, (x) => x.toUpperCase())}
          </Texte>
        </Entree>
        <EnTete
          titre="Aujourd’hui"
          action={
            <View style={{ flexDirection: 'row', gap: espace.s }}>
              <BoutonRond libelle={occupe ? 'Actualisation en cours' : 'Tout actualiser'} onPress={() => !occupe && tout(true)}>
                <View style={{ opacity: occupe ? 0.35 : 1 }}>
                  <IconeActualiser />
                </View>
              </BoutonRond>
              <BoutonRond libelle="Réglages" onPress={() => router.push('/reglages')}>
                <IconeReglages />
              </BoutonRond>
            </View>
          }
        />
      </View>

      <View style={styles.bento}>
        <Tuile
          rang={1}
          large
          fond={c.teinte50}
          onPress={() => router.navigate('/notes')}
          onLongPress={vue ? () => router.push({ pathname: '/simulateur', params: { periode: vue.periode.code, eleve: id, onglet: 'objectif' } }) : undefined}
          libelle={`Moyenne générale prévue ${g === undefined ? 'pas encore calculée' : moyenne(g)}. Ouvrir les notes`}>
          <View style={styles.rangee}>
            <Anneau valeur={g} taillePx={124} epaisseur={11} fond={c.teinte50} libelle="" reperes={reperes}>
              {g === undefined || demarrage ? (
                <Squelette largeur={64} hauteur={24} />
              ) : (
                <Texte style={{ fontFamily: police.gras, fontSize: 24, color: c.accent, fontVariant: ['tabular-nums'] }}>{moyenne(g)}</Texte>
              )}
              <Texte variante="petit" attenue>
                sur 20
              </Texte>
            </Anneau>
            <View style={{ flex: 1, gap: espace.xs }}>
              <Texte variante="petit" style={{ color: c.accentEncre }}>
                Moyenne prévue · {vue?.periode.libelle ?? '…'}
              </Texte>
              {vue?.ecart !== undefined && vue.depuis ? <Ecart valeur={vue.ecart} suffixe={`depuis le ${jour(vue.depuis)}`} /> : null}
              {classe !== undefined ? (
                <Texte variante="petit" attenue style={{ fontVariant: ['tabular-nums'] }}>
                  Classe {moyenne(classe)}
                  {g !== undefined ? ` · ${ecart(g - classe)}` : ''}
                </Texte>
              ) : null}
              {objectif !== undefined && g !== undefined ? (
                <Texte variante="petit" style={{ color: c.objectif, fontFamily: police.fort, fontVariant: ['tabular-nums'] }}>
                  Objectif {moyenne(objectif)} · {g >= objectif ? 'atteint' : `il manque ${moyenne(objectif - g)}`}
                </Texte>
              ) : null}
            </View>
          </View>
          {courbe.length > 1 ? (
            <Courbe points={courbe} hauteur={44} libelle={`Évolution de la moyenne prévue, de ${moyenne(courbe[0]!)} à ${moyenne(courbe.at(-1)!)}`} />
          ) : null}
        </Tuile>

        <View style={styles.paire}>
          <Tuile
            rang={2}
            fond={famille?.fond ?? c.teinte50}
            onPress={() => router.navigate('/agenda')}
            libelle={
              prochain
                ? `Prochain cours : ${prochain.matiere}, ${heure(prochain.debut)}${prochain.salle ? `, salle ${prochain.salle}` : ''}`
                : 'Plus de cours aujourd’hui'
            }>
            <Texte variante="petit" style={{ color: famille?.encre ?? c.accentEncre }}>
              {prochain && prochain.debut <= maintenant ? 'En ce moment' : 'Prochain cours'}
            </Texte>
            {!pret(etatEdt) ? (
              <View style={{ gap: espace.s, marginTop: espace.xs }}>
                <Squelette largeur="85%" hauteur={18} />
                <Squelette largeur="55%" hauteur={12} />
              </View>
            ) : prochain ? (
              <>
                <Texte variante="section" numberOfLines={2} style={{ color: famille?.encre }}>
                  {prochain.matiere}
                </Texte>
                <Texte variante="petit" style={{ color: famille?.encre }}>
                  {[
                    prochain.debut.startsWith(aujourdhui) ? heure(prochain.debut) : `${jourLong(prochain.debut.slice(0, 10))}, ${heure(prochain.debut)}`,
                    prochain.salle,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Texte>
              </>
            ) : (
              <Texte variante="liste" attenue>
                {cours.length ? 'Plus de cours cette semaine.' : 'Pas d’emploi du temps.'}
              </Texte>
            )}
          </Tuile>

          <Tuile
            rang={3}
            fond={c.surface}
            bord={c.bord}
            onPress={() => router.navigate('/devoirs')}
            libelle={pour ? `${lot.length} devoirs pour ${jourLong(pour)}` : 'Aucun devoir à venir'}>
            <Texte variante="petit" attenue>
              {pour ? (pour === ajouterJours(aujourdhui, 1) ? 'Pour demain' : `Pour ${jourLong(pour)}`) : 'Devoirs'}
            </Texte>
            {!pret(etatDevoirs) ? (
              <View style={{ gap: espace.s, marginTop: espace.xs }}>
                <Squelette largeur={30} hauteur={30} />
                <Squelette largeur="50%" hauteur={12} />
              </View>
            ) : pour ? (
              <>
                <Texte style={{ fontFamily: police.gras, fontSize: 30, lineHeight: 34, color: c.texte, fontVariant: ['tabular-nums'] }}>{lot.length}</Texte>
                <Texte variante="petit" style={{ color: lot.some((d) => d.interrogation) ? c.negatif : c.attenue }}>
                  {lot.some((d) => d.interrogation) ? `dont ${lot.filter((d) => d.interrogation).length} interro` : lot.length > 1 ? 'devoirs' : 'devoir'}
                </Texte>
              </>
            ) : (
              <Texte variante="liste" attenue>
                Rien à faire.
              </Texte>
            )}
          </Tuile>
        </View>

        <Tuile rang={4} large fond={c.surface} bord={c.bord} onPress={() => router.navigate('/agenda')} libelle={`Ta journée : ${duJour.length} cours`}>
          <Texte variante="section">Ta journée</Texte>
          {!pret(etatEdt) ? (
            <View style={{ gap: espace.m, paddingVertical: espace.s }}>
              {[70, 50, 62].map((l) => (
                <Squelette key={l} largeur={`${l}%`} />
              ))}
            </View>
          ) : duJour.length === 0 ? (
            <Texte variante="liste" attenue>
              Pas de cours aujourd’hui.
            </Texte>
          ) : (
            duJour.map((x) => {
              const f = couleurMatiere(x.codeMatiere ?? '', x.matiere);
              const passe = x.fin <= maintenant;
              const enCours = !x.annule && x.debut <= maintenant && maintenant < x.fin;
              return (
                <View key={x.id} style={[styles.ligne, { opacity: passe && !enCours ? 0.5 : 1 }]}>
                  <Texte variante="petit" attenue style={styles.heure}>
                    {heure(x.debut)}
                  </Texte>
                  <View style={[styles.pastilleFamille, { backgroundColor: x.annule ? c.negatif : f.trait }]} />
                  <Texte
                    variante="liste"
                    numberOfLines={1}
                    style={{
                      flex: 1,
                      fontFamily: enCours ? police.fort : police.normal,
                      textDecorationLine: x.annule ? 'line-through' : 'none',
                      color: x.annule ? c.negatif : c.texte,
                    }}>
                    {x.matiere}
                  </Texte>
                  {enCours ? (
                    <Pastille texte="maintenant" />
                  ) : x.annule ? (
                    <Pastille texte="annulé" fond={c.surface} encre={c.negatif} />
                  ) : (
                    <Texte variante="petit" attenue numberOfLines={1}>
                      {x.salle ?? ''}
                    </Texte>
                  )}
                </View>
              );
            })
          )}
        </Tuile>

        <Tuile rang={5} large fond={c.surface} bord={c.bord} libelle="Dernières notes">
          <View style={styles.rangee}>
            <Texte variante="section" style={{ flex: 1 }}>
              Dernières notes
            </Texte>
            <Presse onPress={() => router.navigate('/notes')} libelleAccessible="Toutes les notes" style={styles.lien}>
              <Texte variante="petit" style={{ color: c.accent, fontFamily: police.fort }}>
                Tout voir
              </Texte>
            </Presse>
          </View>
          {!instantane || demarrage ? (
            <View style={{ gap: espace.m, paddingVertical: espace.s }}>
              {[60, 45, 55].map((l) => (
                <Squelette key={l} largeur={`${l}%`} />
              ))}
            </View>
          ) : recentes.length === 0 ? (
            <Texte variante="liste" attenue>
              Pas encore de note ce trimestre.
            </Texte>
          ) : (
            recentes.map((n) => (
              <Presse
                key={n.id}
                onPress={() => router.push({ pathname: '/note/[id]', params: { id: n.id, periode: vue!.periode.code, eleve: id } })}
                libelleAccessible={`${libelleMatiere(instantane!.donnees, n)}, ${brute(n.valeurBrute)} sur ${n.noteSur}`}
                style={styles.ligne}>
                {nouvelles.has(n.id) ? <Pulsation /> : <View style={{ width: 10 }} />}
                <View style={{ flex: 1 }}>
                  <Texte variante="liste" numberOfLines={1}>
                    {libelleMatiere(instantane!.donnees, n)}
                  </Texte>
                  <Texte variante="petit" attenue numberOfLines={1}>
                    {jour(n.date)} · {n.devoir || 'Devoir'}
                  </Texte>
                </View>
                <Texte variante="liste" style={{ fontFamily: police.fort, fontVariant: ['tabular-nums'] }}>
                  {brute(n.valeurBrute)}
                  <Texte variante="petit" attenue>
                    /{n.noteSur}
                  </Texte>
                </Texte>
              </Presse>
            ))
          )}
        </Tuile>

        <Tuile rang={6} large fond={c.surface} bord={c.bord} onPress={() => router.navigate('/devoirs')} libelle={`${aFaire.length} devoirs à venir`}>
          <Texte variante="section">À venir</Texte>
          {!pret(etatDevoirs) ? (
            <View style={{ gap: espace.m, paddingVertical: espace.s }}>
              {[55, 65].map((l) => (
                <Squelette key={l} largeur={`${l}%`} />
              ))}
            </View>
          ) : aVenir.length === 0 ? (
            <Texte variante="liste" attenue>
              Rien à faire.
            </Texte>
          ) : (
            aVenir.map((d) => (
              <View key={d.id} style={styles.ligne}>
                <Texte variante="petit" attenue style={styles.heure}>
                  {jourCourt(d.pour)} {Number(d.pour.slice(8))}
                </Texte>
                <View style={[styles.pastilleFamille, { backgroundColor: couleurMatiere(d.codeMatiere ?? '', d.matiere).trait }]} />
                <Texte variante="liste" numberOfLines={1} style={{ flex: 1 }}>
                  {d.matiere}
                </Texte>
                {d.interrogation ? <Pastille texte="interro" fond={c.surface} encre={c.negatif} /> : null}
              </View>
            ))
          )}
        </Tuile>

        <Tuile
          rang={7}
          large
          fond={c.surface}
          bord={c.bord}
          onPress={() => router.navigate('/vie-scolaire')}
          libelle={aJustifier.length ? `${aJustifier.length} à justifier` : 'Rien à justifier'}>
          <View style={styles.rangee}>
            <Texte variante="liste" moyen style={{ flex: 1, color: aJustifier.length ? c.negatif : c.texte }}>
              {aJustifier.length === 0
                ? 'Rien à justifier'
                : `${aJustifier.length} ${aJustifier.every((e) => e.type === 'retard') ? 'retard' : aJustifier.every((e) => e.type === 'absence') ? 'absence' : 'absences et retard'}${aJustifier.length > 1 ? 's' : ''} à justifier`}
            </Texte>
            <Pastille texte="Vie scolaire" fond={aJustifier.length ? c.surface : undefined} encre={aJustifier.length ? c.negatif : undefined} />
          </View>
        </Tuile>
      </View>

      <Texte variante="petit" attenue>
        Coef, client non officiel, non affilié à EcoleDirecte.
      </Texte>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  bento: { gap: espace.m },
  paire: { flexDirection: 'row', gap: espace.m },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: espace.m },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: espace.s, minHeight: 40 },
  heure: { width: 52, fontVariant: ['tabular-nums'] },
  pastilleFamille: { width: 8, height: 8, borderRadius: 4 },
  lien: { minHeight: 44, justifyContent: 'center', paddingHorizontal: espace.xs },
});
