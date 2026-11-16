// Écran des notes, la vitrine. Sa question : « Où en est ma moyenne ce trimestre, et qu'est-ce qui l'a fait bouger ? »
// Le plus grand chiffre y répond (moyenne générale prévue), le signal d'écart dit ce qui a bougé depuis la synchro.
import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { MODE_DEMO } from '@/demo';
import { ELEVE_DEMO } from '@/demo/notes';
import type { Eleve } from '@/domain/types';
import { useCompte } from '@/features/compte/store';
import { useNotes } from '@/features/notes/store';
import { periodeParDefaut, periodesAffichees, type VueNotes, vueNotes } from '@/features/notes/vue';
import { libelleMatiere } from '@/sync/annonce';
import { Bouton, Chiffre, Ecart, Ecran, EnTete, Ligne, Panneau, Reglette, Section, Segments, Texte } from '@/ui/composants';
import { brute, coef, jour, moyenne } from '@/ui/format';
import { espace, taille, useCouleurs } from '@/ui/theme';

export default function Accueil() {
  const { client, profils, horsLigne, restaurer } = useCompte();
  const [etat, setEtat] = useState<'attente' | 'connexion' | 'pret'>(MODE_DEMO || client || horsLigne ? 'pret' : 'attente');

  useEffect(() => {
    if (etat !== 'attente') return;
    restaurer().then(
      (ok) => setEtat(ok ? 'pret' : 'connexion'),
      () => setEtat('connexion'), // session expirée ou refusée : on repasse par la connexion
    );
  }, [etat, restaurer]);

  if (etat === 'connexion') return <Redirect href="/connexion" />;
  if (etat === 'attente') return <Attente />;
  const eleves = MODE_DEMO ? [ELEVE_DEMO] : profils.flatMap((p) => p.eleves);
  return <Notes eleves={eleves} />;
}

function Attente() {
  const c = useCouleurs();
  return <ActivityIndicator accessibilityLabel="Reconnexion à EcoleDirecte" style={{ flex: 1, backgroundColor: c.fond }} />;
}

function Notes({ eleves }: { eleves: Eleve[] }) {
  const [eleveId, setEleveId] = useState(eleves[0]?.id ?? '');
  const etat = useNotes((s) => s.eleves[eleveId]);
  const charger = useNotes((s) => s.charger);
  const [periodeChoisie, setPeriode] = useState<string>();

  useEffect(() => {
    if (eleveId) void charger(eleveId);
  }, [eleveId, charger]);

  const instantane = etat?.instantane;
  const periodes = instantane ? periodesAffichees(instantane.donnees) : [];
  const periode = periodeChoisie ?? (instantane && periodeParDefaut(instantane.donnees, new Date().toISOString().slice(0, 10))?.code);
  const vue = useMemo(() => (instantane && periode ? vueNotes(instantane, periode) : undefined), [instantane, periode]);

  return (
    <Ecran>
      <EnTete titre="Notes" action={<Bouton variante="texte" titre="Réglages" onPress={() => router.push('/reglages')} />} />
      {eleves.length > 1 ? (
        <Segments libelle="Élève" options={eleves.map((e) => ({ cle: e.id, libelle: e.prenom }))} valeur={eleveId} onChange={setEleveId} />
      ) : null}
      {periodes.length > 0 && periode ? (
        <Segments libelle="Période" options={periodes.map((p) => ({ cle: p.code, libelle: p.libelle }))} valeur={periode} onChange={setPeriode} />
      ) : null}
      <Moyenne vue={vue} chargement={etat?.chargement ?? true} erreur={etat?.erreur} synchro={instantane?.synchro} onReessayer={() => charger(eleveId, true)} />
      {vue && instantane ? (
        <>
          {vue.nouvelles.length > 0 ? (
            <Section titre="Nouvelles notes" aide={vue.depuis ? `Depuis la synchro du ${jour(vue.depuis)}` : undefined}>
              <Panneau>
                {vue.nouvelles.slice(0, 5).map((n, i, l) => (
                  <Ligne
                    key={n.id}
                    dernier={i === l.length - 1}
                    onPress={() => router.push({ pathname: '/matiere/[code]', params: { code: n.matiereCode, periode: vue.periode.code, eleve: eleveId } })}>
                    <View style={{ flex: 1 }}>
                      <Texte variante="liste" moyen numberOfLines={1}>
                        {libelleMatiere(instantane.donnees, n)}
                      </Texte>
                      <Texte variante="petit" attenue numberOfLines={1}>
                        {n.devoir || n.matiereCode} · coef {coef(n.coef)}
                      </Texte>
                    </View>
                    <Texte variante="liste" moyen style={styles.chiffres}>
                      {brute(n.valeurBrute)}
                      <Texte variante="liste" attenue>
                        /{n.noteSur}
                      </Texte>
                    </Texte>
                  </Ligne>
                ))}
              </Panneau>
            </Section>
          ) : null}
          <Section titre="Matières" aide={`${vue.periode.libelle} · moyennes prévues, points sur 20`}>
            <Panneau>
              {vue.matieres.map(({ matiere: m, sur20 }, i, l) => (
                <Ligne
                  key={m.code}
                  dernier={i === l.length - 1}
                  libelleAccessible={`${m.libelle}, coefficient ${coef(m.coef)}, ${m.moyenne === undefined ? 'pas de note' : `moyenne prévue ${moyenne(m.moyenne)}`}`}
                  onPress={() => router.push({ pathname: '/matiere/[code]', params: { code: m.code, periode: vue.periode.code, eleve: eleveId } })}>
                  <View style={{ flex: 1 }}>
                    <Texte variante="liste" moyen numberOfLines={2}>
                      {m.libelle}
                    </Texte>
                    <Texte variante="petit" attenue>
                      coef {coef(m.coef)}
                    </Texte>
                  </View>
                  <View style={styles.reglette}>
                    <Reglette notes={sur20} moyenne={m.moyenne} />
                  </View>
                  <View style={styles.colonne}>
                    <Chiffre valeur={m.moyenne} />
                  </View>
                </Ligne>
              ))}
            </Panneau>
          </Section>
          <Bouton
            variante="secondaire"
            titre="Simuler une note"
            onPress={() => router.push({ pathname: '/simulateur', params: { periode: vue.periode.code, eleve: eleveId } })}
          />
          <Texte variante="petit" attenue>
            Moyennes prévues par ED-Clone à partir de tes notes. Client non officiel, non affilié à EcoleDirecte.
          </Texte>
        </>
      ) : null}
    </Ecran>
  );
}

