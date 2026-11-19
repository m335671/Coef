// Courbes. Sa question : « Comment mes moyennes ont-elles bougé ? » La générale, la classe, les matières qu'on coche.
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { clesMatiere } from '@/features/notes/familles';
import { useNotes } from '@/features/notes/store';
import { evolutions, groupesPeriodes, periodeParDefaut, periodesAffichees } from '@/features/notes/vue';
import { COULEURS_MATIERE, useApparence, useSombre } from '@/ui/apparence';
import { Bouton, Coche, Deroulant, Ecran, EnTete, Entree, Panneau, Section, Texte } from '@/ui/composants';
import { ecart, jour, moyenne } from '@/ui/format';
import { Graphique, type Serie } from '@/ui/graphiques';
import { matiereDepuis } from '@/ui/palette';
import { espace, police, taille, useCouleurs } from '@/ui/theme';

export default function Courbes() {
  const c = useCouleurs();
  const sombre = useSombre();
  const choixApparence = useApparence((s) => s.matieres);
  const params = useLocalSearchParams<{ eleve: string; periode?: string }>();
  const instantane = useNotes((s) => s.eleves[params.eleve]?.instantane);
  const charger = useNotes((s) => s.charger);
  // Ouvert directement (lien, aperçu) : les notes viennent du cache, comme sur l'onglet Notes.
  useEffect(() => {
    if (!instantane && params.eleve) void charger(params.eleve);
  }, [instantane, params.eleve, charger]);
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const periodes = instantane ? periodesAffichees(instantane.donnees) : [];
  const [code, setCode] = useState(params.periode);
  const periode = periodes.find((p) => p.code === code) ?? (instantane ? periodeParDefaut(instantane.donnees, aujourdhui) : undefined);
  const evo = instantane && periode ? evolutions(instantane.donnees, periode) : undefined; // mémorisé par le React Compiler

  const [generale, setGenerale] = useState(true);
  const [classe, setClasse] = useState(true);
  const [cochees, setCochees] = useState<string[]>([]);

  if (!instantane || !periode || !evo) {
    return (
      <Ecran>
        <EnTete titre="Courbes" retour />
        <Texte variante="liste" attenue>
          Les courbes apparaîtront après la première synchronisation des notes.
        </Texte>
      </Ecran>
    );
  }

  // Une couleur distincte par matière (celles d'une même famille se ressemblent trop pour des courbes voisines),
  // sauf si l'élève en a choisi une dans Apparence.
  const matieres = periode.matieres
    .filter((m) => !m.sousCode && (evo.matieres[m.code]?.length ?? 0) > 0)
    .map((m, i) => {
      const choisie = clesMatiere(m.code, m.libelle)
        .map((k) => choixApparence[k])
        .find(Boolean);
      return { ...m, couleur: matiereDepuis(choisie ?? COULEURS_MATIERE[i % COULEURS_MATIERE.length]!.couleur, sombre).trait };
    });

  const debut = periode.debut;
  const fin = periode.fin < aujourdhui ? periode.fin : aujourdhui;
  const series: Serie[] = [];
  if (generale && evo.generale.length > 0) {
    series.push({
      cle: 'generale',
      libelle: 'Moyenne générale',
      couleur: c.accent,
      points: evo.generale.map((p) => ({ date: p.date, valeur: p.moyenne })),
      classe: classe ? periode.classeGenerale?.moyenne : undefined,
    });
  }
  for (const m of matieres.filter((x) => cochees.includes(x.code))) {
    series.push({
      cle: m.code,
      libelle: m.libelle,
      couleur: m.couleur,
      points: evo.matieres[m.code]!.map((p) => ({ date: p.date, valeur: p.moyenne })),
      classe: classe ? m.classe?.moyenne : undefined,
    });
  }

  // Le constat de l'écran : où en est la générale, et de combien elle a bougé depuis la première note.
  const premiere = evo.generale[0];
  const derniere = evo.generale.at(-1);
  const resume = series.map((s) => `${s.libelle} ${moyenne(s.points.at(-1)!.valeur)}`).join(', ');
  const basculer = (code: string, v: boolean) => setCochees((l) => (v ? [...l, code] : l.filter((x) => x !== code)));

  return (
    <Ecran>
      <EnTete titre="Courbes" retour />
      {periodes.length > 1 ? (
        <Entree rang={1}>
          <Deroulant libelle="Période" groupes={groupesPeriodes(periodes)} valeur={periode.code} onChange={setCode} />
        </Entree>
      ) : null}

      <Entree rang={2}>
        <Panneau style={{ paddingVertical: espace.m, gap: espace.m }}>
          {premiere && derniere ? (
            <View>
              <Texte variante="petit" attenue>
                Moyenne générale prévue
              </Texte>
              <View style={styles.constat}>
                <Texte style={{ fontFamily: police.gras, fontSize: taille.chiffre, color: c.texte, fontVariant: ['tabular-nums'] }}>
                  {moyenne(derniere.moyenne)}
                </Texte>
                <Texte variante="petit" attenue style={{ flex: 1 }}>
                  {evo.generale.length > 1
                    ? `${ecart(derniere.moyenne - premiere.moyenne)} depuis la première note, le ${jour(premiere.date)}`
                    : `depuis la première note, le ${jour(premiere.date)}`}
                </Texte>
              </View>
            </View>
          ) : null}
          {series.length > 0 ? (
            <Graphique
              series={series}
              debut={debut}
              fin={fin}
              libelle={`Évolution des moyennes, ${periode.libelle}. Dernières valeurs : ${resume || 'aucune'}.`}
            />
          ) : (
            <View style={{ height: 220, justifyContent: 'center' }}>
              <Texte variante="liste" attenue style={{ textAlign: 'center' }}>
                Coche une courbe ci-dessous pour l’afficher.
              </Texte>
            </View>
          )}
        </Panneau>
      </Entree>

      <Section titre="Afficher" rang={3} aide="ED ne publie qu’une moyenne de classe par période : elle est tracée en pointillés, de la couleur de sa courbe.">
        <Coche libelle="Moyenne générale" coche={generale} onChange={setGenerale} couleur={c.accent} />
        <Coche libelle="Moyennes de la classe (pointillés)" coche={classe} onChange={setClasse} couleur={c.attenue} />
      </Section>

      <Section
        titre="Matières"
        rang={4}
        action={
          <Bouton
            variante="texte"
            titre={cochees.length > 0 ? 'Tout décocher' : 'Tout cocher'}
            onPress={() => setCochees(cochees.length > 0 ? [] : matieres.map((m) => m.code))}
          />
        }>
        {matieres.map((m) => (
          <Coche key={m.code} libelle={m.libelle} coche={cochees.includes(m.code)} onChange={(v) => basculer(m.code, v)} couleur={m.couleur} />
        ))}
      </Section>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  constat: { flexDirection: 'row', alignItems: 'baseline', gap: espace.s },
});
