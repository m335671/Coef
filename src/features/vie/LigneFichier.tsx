// Une pièce jointe ou un document : le toucher le télécharge chez ED et l'ouvre.
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ErreurED } from '@/api/ecoledirecte/erreurs';
import type { Fichier } from '@/domain/types';
import { Ligne, Texte } from '@/ui/composants';
import { jour } from '@/ui/format';
import { useCouleurs } from '@/ui/theme';

import { ouvrirFichier } from './fichiers';

export function LigneFichier({ f, dernier }: { f: Fichier; dernier?: boolean }) {
  const c = useCouleurs();
  /** 'ouverture' pendant le téléchargement, sinon le message d'erreur. */
  const [etat, setEtat] = useState<string>();
  const ouvrir = () => {
    if (etat === 'ouverture') return;
    setEtat('ouverture');
    ouvrirFichier(f).then(
      () => setEtat(undefined),
      (e: unknown) => setEtat(e instanceof ErreurED ? e.message : 'Le fichier n’a pas pu être ouvert.'),
    );
  };
  return (
    <Ligne dernier={dernier} onPress={ouvrir} libelleAccessible={`${f.libelle}${f.date ? `, ${jour(f.date)}` : ''}. Ouvrir`}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <Path d="M14 3v5h5M9 13h6M9 17h4" />
      </Svg>
      <View style={{ flex: 1 }}>
        <Texte variante="liste" numberOfLines={2}>
          {f.libelle}
        </Texte>
        {etat ? (
          <Texte variante="petit" style={{ color: etat === 'ouverture' ? c.accentEncre : c.negatif }}>
            {etat === 'ouverture' ? 'Téléchargement…' : etat}
          </Texte>
        ) : f.date ? (
          <Texte variante="petit" attenue>
            {jour(f.date)} {f.date.slice(0, 4)}
          </Texte>
        ) : null}
      </View>
    </Ligne>
  );
}
