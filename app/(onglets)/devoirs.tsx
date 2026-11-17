// Devoirs. Sa question : « Qu'est-ce que j'ai à faire, pour quand, et qu'est-ce qui est une interro ? »
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { devoirsDemo } from '@/demo/vie';
import type { Devoir } from '@/domain/types';
import { useEleveActif, useEleves } from '@/features/compte/eleves';
import { marquerDevoir, useDonnee, useDonneesED } from '@/features/vie/store';
import { Bouton, Coche, Ecran, EnTete, Entree, Pastille, Presse, Section, Segments, Texte } from '@/ui/composants';
import { ajouterJours, iso, jourLong } from '@/ui/format';
import { espace, rayon, useCouleurs } from '@/ui/theme';

export default function Devoirs() {
  const c = useCouleurs();
  const eleves = useEleves();
  const [eleve, choisirEleve] = useEleveActif();
  const cle = `devoirs:${eleve?.id}`;
  const etat = useDonnee<Devoir[]>(cle);
  const charger = useDonneesED((s) => s.charger);

  useEffect(() => {
    if (eleve) void charger(cle, (cl) => cl.devoirs(eleve.id), devoirsDemo);
  }, [cle, eleve, charger]);

  const aujourdhui = iso(new Date());
  const demain = ajouterJours(aujourdhui, 1);
  const tous = etat?.valeur ?? [];
  const [voirPasses, setVoirPasses] = useState(false);
  const devoirs = tous.filter((d) => d.pour >= aujourdhui);
  const passes = tous.filter((d) => d.pour < aujourdhui);
  const grouper = (l: Devoir[]) => [...new Set(l.map((d) => d.pour))].map((pour) => ({ pour, liste: l.filter((d) => d.pour === pour) }));
  const parJour = [...grouper(devoirs), ...(voirPasses ? grouper(passes).reverse() : [])];
  const restants = devoirs.filter((d) => !d.effectue).length;
  const [erreurCoche, setErreurCoche] = useState<string>();
  const cocher = (id: string, fait: boolean) => {
    setErreurCoche(undefined);
    marquerDevoir(eleve!.id, id, fait).catch(() => setErreurCoche('ED n’a pas accepté la coche : le devoir est remis comme avant.'));
  };

  return (
    <Ecran>
      <EnTete titre="Devoirs" />
      {eleves.length > 1 && eleve ? (
        <Entree rang={1}>
          <Segments libelle="Élève" options={eleves.map((e) => ({ cle: e.id, libelle: e.prenom }))} valeur={eleve.id} onChange={choisirEleve} />
        </Entree>
      ) : null}
      {etat?.valeur ? (
        <Entree rang={1}>
          <Texte variante="liste" attenue>
            {restants === 0 ? 'Tout est fait. ' : `${restants} devoir${restants > 1 ? 's' : ''} à faire. `}
            {devoirs.some((d) => d.interrogation) ? 'Les interrogations sont signalées.' : ''}
          </Texte>
        </Entree>
      ) : null}
      {erreurCoche ? (
        <Texte variante="liste" style={{ color: c.negatif }}>
          {erreurCoche}
        </Texte>
      ) : null}
      {etat?.erreur ? (
        <View style={{ gap: espace.xs }}>
          <Texte variante="liste">{etat.erreur instanceof ErreurED ? etat.erreur.message : 'Les devoirs n’ont pas pu être chargés.'}</Texte>
          <Bouton variante="texte" titre="Réessayer" onPress={() => eleve && charger(cle, (cl) => cl.devoirs(eleve.id), devoirsDemo, true)} />
        </View>
      ) : null}
      {!etat?.valeur && etat?.chargement !== false ? (
        <Texte variante="liste" attenue>
          Chargement du cahier de textes…
        </Texte>
      ) : (
        <>
          {devoirs.length === 0 ? (
            <Texte variante="liste" attenue>
              Aucun devoir à venir.
            </Texte>
          ) : null}
          {parJour.map(({ pour, liste }, i) => (
            <Section
              key={pour}
              titre={
                pour === aujourdhui ? 'Pour aujourd’hui' : pour === demain ? 'Pour demain' : `${pour < aujourdhui ? 'Était pour' : 'Pour'} ${jourLong(pour)}`
              }
              rang={2 + i}>
              <View style={{ gap: espace.s }}>
                {liste.map((d) => {
                  return (
                    <Presse
                      key={d.id}
                      onPress={() =>
                        router.push({
                          pathname: '/devoir/[id]',
                          params: { id: d.id, eleve: eleve!.id },
                        })
                      }
                      libelleAccessible={`${d.matiere}${d.interrogation ? ', interrogation' : ''}${d.effectue ? ', fait' : ''}. ${d.contenu ?? ''}. Ouvrir le détail`}
                      style={[
                        styles.carte,
                        {
                          backgroundColor: d.effectue ? c.surface : c.teinte50,
                          borderColor: d.effectue ? c.bord : 'transparent',
                        },
                      ]}>
                      <View style={styles.rangee}>
                        <Texte
                          variante="liste"
                          moyen
                          numberOfLines={1}
                          style={{
                            flex: 1,
                            color: d.effectue ? c.attenue : c.texte,
                          }}>
                          {d.matiere}
                        </Texte>
                        {d.interrogation ? <Pastille texte="Interro" fond={c.surface} encre={c.negatif} /> : null}
                        <Coche libelle="Fait" coche={d.effectue} onChange={(v) => cocher(d.id, v)} />
                      </View>
                      {d.contenu ? (
                        <Texte variante="liste" numberOfLines={3} style={{ color: d.effectue ? c.attenue : c.texte }}>
                          {d.contenu}
                        </Texte>
                      ) : (
                        <Texte variante="petit" attenue>
                          Consigne pas encore chargée.
                        </Texte>
                      )}
                    </Presse>
                  );
                })}
              </View>
            </Section>
          ))}
          {passes.length > 0 ? (
            <Bouton
              variante="texte"
              titre={voirPasses ? 'Masquer les jours passés' : `Voir les jours passés (${passes.length} devoir${passes.length > 1 ? 's' : ''})`}
              onPress={() => setVoirPasses(!voirPasses)}
            />
          ) : null}
        </>
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  carte: {
    borderRadius: rayon.carte,
    borderWidth: 1,
    padding: espace.m,
    gap: espace.xs,
  },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
});
