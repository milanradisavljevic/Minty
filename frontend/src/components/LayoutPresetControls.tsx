import { useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutPreset, WidgetLayout } from '../types';
import { useLayoutPresetsStore } from '../stores/layoutPresetsStore';
import { listSavedLayouts, loadLayout as loadSavedLayout, saveLayout as saveLocalLayout, type SavedLayout } from '../utils/layoutStorage';
import { toast } from 'react-toastify';

interface Props {
  screenKey: string;
  currentLayout: WidgetLayout[];
  onApplyLayout: (layout: WidgetLayout[], presetId?: string) => void;
}

function parsePresetLayout(preset: LayoutPreset): WidgetLayout[] | null {
  try {
    const parsed = JSON.parse(preset.layoutJson);
    if (Array.isArray(parsed)) return parsed as WidgetLayout[];
    if (parsed && typeof parsed === 'object') {
      const nestedLayout = (parsed as { layout?: unknown }).layout;
      if (Array.isArray(nestedLayout)) {
        return nestedLayout as WidgetLayout[];
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to parse preset layout', error);
    return null;
  }
}

export function LayoutPresetControls({ screenKey, currentLayout, onApplyLayout }: Props) {
  const presets = useLayoutPresetsStore((state) => state.presets);
  const loadPresets = useLayoutPresetsStore((state) => state.loadPresets);
  const savePreset = useLayoutPresetsStore((state) => state.savePreset);
  const updatePreset = useLayoutPresetsStore((state) => state.updatePreset);
  const deletePreset = useLayoutPresetsStore((state) => state.deletePreset);
  const setDefault = useLayoutPresetsStore((state) => state.setDefault);
  const loading = useLayoutPresetsStore((state) => state.loading);

  const [selectedId, setSelectedId] = useState<string>('');
  const [nameInput, setNameInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appliedPresetRef = useRef<string | null>(null);
  const [localLayouts, setLocalLayouts] = useState<SavedLayout[]>(() => listSavedLayouts());
  const [localNameInput, setLocalNameInput] = useState('');
  const [selectedLocalName, setSelectedLocalName] = useState('');

  useEffect(() => {
    loadPresets(screenKey);
    setSelectedId('');
    appliedPresetRef.current = null;
  }, [screenKey, loadPresets]);

  const currentPresets = useMemo(
    () => presets.filter((p) => p.screenKey === screenKey),
    [presets, screenKey]
  );

  // Auto-apply default once per screen key
  useEffect(() => {
    const defaultPreset = currentPresets.find((p) => p.isDefault);
    if (!defaultPreset || appliedPresetRef.current === defaultPreset.id) return;
    const parsed = parsePresetLayout(defaultPreset);
    if (parsed) {
      onApplyLayout(parsed, defaultPreset.id);
      appliedPresetRef.current = defaultPreset.id;
      setSelectedId(defaultPreset.id);
    }
  }, [currentPresets, onApplyLayout]);

  const handleApply = () => {
    const preset = currentPresets.find((p) => p.id === selectedId);
    if (!preset) return;
    const parsed = parsePresetLayout(preset);
    if (!parsed) {
      setError('Layout konnte nicht geladen werden');
      return;
    }
    setError(null);
    appliedPresetRef.current = preset.id;
    onApplyLayout(parsed, preset.id);
  };

  const handleSave = async () => {
    const name = nameInput.trim() || `Layout ${currentPresets.length + 1}`;
    setBusy(true);
    setError(null);
    const created = await savePreset(name, screenKey, currentLayout, false);
    setBusy(false);
    if (created) {
      await loadPresets(screenKey);
      setSelectedId(created.id);
      setNameInput('');
    }
  };

  const handleOverwrite = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    const updated = await updatePreset(selectedId, currentLayout, nameInput || undefined, false);
    setBusy(false);
    if (updated && nameInput) {
      setNameInput('');
    }
    await loadPresets(screenKey);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const ok = await deletePreset(selectedId);
    if (ok) {
      setSelectedId('');
      appliedPresetRef.current = null;
    }
    await loadPresets(screenKey);
  };

  const handleSetDefault = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    await setDefault(selectedId);
    setBusy(false);
    await loadPresets(screenKey);
  };

  const handleLocalSave = () => {
    const name = localNameInput.trim() || `Layout ${localLayouts.length + 1}`;
    const layouts = saveLocalLayout(name, currentLayout);
    setLocalLayouts(layouts);
    setSelectedLocalName(name);
    setLocalNameInput('');
    toast.success(`Layout "${name}" gespeichert`);
  };

  const handleLocalLoad = () => {
    if (!selectedLocalName) {
      toast.info('Bitte zuerst ein Layout auswählen');
      return;
    }
    const layout = loadSavedLayout(selectedLocalName);
    if (!layout) {
      toast.error('Layout konnte nicht geladen werden');
      return;
    }
    onApplyLayout(layout);
    toast.success(`Layout "${selectedLocalName}" geladen`);
  };

  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[var(--color-text-secondary)]">Layouts</span>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="h-9 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-[var(--color-text-primary)] px-2"
        >
          <option value="">Aktuelles Layout</option>
          {currentPresets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.isDefault ? '★ ' : ''}
              {preset.name}
            </option>
          ))}
        </select>
        <button
          className="px-3 py-1.5 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
          onClick={handleApply}
          disabled={!selectedId || busy || loading}
        >
          Laden
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Layout-Name"
          className="h-9 w-36 px-2 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-[var(--color-text-primary)]"
        />
        <button
          className="px-3 py-1.5 rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          onClick={handleSave}
          disabled={busy || loading}
        >
          Speichern als
        </button>
        <button
          className="px-3 py-1.5 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] disabled:opacity-60"
          onClick={handleOverwrite}
          disabled={!selectedId || busy || loading}
        >
          Überschreiben
        </button>
        <button
          className="px-3 py-1.5 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] disabled:opacity-60"
          onClick={handleSetDefault}
          disabled={!selectedId || busy || loading}
        >
          Standard
        </button>
        <button
          className="px-3 py-1.5 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-[var(--color-error)] hover:border-[var(--color-error)] disabled:opacity-60"
          onClick={handleDelete}
          disabled={!selectedId || busy || loading}
        >
          Löschen
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--color-widget-border)] bg-[var(--color-widget-bg)]/60 p-2">
        <span className="text-[var(--color-text-secondary)]">Lokal</span>
        <select
          value={selectedLocalName}
          onChange={(e) => setSelectedLocalName(e.target.value)}
          className="h-9 w-40 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-[var(--color-text-primary)] px-2"
        >
          <option value="">Aktuelles Layout</option>
          {localLayouts.map((layout) => (
            <option key={layout.name} value={layout.name}>
              {layout.name}
            </option>
          ))}
        </select>
        <button
          className="px-3 py-1.5 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
          onClick={handleLocalLoad}
        >
          Lokal laden
        </button>
        <input
          type="text"
          value={localNameInput}
          onChange={(e) => setLocalNameInput(e.target.value)}
          placeholder="Layout-Name"
          className="h-9 w-36 px-2 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-[var(--color-text-primary)]"
        />
        <button
          className="px-3 py-1.5 rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          onClick={handleLocalSave}
          disabled={busy || loading}
        >
          Lokal speichern
        </button>
      </div>

      {loading && <span className="text-[var(--color-text-secondary)]">Lade Presets...</span>}
      {error && <span className="text-[var(--color-error)]">{error}</span>}
    </div>
  );
}
