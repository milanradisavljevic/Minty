import { create } from 'zustand';

interface AmbientState {
  activeSounds: Set<string>;
  addSound: (id: string) => void;
  removeSound: (id: string) => void;
}

export const useAmbientStore = create<AmbientState>((set) => ({
  activeSounds: new Set(),
  addSound: (id) =>
    set((state) => {
      const newSet = new Set(state.activeSounds);
      newSet.add(id);
      return { activeSounds: newSet };
    }),
  removeSound: (id) =>
    set((state) => {
      const newSet = new Set(state.activeSounds);
      newSet.delete(id);
      return { activeSounds: newSet };
    }),
}));