/** Le bloc qui répond à la question de l'écran : la moyenne générale prévue, son écart, son état face à ED. */
function Moyenne({
  vue,
  chargement,
  erreur,
  synchro,
  onReessayer,
}: {
  vue?: VueNotes;
  chargement: boolean;
  erreur?: unknown;
  synchro?: string;
  onReessayer: () => void;
}) {
  const c = useCouleurs();
  const g = vue?.resultat.generale;
  const officielle = vue?.resultat.officielleGenerale;
  const cal = vue?.calibration;
  const etatED =
    officielle === undefined
      ? 'Pas encore de moyenne officielle ED pour cette période'
      : `Officielle ED ${moyenne(officielle)}${
          vue?.enAvance ? `, sans ${vue.enAvance === 1 ? 'la dernière note' : `les ${vue.enAvance} dernières notes`}` : ''
        } · ${cal?.verifie ? 'calcul vérifié' : `écart de ${moyenne(cal?.ecartMax ?? 0)} point`}`;
  const fraicheur = chargement
    ? 'Synchronisation avec EcoleDirecte…'
    : synchro
      ? `Synchro ${jour(synchro)} à ${new Date(synchro).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
      : undefined;

  return (
    <Panneau style={{ paddingVertical: espace.l, gap: espace.s }}>
      <Texte variante="liste" attenue>
        Moyenne générale prévue
      </Texte>
      <View style={styles.phare}>
        {vue ? <Chiffre valeur={g} taillePx={taille.phare} donnee /> : <View style={[styles.attente, { backgroundColor: c.releve }]} />}
        {vue && g !== undefined ? (
          <Texte variante="liste" attenue>
            /20
          </Texte>
        ) : null}
        <View style={{ flex: 1 }} />
        {vue?.ecart !== undefined && vue.depuis ? <Ecart valeur={vue.ecart} suffixe={`depuis le ${jour(vue.depuis)}`} /> : null}
      </View>
      {vue ? (
        <Texte variante="liste" attenue>
          {etatED}
        </Texte>
      ) : null}
      {erreur ? (
        <View style={{ gap: espace.xs }}>
          <Texte variante="liste">
            {erreur instanceof ErreurED ? erreur.message : 'La synchronisation a échoué.'}
            {vue ? ' Notes affichées : dernière synchro réussie.' : ''}
          </Texte>
          <Bouton variante="texte" titre="Réessayer" onPress={onReessayer} />
        </View>
      ) : fraicheur ? (
        <Texte variante="petit" attenue>
          {fraicheur}
        </Texte>
      ) : null}
    </Panneau>
  );
}

const styles = StyleSheet.create({
  phare: { flexDirection: 'row', alignItems: 'baseline', gap: espace.xs, minHeight: 46 },
  attente: { width: 120, height: 40, borderRadius: 4 },
  reglette: { width: 88 },
  colonne: { width: 48, alignItems: 'flex-end' },
  chiffres: { fontVariant: ['tabular-nums'] },
});
