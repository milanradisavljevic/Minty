import type { WidgetLayout } from '../types';

const STORAGE_KEY = 'mintyLayouts';

export type SavedLayout = { name: string; data: WidgetLayout[] };

function readSavedLayouts(): SavedLayout[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (!entry?.name || !Array.isArray(entry.data)) return null;
        return {
          name: String(entry.name),
          data: entry.data as WidgetLayout[],
        };
      })
      .filter(Boolean) as SavedLayout[];
  } catch (error) {
    console.warn('[layoutStorage] Failed to parse saved layouts', error);
    return [];
  }
}

function persistLayouts(layouts: SavedLayout[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
}

function normalizeLayout(layout: WidgetLayout[]): WidgetLayout[] {
  return layout.map((item) => ({
    i: item.i,
    x: Number.isFinite(item.x) ? item.x : 0,
    y: Number.isFinite(item.y) ? item.y : 0,
    w: Number.isFinite(item.w) ? item.w : 1,
    h: Number.isFinite(item.h) ? item.h : 1,
    ...(item.minW !== undefined ? { minW: item.minW } : {}),
    ...(item.minH !== undefined ? { minH: item.minH } : {}),
    ...(item.maxW !== undefined ? { maxW: item.maxW } : {}),
    ...(item.maxH !== undefined ? { maxH: item.maxH } : {}),
    ...(item.static !== undefined ? { static: item.static } : {}),
  }));
}

export function listSavedLayouts(): SavedLayout[] {
  return readSavedLayouts();
}

export function saveLayout(name: string, layout: WidgetLayout[]): SavedLayout[] {
  const trimmedName = name.trim() || 'Unbenanntes Layout';
  const normalized = normalizeLayout(layout);
  const existing = readSavedLayouts();
  const index = existing.findIndex((entry) => entry.name === trimmedName);

  if (index >= 0) {
    existing[index] = { name: trimmedName, data: normalized };
  } else {
    existing.push({ name: trimmedName, data: normalized });
  }

  persistLayouts(existing);
  return existing;
}

export function loadLayout(name: string): WidgetLayout[] | null {
  const trimmedName = name.trim();
  if (!trimmedName) return null;
  const existing = readSavedLayouts();
  const found = existing.find((entry) => entry.name === trimmedName);
  return found ? normalizeLayout(found.data) : null;
}

export function deleteLayout(name: string): SavedLayout[] {
  const trimmedName = name.trim();
  if (!trimmedName) return readSavedLayouts();
  const existing = readSavedLayouts().filter((entry) => entry.name !== trimmedName);
  persistLayouts(existing);
  return existing;
}
