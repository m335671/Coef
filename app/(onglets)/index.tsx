// Accueil. Sa question : « Qu'est-ce qui m'attend aujourd'hui, et où en sont mes moyennes ? » Chaque tuile ouvre son onglet.
// Pas de nom affiché en grand : l'écran doit pouvoir passer en capture d'écran.
import { router } from 'expo-router';
import { type ReactNode, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { MODE_DEMO } from '@/demo';
import { AUJOURDHUI_DEMO, coursDemo, devoirsDemo, MAINTENANT_DEMO, vieScolaireDemo } from '@/demo/vie';
import type { Cours, Devoir, EvenementVieScolaire } from '@/domain/types';
import { useEleveActif } from '@/features/compte/eleves';
import { familleDe } from '@/features/notes/familles';
import { useNotes } from '@/features/notes/store';
import { periodeParDefaut, vueNotes } from '@/features/notes/vue';
import { useDonnee, useDonneesED } from '@/features/vie/store';
import { libelleMatiere } from '@/sync/annonce';
import { BoutonRond, Ecran, EnTete, Entree, IconeReglages, Pastille, Presse, Texte } from '@/ui/composants';
import { ajouterJours, brute, heure, iso, jourLong, lundiDe, moyenne } from '@/ui/format';
import { Anneau } from '@/ui/graphiques';
import { espace, police, rayon, useCouleurs, useFamilles } from '@/ui/theme';

export default function Accueil() {
  const c = useCouleurs();
  const familles = useFamilles();
  const [eleve] = useEleveActif();
  const id = eleve?.id ?? '';
  const aujourdhui = MODE_DEMO ? AUJOURDHUI_DEMO : iso(new Date());
  const maintenant = MODE_DEMO ? MAINTENANT_DEMO : `${aujourdhui} ${new Date().toTimeString().slice(0, 5)}`;
  const lundi = lundiDe(aujourdhui);
  const cles = { edt: `edt:${id}:${lundi}`, devoirs: `devoirs:${id}`, vie: `vie:${id}` };

  // Mêmes clés que les onglets : ce qui est chargé ici leur sert aussi (et l'inverse).
  const chargerNotes = useNotes((s) => s.charger);
  const charger = useDonneesED((s) => s.charger);
  useEffect(() => {
    if (!id) return;
    void chargerNotes(id);
    void charger(cles.edt, (cl) => cl.emploiDuTemps(id, lundi, ajouterJours(lundi, 6)), coursDemo);
    void charger(cles.devoirs, (cl) => cl.devoirs(id), devoirsDemo);
    void charger(cles.vie, (cl) => cl.vieScolaire(id), vieScolaireDemo);
  }, [id, lundi, cles.edt, cles.devoirs, cles.vie, chargerNotes, charger]);

  const instantane = useNotes((s) => s.eleves[id]?.instantane);
  const cours = useDonnee<Cours[]>(cles.edt)?.valeur ?? [];
  const devoirs = useDonnee<Devoir[]>(cles.devoirs)?.valeur ?? [];
  const vie = useDonnee<EvenementVieScolaire[]>(cles.vie)?.valeur ?? [];

  const vue = useMemo(() => {
    const p = instantane && periodeParDefaut(instantane.donnees, aujourdhui);
    return instantane && p ? vueNotes(instantane, p.code) : undefined;
  }, [instantane, aujourdhui]);
  const derniere = useMemo(() => {
    if (!vue || !instantane) return undefined;
    const ids = new Set(vue.matieres.flatMap(({ matiere: m }) => [...m.notes, ...m.sousMatieres.flatMap((s) => s.notes)].map((n) => n.id)));
    return vue.nouvelles[0] ?? instantane.donnees.notes.filter((n) => ids.has(n.id)).sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [vue, instantane]);

  const restants = cours.filter((x) => !x.annule && x.fin > maintenant).sort((a, b) => a.debut.localeCompare(b.debut));
  const prochain = restants[0];
  const aFaire = devoirs.filter((d) => !d.effectue && d.pour > aujourdhui);
  const pour = aFaire.map((d) => d.pour).sort()[0];
  const lot = aFaire.filter((d) => d.pour === pour);
  const aJustifier = vie.filter((e) => (e.type === 'absence' || e.type === 'retard') && e.justifie === false);
  const g = vue?.resultat.generale;
  const famille = prochain ? familles[familleDe(prochain.codeMatiere ?? '', prochain.matiere)] : undefined;
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
            <BoutonRond libelle="Réglages" onPress={() => router.push('/reglages')}>
              <IconeReglages />
            </BoutonRond>
          }
        />
      </View>

      <View style={styles.bento}>
        <Tuile
          rang={1}
          large
          fond={c.teinte50}
          onPress={() => router.navigate('/notes')}
          libelle={`Moyenne générale prévue ${g === undefined ? 'pas encore calculée' : moyenne(g)}. Ouvrir les notes`}>
          <View style={styles.rangee}>
            <Anneau
              valeur={g}
              taillePx={96}
              epaisseur={9}
              fond={c.teinte50}
              libelle=""
              reperes={vue?.periode.classeGenerale?.moyenne !== undefined ? [{ valeur: vue.periode.classeGenerale.moyenne, couleur: c.attenue }] : []}>
              <Texte style={{ fontFamily: police.gras, fontSize: 18, color: c.accent, fontVariant: ['tabular-nums'] }}>
                {g === undefined ? '—' : moyenne(g)}
              </Texte>
            </Anneau>
            <View style={{ flex: 1, gap: espace.xs }}>
              <Texte variante="petit" style={{ color: c.accentEncre }}>
                Moyenne prévue · {vue?.periode.libelle ?? '…'}
              </Texte>
              {derniere && instantane ? (
                <>
                  <Texte variante="liste" moyen numberOfLines={1}>
                    {libelleMatiere(instantane.donnees, derniere)}
                  </Texte>
                  <View style={styles.rangee}>
                    <Texte variante="liste" style={{ fontFamily: police.fort, fontVariant: ['tabular-nums'] }}>
                      {brute(derniere.valeurBrute)}/{derniere.noteSur}
                    </Texte>
                    {vue?.nouvelles.length ? <Pastille texte={vue.nouvelles.length > 1 ? `${vue.nouvelles.length} nouvelles` : 'nouvelle'} /> : null}
                  </View>
                </>
              ) : (
                <Texte variante="liste" attenue>
                  {instantane ? 'Pas encore de note ce trimestre.' : 'Synchronisation…'}
                </Texte>
              )}
            </View>
          </View>
        </Tuile>

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
          {prochain ? (
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
          {pour ? (
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

        <Tuile
          rang={4}
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

function Tuile({
  children,
  rang,
  large,
  fond,
  bord,
  onPress,
  libelle,
}: {
  children: ReactNode;
  rang: number;
  large?: boolean;
  fond: string;
  bord?: string;
  onPress: () => void;
  libelle: string;
}) {
  return (
    <Entree rang={rang} style={large ? styles.large : styles.demi}>
      <Presse
        onPress={onPress}
        libelleAccessible={libelle}
        style={[styles.tuile, { backgroundColor: fond, borderColor: bord ?? fond, minHeight: large ? undefined : 132 }]}>
        {children}
      </Presse>
    </Entree>
  );
}

const styles = StyleSheet.create({
  bento: { flexDirection: 'row', flexWrap: 'wrap', gap: espace.m },
  large: { width: '100%' },
  demi: { flexBasis: '45%', flexGrow: 1 },
  tuile: { borderRadius: rayon.phare, borderWidth: 1, padding: espace.l, gap: espace.xs },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: espace.m },
});
