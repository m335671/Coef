// Simulateur. Ses questions : « Si j'ai telle note, où va ma moyenne ? » et « Quelle note pour atteindre X ? »
// Impact instantané : chaque frappe relance le moteur (pur, quelques millisecondes).
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { calculer } from '@/domain/moyennes/moteur';
import { type Cible, type NoteHypothetique, noteNecessaire, simuler } from '@/domain/moyennes/simulateur';
import { useNotes } from '@/features/notes/store';
import { Bouton, Champ, Chiffre, Ecart, Ecran, EnTete, Ligne, Panneau, Section, Segments, Texte } from '@/ui/composants';
import { coef as formatCoef, lireNombre, moyenne } from '@/ui/format';
import { espace } from '@/ui/theme';

const COEFS = [0.5, 1, 2, 3, 4];

export default function Simulateur() {
  const params = useLocalSearchParams<{ periode: string; eleve: string; code?: string }>();
  const instantane = useNotes((s) => s.eleves[params.eleve]?.instantane);
  const d = instantane?.donnees;
  const p = d?.periodes.find((x) => x.code === params.periode);
  const matieres = p?.matieres.filter((m) => !m.sousCode) ?? [];

  const [code, setCode] = useState(params.code ?? matieres[0]?.code ?? '');
  const [saisie, setSaisie] = useState('');
  const [sur, setSur] = useState(20);
  const [coef, setCoef] = useState(1);
  const [hypotheses, setHypotheses] = useState<NoteHypothetique[]>([]);
  const [objectif, setObjectif] = useState('');
  const [portee, setPortee] = useState<'matiere' | 'generale'>('matiere');

  const valeur = lireNombre(saisie);
  const valide = valeur !== undefined && valeur <= sur;
  const brouillon: NoteHypothetique[] = valide ? [{ matiereCode: code, valeur, noteSur: sur, coef }] : [];
  const toutes = [...hypotheses, ...brouillon];

  const avant = d && p ? calculer(p, d.notes, d.periodes, { parametrage: d.parametrage }) : undefined;
  const apres = d && p ? simuler(p, d.notes, d.periodes, toutes, { parametrage: d.parametrage }) : undefined;

  if (!d || !p || !avant || !apres) {
    return (
      <Ecran>
        <EnTete titre="Simulateur" action={<Bouton variante="texte" titre="Fermer" onPress={() => router.back()} />} />
        <Texte>Synchronise d’abord tes notes.</Texte>
      </Ecran>
    );
  }

  const nom = matieres.find((m) => m.code === code)?.libelle ?? code;
  const mAvant = avant.matieres.find((m) => m.code === code)?.moyenne;
  const mApres = apres.matieres.find((m) => m.code === code)?.moyenne;
  const cibleVal = lireNombre(objectif);
  const cible: Cible = portee === 'generale' ? { portee: 'generale' } : { portee: 'matiere', code };
  const necessaire =
    cibleVal !== undefined && cibleVal <= 20
      ? noteNecessaire(p, d.notes, d.periodes, { matiereCode: code, noteSur: sur, coef }, cible, cibleVal, { parametrage: d.parametrage })
      : null;

  return (
    <Ecran>
      <EnTete titre="Simulateur" action={<Bouton variante="texte" titre="Fermer" onPress={() => router.back()} />} />
      <Texte variante="liste" attenue>
        {p.libelle} · notes hypothétiques, jamais envoyées ni enregistrées.
      </Texte>

      <Section titre="Une note de plus">
        <Texte variante="liste" moyen>
          Matière :{' '}
          <Texte variante="liste" attenue>
            {nom}
          </Texte>
        </Texte>
        <Segments libelle="Matière" options={matieres.map((m) => ({ cle: m.code, libelle: m.libelle }))} valeur={code} onChange={setCode} />
        <View style={styles.rang}>
          <View style={{ flex: 1 }}>
            <Champ
              libelle="Note"
              value={saisie}
              onChangeText={setSaisie}
              keyboardType="decimal-pad"
              placeholder="ex. 14,5"
              accessibilityHint={`Sur ${sur}`}
            />
          </View>
          <View style={{ gap: espace.s }}>
            <Texte variante="liste" moyen>
              Sur
            </Texte>
            <Segments libelle="Barème" options={[20, 10].map((v) => ({ cle: v, libelle: String(v) }))} valeur={sur} onChange={setSur} />
          </View>
        </View>
        {saisie && !valide ? (
          <Texte variante="petit">
            Une note entre 0 et {sur}, avec une virgule si besoin.
          </Texte>
        ) : null}
        <View style={{ gap: espace.s }}>
          <Texte variante="liste" moyen>
            Coefficient
          </Texte>
          <Segments libelle="Coefficient" options={COEFS.map((v) => ({ cle: v, libelle: formatCoef(v) }))} valeur={coef} onChange={setCoef} />
        </View>

        <Panneau>
          <Ligne>
            <Texte variante="liste" style={{ flex: 1 }} numberOfLines={1}>
              {nom}
            </Texte>
            <Avant valeur={mAvant} />
            <Chiffre valeur={mApres} donnee />
          </Ligne>
          <Ligne dernier>
            <Texte variante="liste" style={{ flex: 1 }}>
              Moyenne générale prévue
            </Texte>
            <Avant valeur={avant.generale} />
            <Chiffre valeur={apres.generale} donnee />
          </Ligne>
        </Panneau>
        {apres.generale !== undefined && avant.generale !== undefined && toutes.length > 0 ? (
          <Ecart valeur={apres.generale - avant.generale} suffixe="sur la moyenne générale" />
        ) : null}
        <Bouton
          variante="secondaire"
          titre="Garder cette note et en ajouter une autre"
          desactive={!valide}
          onPress={() => {
            setHypotheses([...hypotheses, ...brouillon]);
            setSaisie('');
          }}
        />
      </Section>

      {hypotheses.length > 0 ? (
        <Section titre="Notes gardées">
          <Panneau>
            {hypotheses.map((h, i) => (
              <Ligne key={i} dernier={i === hypotheses.length - 1}>
                <Texte variante="liste" style={{ flex: 1 }} numberOfLines={1}>
                  {matieres.find((m) => m.code === h.matiereCode)?.libelle ?? h.matiereCode} · {String(h.valeur).replace('.', ',')}/{h.noteSur} · coef{' '}
                  {formatCoef(h.coef)}
                </Texte>
                <Bouton variante="texte" titre="Retirer" onPress={() => setHypotheses(hypotheses.filter((_, j) => j !== i))} />
              </Ligne>
            ))}
          </Panneau>
        </Section>
      ) : null}

      <Section titre="Quelle note pour atteindre… ?" aide={`Avec une note sur ${sur}, coef ${formatCoef(coef)}, en ${nom}.`}>
        <Segments
          libelle="Objectif pour"
          options={[
            { cle: 'matiere' as const, libelle: nom },
            { cle: 'generale' as const, libelle: 'La moyenne générale' },
          ]}
          valeur={portee}
          onChange={setPortee}
        />
        <Champ libelle="Moyenne visée" value={objectif} onChangeText={setObjectif} keyboardType="decimal-pad" placeholder="ex. 14" />
        {necessaire !== null ? (
          <Texte accessibilityLiveRegion="polite">
            {necessaire === undefined
              ? `Impossible avec une seule note, même ${sur}/${sur}.`
              : necessaire === 0
                ? 'Déjà atteint, quelle que soit la note.'
                : `Il te faut au moins ${String(necessaire).replace('.', ',')}/${sur}.`}
          </Texte>
        ) : null}
      </Section>
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
  rang: { flexDirection: 'row', gap: espace.m, alignItems: 'flex-end' },
});
