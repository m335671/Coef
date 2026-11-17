// L'élève affiché, partagé par tous les onglets (un compte parent peut en avoir plusieurs).
import { create } from 'zustand';

import { MODE_DEMO } from '@/demo';
import { ELEVE_DEMO } from '@/demo/notes';
import type { Eleve } from '@/domain/types';

import { useCompte } from './store';

export function useEleves(): Eleve[] {
  const profils = useCompte((s) => s.profils);
  return MODE_DEMO ? [ELEVE_DEMO] : profils.flatMap((p) => p.eleves);
}

const useChoix = create<{ id?: string; choisir: (id: string) => void }>((set) => ({ choisir: (id) => set({ id }) }));

/** L'élève choisi, sinon le premier ; et de quoi en changer. */
export function useEleveActif(): [Eleve | undefined, (id: string) => void] {
  const eleves = useEleves();
  const { id, choisir } = useChoix();
  return [eleves.find((e) => e.id === id) ?? eleves[0], choisir];
}
