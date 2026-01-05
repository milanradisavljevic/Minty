import { create } from 'zustand';
import type { LayoutPreset, WidgetLayout } from '../types';

interface LayoutPresetsState {
  presets: LayoutPreset[];
  loading: boolean;
  error: string | null;
  screenKey: string;
  setScreenKey: (screenKey: string) => void;
  loadPresets: (screenKey: string) => Promise<void>;
  savePreset: (name: string, screenKey: string, layout: WidgetLayout[], isDefault?: boolean) => Promise<LayoutPreset | null>;
  updatePreset: (id: string, layout: WidgetLayout[], name?: string, isDefault?: boolean) => Promise<LayoutPreset | null>;
  deletePreset: (id: string) => Promise<boolean>;
  setDefault: (id: string) => Promise<LayoutPreset | null>;
}

function serializeLayout(layout: WidgetLayout[]): string {
  return JSON.stringify(layout);
}

export const useLayoutPresetsStore = create<LayoutPresetsState>((set, get) => ({
  presets: [],
  loading: false,
  error: null,
  screenKey: '',
  setScreenKey: (screenKey) => set({ screenKey }),
  loadPresets: async (screenKey: string) => {
    set({ loading: true, error: null, screenKey });
    try {
      const res = await fetch(`/api/layouts?screenKey=${encodeURIComponent(screenKey)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set({ presets: data.presets || [], loading: false });
    } catch (error) {
      console.error('Failed to load layout presets', error);
      set({ error: 'Presets konnten nicht geladen werden', loading: false });
    }
  },
  savePreset: async (name, screenKey, layout, isDefault = false) => {
    try {
      const res = await fetch('/api/layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, screenKey, layoutJson: serializeLayout(layout), isDefault }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const next = [...get().presets, data.preset as LayoutPreset];
      set({ presets: next });
      return data.preset as LayoutPreset;
    } catch (error) {
      console.error('Failed to save layout preset', error);
      set({ error: 'Preset konnte nicht gespeichert werden' });
      return null;
    }
  },
  updatePreset: async (id, layout, name, isDefault) => {
    try {
      const res = await fetch(`/api/layouts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, layoutJson: serializeLayout(layout), isDefault }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set({
        presets: get().presets.map((p) => (p.id === id ? (data.preset as LayoutPreset) : p)),
      });
      return data.preset as LayoutPreset;
    } catch (error) {
      console.error('Failed to update layout preset', error);
      set({ error: 'Preset konnte nicht aktualisiert werden' });
      return null;
    }
  },
  deletePreset: async (id) => {
    try {
      const res = await fetch(`/api/layouts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      set({ presets: get().presets.filter((p) => p.id !== id) });
      return true;
    } catch (error) {
      console.error('Failed to delete layout preset', error);
      set({ error: 'Preset konnte nicht gelöscht werden' });
      return false;
    }
  },
  setDefault: async (id) => {
    try {
      const res = await fetch(`/api/layouts/${id}/set-default`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const updated = data.preset as LayoutPreset;
      set({
        presets: get().presets.map((p) =>
          p.screenKey === updated.screenKey ? { ...p, isDefault: p.id === updated.id } : p
        ),
      });
      return updated;
    } catch (error) {
      console.error('Failed to set default layout preset', error);
      set({ error: 'Standard-Preset konnte nicht gesetzt werden' });
      return null;
    }
  },
}));
