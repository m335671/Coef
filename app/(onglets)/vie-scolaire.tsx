// Vie scolaire. Sa question : « Où j'en suis côté absences, retards et sanctions, et qu'est-ce qui reste à justifier ? »
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { vieScolaireDemo } from '@/demo/vie';
import type { EvenementVieScolaire, TypeEvenement } from '@/domain/types';
import { useEleveActif, useEleves } from '@/features/compte/eleves';
import { useDonnee, useDonneesED } from '@/features/vie/store';
import { Bouton, Ecran, EnTete, Entree, Ligne, Panneau, Pastille, Section, Segments, Texte } from '@/ui/composants';
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

  useEffect(() => {
    if (eleve) void charger(cle, (cl) => cl.vieScolaire(eleve.id), vieScolaireDemo);
  }, [cle, eleve, charger]);

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
      <EnTete titre="Vie scolaire" />
      {eleves.length > 1 && eleve ? (
        <Entree rang={1}>
          <Segments libelle="Élève" options={eleves.map((e) => ({ cle: e.id, libelle: e.prenom }))} valeur={eleve.id} onChange={choisirEleve} />
        </Entree>
      ) : null}
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
          <Entree rang={1} style={styles.tuiles}>
            {tuiles.map((t) => (
              <View key={t.titre} style={[styles.tuile, { backgroundColor: c.teinte50 }]} accessible accessibilityLabel={`${t.n} ${t.titre.toLowerCase()}`}>
                <Texte style={{ fontFamily: police.gras, fontSize: 30, lineHeight: 34, color: t.n ? c.accent : c.attenue, fontVariant: ['tabular-nums'] }}>{t.n}</Texte>
                <Texte variante="petit" style={{ color: c.accentEncre }}>
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
                        e.justifie ? <Pastille texte="Justifié" /> : <Pastille texte="À justifier" fond={c.surface} encre={c.negatif} />
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
  tuiles: { flexDirection: 'row', flexWrap: 'wrap', gap: espace.s },
  tuile: { flexGrow: 1, flexBasis: '45%', borderRadius: rayon.carte, padding: espace.m, gap: 2 },
});
