import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WidgetLayout } from '../types';

export type LayoutProfile = 'compact' | 'standard' | 'ultrawide';
export type LayoutMode = 'auto' | 'manual';

export interface LayoutState {
  mode: LayoutMode;
  manualProfile: LayoutProfile;
  savedLayouts: Record<LayoutProfile, WidgetLayout[]>;
  setMode: (mode: LayoutMode) => void;
  setManualProfile: (profile: LayoutProfile) => void;
  saveLayout: (profile: LayoutProfile, layout: WidgetLayout[]) => void;
  ensureProfileLayout: (profile: LayoutProfile) => WidgetLayout[];
}

export const defaultLayouts: Record<LayoutProfile, WidgetLayout[]> = {
  compact: [
    { i: 'clock', x: 0, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
    { i: 'weather', x: 4, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
    { i: 'system', x: 8, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
    { i: 'systemPet', x: 0, y: 2, w: 4, h: 3, minW: 3, minH: 2 },
    { i: 'news', x: 4, y: 2, w: 8, h: 4, minW: 4, minH: 3 },
    { i: 'tasks', x: 0, y: 5, w: 6, h: 3, minW: 3, minH: 2 },
    { i: 'calendar', x: 6, y: 5, w: 6, h: 3, minW: 3, minH: 2 },
    { i: 'rabbitHole', x: 0, y: 8, w: 4, h: 2, minW: 2, minH: 2 },
    { i: 'ambientSound', x: 4, y: 8, w: 4, h: 2, minW: 2, minH: 2 },
    { i: 'upcoming', x: 8, y: 8, w: 4, h: 2, minW: 2, minH: 2 },
    { i: 'pomodoro', x: 0, y: 10, w: 4, h: 2, minW: 2, minH: 2 },
  ],
  standard: [
    { i: 'clock', x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
    { i: 'weather', x: 4, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
    { i: 'system', x: 0, y: 3, w: 3, h: 5, minW: 2, minH: 3 },
    { i: 'systemPet', x: 3, y: 3, w: 3, h: 5, minW: 2, minH: 3 },
    { i: 'news', x: 6, y: 0, w: 6, h: 6, minW: 4, minH: 4 },
    { i: 'tasks', x: 6, y: 6, w: 3, h: 4, minW: 2, minH: 2 },
    { i: 'calendar', x: 9, y: 6, w: 3, h: 4, minW: 2, minH: 2 },
    { i: 'rabbitHole', x: 0, y: 8, w: 3, h: 3, minW: 2, minH: 2 },
    { i: 'ambientSound', x: 3, y: 8, w: 3, h: 3, minW: 2, minH: 2 },
    { i: 'upcoming', x: 6, y: 10, w: 3, h: 3, minW: 2, minH: 2 },
    { i: 'pomodoro', x: 9, y: 10, w: 2, h: 2, minW: 2, minH: 2 },
  ],
  ultrawide: [
    { i: 'clock', x: 0, y: 0, w: 5, h: 3, minW: 3, minH: 2 },
    { i: 'weather', x: 5, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
    { i: 'calendar', x: 9, y: 0, w: 3, h: 3, minW: 3, minH: 2 },
    { i: 'system', x: 0, y: 3, w: 3, h: 6, minW: 3, minH: 3 },
    { i: 'tasks', x: 3, y: 3, w: 3, h: 6, minW: 3, minH: 3 },
    { i: 'systemPet', x: 6, y: 3, w: 4, h: 6, minW: 3, minH: 3 },
    { i: 'rabbitHole', x: 10, y: 3, w: 4, h: 3, minW: 3, minH: 2 },
    { i: 'ambientSound', x: 14, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
    { i: 'musicPlayer', x: 14, y: 3, w: 4, h: 3, minW: 3, minH: 2 },
    { i: 'news', x: 0, y: 9, w: 10, h: 6, minW: 6, minH: 4 },
    { i: 'upcoming', x: 10, y: 6, w: 4, h: 3, minW: 3, minH: 2 },
    { i: 'pomodoro', x: 14, y: 6, w: 2, h: 2, minW: 2, minH: 2 },
  ],
};

function ensureDefault(profile: LayoutProfile, existing?: WidgetLayout[]): WidgetLayout[] {
  if (existing && existing.length > 0) return existing;
  return defaultLayouts[profile] ?? [];
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      mode: 'auto',
      manualProfile: 'ultrawide',
      savedLayouts: {
        compact: defaultLayouts.compact,
        standard: defaultLayouts.standard,
        ultrawide: defaultLayouts.ultrawide,
      },
      setMode: (mode) => set({ mode }),
      setManualProfile: (profile) => set({ manualProfile: profile }),
      saveLayout: (profile, layout) =>
        set((state) => ({
          savedLayouts: { ...state.savedLayouts, [profile]: layout },
        })),
      ensureProfileLayout: (profile) => {
        const state = get();
        const layout = ensureDefault(profile, state.savedLayouts[profile]);
        if (state.savedLayouts[profile] !== layout) {
          set((s) => ({
            savedLayouts: { ...s.savedLayouts, [profile]: layout },
          }));
        }
        return layout;
      },
    }),
    {
      name: 'layout-profiles',
    }
  )
);

export const layoutBreakpoints = {
  compact: 0,
  standard: 1400,
  ultrawide: 2500,
};

export const layoutCols: Record<LayoutProfile, number> = {
  compact: 12,
  standard: 12,
  ultrawide: 18,
};

export const profileScale: Record<LayoutProfile, number> = {
  compact: 0.8, // clearly smaller on tight or manual-compact screens
  standard: 1,
  ultrawide: 1.12, // slightly larger on very wide screens
};

export const layoutTargetRows: Record<LayoutProfile, number> = {
  compact: 12,
  standard: 10,
  ultrawide: 9,
};
