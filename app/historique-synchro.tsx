// Historique des vérifications en arrière-plan. Sa question : « Est-ce que la vérification tourne, et quand ? »
// Un peu caché (depuis Réglages › Notifications) : c'est un outil de diagnostic.
import { useEffect, useState } from 'react';
import { AppState, Platform, View } from 'react-native';

import { MODE_DEMO } from '@/demo';
import { lirePreference } from '@/storage/base';
import { type BilanFond, decrireBilan } from '@/sync/historique';
import { PREF_HISTORIQUE_FOND, testerSynchroFond } from '@/sync/tache';
import { Bouton, Ecran, EnTete, Ligne, Panneau, Pastille, Section, Texte } from '@/ui/composants';
import { heure, jourLong } from '@/ui/format';
import { useCouleurs } from '@/ui/theme';

const DELAI_TEST = 20;
const deux = (n: number) => String(n).padStart(2, '0');

/** Date ISO (UTC) → « AAAA-MM-JJ HH:MM » à l'heure du téléphone, la forme des formats de l'app. */
function local(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())} ${deux(d.getHours())}:${deux(d.getMinutes())}`;
}

/** « 1 h 05 », « 12 min » : l'écart avec la vérification précédente. */
function ecart(ms: number): string {
  const min = Math.round(ms / 60_000);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}

export default function HistoriqueSynchro() {
  const c = useCouleurs();
  const [historique, setHistorique] = useState<BilanFond[]>([]);
  const [info, setInfo] = useState('');
  useEffect(() => {
    const relire = () => !MODE_DEMO && void lirePreference<BilanFond[]>(PREF_HISTORIQUE_FOND, []).then(setHistorique, () => undefined);
    relire();
    const abonnement = AppState.addEventListener('change', (e) => e === 'active' && relire());
    return () => abonnement.remove();
  }, []);

  async function tester() {
    const ok = await testerSynchroFond(DELAI_TEST).catch(() => false);
    setInfo(
      ok
        ? `Quitte l’app maintenant (écran d’accueil du téléphone) : la vérification part dans ${DELAI_TEST} s, par le même chemin qu’à chaque heure, et une notification donnera son résultat.`
        : Platform.OS === 'android'
          ? 'Le test n’a pas pu être lancé.'
          : 'Le test n’est disponible que sur Android.',
    );
  }

  return (
    <Ecran>
      <EnTete titre="Vérifications" retour />
      <Section
        titre="Tester"
        aide="Lance une vraie vérification en arrière-plan, comme Android le fait chaque heure. Si l’app reste ouverte, Android la repousse : il faut la quitter.">
        <Bouton titre="Tester la vérification en arrière-plan" onPress={() => void tester()} />
        {info ? <Texte variante="petit">{info}</Texte> : null}
      </Section>

      <Section titre="Historique" aide="Les dernières vérifications, la plus récente en haut, avec l’écart depuis la précédente.">
        {historique.length === 0 ? (
          <Texte variante="liste" attenue>
            Aucune vérification enregistrée pour l’instant.
          </Texte>
        ) : (
          <Panneau>
            {historique.map((b, i) => {
              const precedente = historique[i + 1];
              return (
                <Ligne key={`${b.date}-${i}`} dernier={i === historique.length - 1}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Texte variante="liste" style={b.resultat === 'echec' ? { color: c.negatif } : undefined}>
                      {decrireBilan(b)}
                    </Texte>
                    <Texte variante="petit" attenue>
                      {jourLong(local(b.date).slice(0, 10))} à {heure(local(b.date))}
                      {precedente ? ` · ${ecart(Date.parse(b.date) - Date.parse(precedente.date))} après la précédente` : ''}
                    </Texte>
                  </View>
                  {b.test ? <Pastille texte="test" /> : null}
                </Ligne>
              );
            })}
          </Panneau>
        )}
      </Section>
    </Ecran>
  );
}
