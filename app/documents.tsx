// Documents. Sa question : « Où est mon bulletin, mon certificat de scolarité ? »
import { useEffect } from 'react';
import { View } from 'react-native';

import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { documentsDemo } from '@/demo/vie';
import type { DocumentEleve } from '@/domain/types';
import { useEleveActif } from '@/features/compte/eleves';
import { LigneFichier } from '@/features/vie/LigneFichier';
import { useDonnee, useDonneesED } from '@/features/vie/store';
import { Bouton, BoutonRond, Ecran, EnTete, IconeActualiser, Panneau, Section, Texte } from '@/ui/composants';
import { espace } from '@/ui/theme';

export default function Documents() {
  const [eleve] = useEleveActif();
  const cle = `documents:${eleve?.id}`;
  const etat = useDonnee<DocumentEleve[]>(cle);
  const charger = useDonneesED((s) => s.charger);
  const recharger = (forcer = false) => eleve && charger(cle, (cl) => cl.documents(eleve.id), documentsDemo, forcer);
  useEffect(() => void recharger(), [cle]); // eslint-disable-line react-hooks/exhaustive-deps

  const docs = etat?.valeur ?? [];
  const categories = [...new Set(docs.map((d) => d.categorie))];

  return (
    <Ecran>
      <EnTete
        titre="Documents"
        retour
        action={
          <BoutonRond libelle={etat?.chargement ? 'Chargement en cours' : 'Actualiser les documents'} onPress={() => !etat?.chargement && recharger(true)}>
            <View style={{ opacity: etat?.chargement ? 0.35 : 1 }}>
              <IconeActualiser />
            </View>
          </BoutonRond>
        }
      />
      {etat?.erreur ? (
        <View style={{ gap: espace.xs }}>
          <Texte variante="liste">{etat.erreur instanceof ErreurED ? etat.erreur.message : 'Les documents n’ont pas pu être chargés.'}</Texte>
          <Bouton variante="texte" titre="Réessayer" onPress={() => recharger(true)} />
        </View>
      ) : null}
      {!etat?.valeur ? (
        etat?.chargement === false ? null : (
          <Texte variante="liste" attenue>
            Chargement des documents…
          </Texte>
        )
      ) : docs.length === 0 ? (
        <Texte variante="liste" attenue>
          Aucun document pour l’instant.
        </Texte>
      ) : (
        categories.map((cat, i) => {
          const liste = docs.filter((d) => d.categorie === cat);
          return (
            <Section key={cat} titre={cat} rang={1 + i}>
              <Panneau>
                {liste.map((d, j) => (
                  <LigneFichier key={`${d.type}-${d.id}`} f={d} dernier={j === liste.length - 1} />
                ))}
              </Panneau>
            </Section>
          );
        })
      )}
      <Texte variante="petit" attenue>
        Un document s’ouvre avec le visualiseur du téléphone. Seul le dernier ouvert reste dans le cache de Coef ; « Tout effacer » le supprime.
      </Texte>
    </Ecran>
  );
}
