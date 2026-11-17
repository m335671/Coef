// Simulateur. Ses questions : « Si j'ai telle note, où va ma moyenne ? » et « Quelle note pour atteindre X ? »
// Il part de la moyenne PRÉVUE (le calcul officiel vérifié + les notes qu'ED n'a pas encore comptées).
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { calculer } from '@/domain/moyennes/moteur';
import { type Cible, type NoteHypothetique, noteNecessaire, simuler } from '@/domain/moyennes/simulateur';
import { useNotes } from '@/features/notes/store';
import { Bouton, BoutonRond, ChiffreAnime, Curseur, Ecart, Ecran, EnTete, Entree, Ligne, Panneau, Section, Segments, Texte } from '@/ui/composants';
import { coef as formatCoef, moyenne } from '@/ui/format';
import { espace, taille, useCouleurs } from '@/ui/theme';

const POIDS = [0.5, 1, 2, 3, 4];

export default function Simulateur() {
  const c = useCouleurs();
  const params = useLocalSearchParams<{ periode: string; eleve: string; code?: string }>();
  const instantane = useNotes((s) => s.eleves[params.eleve]?.instantane);
  const d = instantane?.donnees;
  const p = d?.periodes.find((x) => x.code === params.periode);
  const matieres = p?.matieres.filter((m) => !m.sousCode) ?? [];

  const [code, setCode] = useState(params.code ?? matieres[0]?.code ?? '');
  const [note, setNote] = useState(14);
  const [sur, setSur] = useState(20);
  const [poids, setPoids] = useState(1);
  const [gardees, setGardees] = useState<NoteHypothetique[]>([]);
  const [objectif, setObjectif] = useState(14);
  const [portee, setPortee] = useState<'matiere' | 'generale'>('matiere');

  const fermer = (
    <BoutonRond libelle="Fermer le simulateur" onPress={() => router.back()}>
      <Texte variante="section" style={{ color: c.accent }}>
        ✕
      </Texte>
    </BoutonRond>
  );

  if (!d || !p) {
    return (
      <Ecran>
        <EnTete titre="Simulateur" action={fermer} />
        <Texte>Synchronise d’abord tes notes.</Texte>
      </Ecran>
    );
  }

  const options = { parametrage: d.parametrage };
  const brouillon: NoteHypothetique = { matiereCode: code, valeur: Math.min(note, sur), noteSur: sur, coef: poids };
  const avant = calculer(p, d.notes, d.periodes, options);
  const apres = simuler(p, d.notes, d.periodes, [...gardees, brouillon], options);
  const nom = matieres.find((m) => m.code === code)?.libelle ?? code;
  const mAvant = avant.matieres.find((m) => m.code === code)?.moyenne;
  const mApres = apres.matieres.find((m) => m.code === code)?.moyenne;
  const cible: Cible = portee === 'generale' ? { portee: 'generale' } : { portee: 'matiere', code };
  const besoin = noteNecessaire(p, d.notes, d.periodes, { matiereCode: code, noteSur: sur, coef: poids }, cible, objectif, options);
  const changerSur = (s: number) => {
    setSur(s);
    setNote((n) => Math.min(n, s));
  };

  return (
    <Ecran>
      <EnTete titre="Simulateur" action={fermer} />
      <Entree rang={1}>
        <Segments libelle="Matière" plein options={matieres.map((m) => ({ cle: m.code, libelle: m.libelle }))} valeur={code} onChange={setCode} />
      </Entree>

      <Entree rang={2}>
        <Panneau teinte style={{ paddingVertical: espace.xl, gap: espace.m }}>
          <Texte variante="liste" style={{ color: c.accentEncre }}>
            Si j’ai en {nom}…
          </Texte>
          <View style={styles.phare}>
            <ChiffreAnime valeur={brouillon.valeur} taillePx={taille.geant} couleur={c.accent} />
            <Texte variante="section" attenue>
              /{sur}
            </Texte>
            <View style={{ flex: 1 }} />
            <Segments libelle="Barème" surTeinte options={[20, 10].map((v) => ({ cle: v, libelle: `sur ${v}` }))} valeur={sur} onChange={changerSur} />
          </View>
          <Curseur
            libelle={`Note simulée en ${nom}`}
            texteValeur={`${moyenne(brouillon.valeur)} sur ${sur}`}
            valeur={brouillon.valeur}
            min={0}
            max={sur}
            pas={0.25}
            onChange={setNote}
          />
          <Texte variante="liste" style={{ color: c.accentEncre }}>
            Poids du devoir
          </Texte>
          <Segments libelle="Poids du devoir" plein surTeinte options={POIDS.map((v) => ({ cle: v, libelle: `×${formatCoef(v)}` }))} valeur={poids} onChange={setPoids} />
        </Panneau>
      </Entree>

      <Entree rang={3} style={{ gap: espace.s }}>
        <Panneau>
          <Ligne>
            <Texte variante="liste" style={{ flex: 1 }} numberOfLines={2}>
              {nom}
            </Texte>
            <Avant valeur={mAvant} />
            <ChiffreAnime valeur={mApres} taillePx={18} couleur={c.accent} />
          </Ligne>
          <Ligne dernier>
            <Texte variante="liste" style={{ flex: 1 }}>
              Moyenne générale prévue
            </Texte>
            <Avant valeur={avant.generale} />
            <ChiffreAnime valeur={apres.generale} taillePx={18} couleur={c.accent} />
          </Ligne>
        </Panneau>
        {apres.generale !== undefined && avant.generale !== undefined ? <Ecart valeur={apres.generale - avant.generale} suffixe="sur la moyenne générale" /> : null}
        <Bouton
          variante="secondaire"
          titre="Garder cette note et en ajouter une autre"
          onPress={() => {
            setGardees([...gardees, brouillon]);
            setNote(14);
          }}
        />
      </Entree>

      {gardees.length > 0 ? (
        <Section titre="Notes gardées" aide="Elles comptent dans le calcul ci-dessus, en plus de celle que tu règles." rang={4}>
          <Panneau>
            {gardees.map((h, i) => (
              <Ligne key={i} dernier={i === gardees.length - 1}>
                <Texte variante="liste" style={{ flex: 1 }} numberOfLines={1}>
                  {matieres.find((m) => m.code === h.matiereCode)?.libelle ?? h.matiereCode} · {moyenne(h.valeur)}/{h.noteSur} · ×{formatCoef(h.coef)}
                </Texte>
                <Bouton variante="texte" titre="Retirer" onPress={() => setGardees(gardees.filter((_, j) => j !== i))} />
              </Ligne>
            ))}
          </Panneau>
        </Section>
      ) : null}

      <Section titre={`Viser ${moyenne(objectif)}`} aide={`Avec un devoir sur ${sur}, poids ×${formatCoef(poids)}, en ${nom}.`} rang={5}>
        <Segments
          libelle="Objectif pour"
          options={[
            { cle: 'matiere' as const, libelle: nom },
            { cle: 'generale' as const, libelle: 'Moyenne générale' },
          ]}
          valeur={portee}
          onChange={setPortee}
        />
        <Curseur libelle="Moyenne visée" texteValeur={`${moyenne(objectif)} sur 20`} valeur={objectif} min={8} max={20} pas={0.5} onChange={setObjectif} />
        <Texte accessibilityLiveRegion="polite">
          {besoin === undefined
            ? `Pas atteignable avec un seul devoir de ce poids, même ${sur}/${sur}.`
            : besoin === 0
              ? 'Déjà atteint, quelle que soit la note.'
              : `Il te faut au moins ${moyenne(besoin)}/${sur} à ce devoir.`}
        </Texte>
      </Section>
      <Texte variante="petit" attenue>
        Notes hypothétiques : jamais envoyées ni enregistrées. Le calcul part de ta moyenne prévue.
      </Texte>
    </Ecran>
  );
}

/** La valeur d'avant, en gris, devant la nouvelle. */
function Avant({ valeur }: { valeur?: number }) {
  return (
    <Texte variante="liste" attenue style={{ fontVariant: ['tabular-nums'] }}>
      {valeur === undefined ? '—' : moyenne(valeur)} →
    </Texte>
  );
}

const styles = StyleSheet.create({
  phare: { flexDirection: 'row', alignItems: 'baseline', gap: espace.xs },
});
