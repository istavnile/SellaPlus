import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type PosMode = 'touch' | 'scanner';

interface PosModeState {
  mode: PosMode;
  setMode: (mode: PosMode) => void;
}

export const usePosModeStore = create<PosModeState>()(
  persist(
    (set) => ({
      mode: 'touch',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'sellaplus-pos-mode' },
  ),
);
