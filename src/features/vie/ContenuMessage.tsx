// Contenu d'un message avec sa mise en forme : texte en fragments (gras, italique, souligné, surligné, liens),
// images intégrées au message en pleine largeur. Les adresses écrites dans le texte restent touchables.
import { useEffect, useState } from 'react';
import { Image, Linking, View } from 'react-native';

import type { Fragment } from '@/domain/types';
import { Texte } from '@/ui/composants';
import { espace, police, useCouleurs } from '@/ui/theme';

import { decouperLiens } from './liens';

type FragmentTexte = Extract<Fragment, { texte: string }>;
type Bloc = { image: string } | { textes: FragmentTexte[] };

// Les liens s'ouvrent dans le navigateur ou l'appli de mail du téléphone, pas dans Coef.
const ouvrir = (url: string) => void Linking.openURL(url).catch(() => undefined);

export function ContenuMessage({ fragments }: { fragments: Fragment[] }) {
  const c = useCouleurs();
  const blocs: Bloc[] = [];
  for (const f of fragments) {
    const dernier = blocs.at(-1);
    if ('image' in f) blocs.push({ image: f.image });
    else if (dernier && 'textes' in dernier) dernier.textes.push(f);
    else blocs.push({ textes: [f] });
  }
  return (
    <View style={{ gap: espace.m }}>
      {blocs.map((b, i) =>
        'image' in b ? (
          <ImageMessage key={i} uri={b.image} />
        ) : (
          <Texte key={i} selectable variante="liste">
            {b.textes.map((f, j) => {
              const style = {
                fontFamily: f.gras ? police.fort : undefined,
                fontStyle: f.italique ? ('italic' as const) : undefined,
                textDecorationLine: f.souligne || f.lien ? ('underline' as const) : undefined,
                // Surligné : le fond choisi par l'auteur, avec un texte sombre pour rester lisible dessus.
                ...(f.surligne ? { backgroundColor: f.surligne, color: '#111111' } : null),
                ...(f.lien ? { color: c.accent } : null),
              };
              if (f.lien) {
                return (
                  <Texte key={j} variante="liste" accessibilityRole="link" onPress={() => ouvrir(f.lien!)} style={style}>
                    {f.texte}
                  </Texte>
                );
              }
              return (
                <Texte key={j} variante="liste" style={style}>
                  {decouperLiens(f.texte).map((x, k) =>
                    x.url ? (
                      <Texte
                        key={k}
                        variante="liste"
                        accessibilityRole="link"
                        onPress={() => ouvrir(x.url!)}
                        style={{ color: c.accent, textDecorationLine: 'underline' }}>
                        {x.texte}
                      </Texte>
                    ) : (
                      x.texte
                    ),
                  )}
                </Texte>
              );
            })}
          </Texte>
        ),
      )}
    </View>
  );
}

/** Image intégrée au message (URI `data:`, rien à télécharger), à sa proportion une fois décodée. */
function ImageMessage({ uri }: { uri: string }) {
  const [ratio, setRatio] = useState(4 / 3);
  useEffect(() => {
    Image.getSize(
      uri,
      (l, h) => l > 0 && h > 0 && setRatio(l / h),
      () => undefined,
    );
  }, [uri]);
  return <Image source={{ uri }} accessibilityLabel="Image du message" resizeMode="contain" style={{ width: '100%', aspectRatio: ratio, borderRadius: 8 }} />;
}
