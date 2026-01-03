import { useState, useEffect, useMemo } from 'react';
import { useSettingsStore, type Language } from '../stores/settingsStore';
import { useTranslation } from '../i18n';
import { WIDGET_TITLE_KEYS } from '../constants/widgets';
import type { NewsFeedConfig } from '../types';
import { fetchWeatherData } from '../utils/weather';
import { useLayoutStore, layoutBreakpoints, type LayoutProfile } from '../stores/layoutStore';

function WidgetsTab() {
  const { t } = useTranslation();
  const widgets = useSettingsStore((s) => s.widgets ?? []);
  const toggleWidget = useSettingsStore((s) => s.toggleWidget);

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-text-secondary)] mb-4">
        {t('widgets_description')}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {widgets.map((widget) => (
          <label
            key={widget.id}
            className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] cursor-pointer hover:border-[var(--color-accent)] transition-colors"
          >
            <span className="text-sm text-[var(--color-text-primary)]">
              {t(WIDGET_TITLE_KEYS[widget.id] || 'widget_tasks')}
            </span>
            <div
              className={`relative w-11 h-6 rounded-full transition-colors ${
                widget.enabled ? 'bg-[var(--color-accent)]' : 'bg-gray-600'
              }`}
              onClick={() => toggleWidget(widget.id)}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  widget.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function NewsTab() {
  const { t } = useTranslation();
  const [feeds, setFeeds] = useState<NewsFeedConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [newFeed, setNewFeed] = useState<NewsFeedConfig>({
    id: '',
    name: '',
    url: '',
    colSpan: 1,
    icon: '',
    enabled: true,
    order: 0,
  });

  const sortedFeeds = useMemo(
    () => [...feeds].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [feeds]
  );

  const clampColSpan = (value?: number) => Math.min(4, Math.max(1, value ?? 1));

  const loadFeeds = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/news/feeds');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFeeds((data.feeds as NewsFeedConfig[]) || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load feeds', err);
      setError(err instanceof Error ? err.message : 'Failed to load feeds');
      setFeeds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeeds();
  }, []);

  const updateFeed = (id: string, updates: Partial<NewsFeedConfig>) => {
    setFeeds((prev) =>
      prev.map((feed) => (feed.id === id ? { ...feed, ...updates } : feed))
    );
  };

  const reorderFeed = (id: string, direction: 'up' | 'down') => {
    setFeeds((prev) => {
      const ordered = [...prev].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const index = ordered.findIndex((f) => f.id === id);
      if (index === -1) return prev;
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= ordered.length) return prev;
      const [moved] = ordered.splice(index, 1);
      ordered.splice(target, 0, moved);
      return ordered.map((f, idx) => ({ ...f, order: idx }));
    });
  };

  const removeFeed = (id: string) => {
    setFeeds((prev) => prev.filter((f) => f.id !== id).map((f, idx) => ({ ...f, order: idx })));
  };

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `feed-${Date.now()}`;

  const handleAddFeed = () => {
    const name = newFeed.name.trim();
    const url = newFeed.url.trim();
    if (!name || !url) {
      setError(t('news_validation_required'));
      return;
    }

    const baseId = newFeed.id?.trim() ? slugify(newFeed.id) : slugify(name);
    let finalId = baseId;
    let counter = 1;
    while (feeds.some((f) => f.id === finalId)) {
      finalId = `${baseId}-${counter++}`;
    }

    const feed: NewsFeedConfig = {
      id: finalId,
      name,
      url,
      icon: newFeed.icon?.trim() || name.charAt(0).toUpperCase(),
      colSpan: clampColSpan(newFeed.colSpan),
      enabled: newFeed.enabled !== false,
      order: feeds.length,
    };

    setFeeds((prev) => [...prev, feed]);
    setNewFeed({ id: '', name: '', url: '', colSpan: 1, icon: '', enabled: true, order: 0 });
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setTestMessage(null);
    try {
      const payload = sortedFeeds.map((feed, idx) => ({
        ...feed,
        order: idx,
        colSpan: clampColSpan(feed.colSpan),
        enabled: feed.enabled !== false,
      }));

      const hasMissing = payload.some((f) => !f.id || !f.name?.trim() || !f.url?.trim());
      if (hasMissing) {
        setError(t('news_validation_required'));
        setSaving(false);
        return;
      }

      const idSet = new Set<string>();
      for (const f of payload) {
        if (idSet.has(f.id)) {
          setError(t('news_validation_duplicate'));
          setSaving(false);
          return;
        }
        idSet.add(f.id);
      }

      const res = await fetch('/api/news/feeds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setFeeds((data.feeds as NewsFeedConfig[]) || payload);
      setTestMessage(t('news_save_success'));
    } catch (err) {
      console.error('Failed to save feeds', err);
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTestMessage(null);
    setTestError(null);
    const url = newFeed.url.trim();
    if (!url) {
      setTestError(t('news_validation_url'));
      return;
    }

    try {
      const res = await fetch('/api/news/feeds/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setTestMessage(`${t('news_test_success')}: ${data.result?.title || url}`);
    } catch (err) {
      console.error('Feed test failed', err);
      setTestError(err instanceof Error ? err.message : 'Failed to test feed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-secondary)]">
        {t('news_settings_description')}
      </p>

      {error && (
        <div className="p-3 rounded-md bg-[var(--color-error)]/10 border border-[var(--color-error)] text-[var(--color-error)] text-sm">
          {error}
        </div>
      )}
      {testError && (
        <div className="p-3 rounded-md bg-[var(--color-error)]/10 border border-[var(--color-error)] text-[var(--color-error)] text-sm">
          {testError}
        </div>
      )}
      {testMessage && (
        <div className="p-3 rounded-md bg-[var(--color-success)]/10 border border-[var(--color-success)] text-[var(--color-success)] text-sm">
          {testMessage}
        </div>
      )}

      <div className="space-y-3">
        {sortedFeeds.map((feed, idx) => (
          <div
            key={feed.id}
            className="p-3 rounded-lg bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <input
                  value={feed.icon || ''}
                  onChange={(e) => updateFeed(feed.id, { icon: e.target.value })}
                  className="w-16 px-2 py-1 rounded bg-[var(--color-dashboard-bg)] border border-[var(--color-widget-border)] text-sm text-[var(--color-text-primary)]"
                  placeholder="📰"
                  maxLength={4}
                />
                <input
                  value={feed.name}
                  onChange={(e) => updateFeed(feed.id, { name: e.target.value })}
                  className="flex-1 min-w-0 px-3 py-2 rounded bg-[var(--color-dashboard-bg)] border border-[var(--color-widget-border)] text-sm text-[var(--color-text-primary)]"
                  placeholder={t('news_feed_name')}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={feed.enabled !== false}
                    onChange={(e) => updateFeed(feed.id, { enabled: e.target.checked })}
                    className="accent-[var(--color-accent)]"
                  />
                  {t('news_enabled')}
                </label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => reorderFeed(feed.id, 'up')}
                    disabled={idx === 0}
                    className="px-2 py-1 rounded border border-[var(--color-widget-border)] text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
                    title={t('news_move_up')}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => reorderFeed(feed.id, 'down')}
                    disabled={idx === sortedFeeds.length - 1}
                    className="px-2 py-1 rounded border border-[var(--color-widget-border)] text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
                    title={t('news_move_down')}
                  >
                    ↓
                  </button>
                </div>
                <button
                  onClick={() => removeFeed(feed.id)}
                  className="px-2 py-1 rounded border border-[var(--color-widget-border)] text-xs text-[var(--color-error)] hover:border-[var(--color-error)]"
                  title={t('news_delete')}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-8">
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                  {t('news_feed_url')}
                </label>
                <input
                  value={feed.url}
                  onChange={(e) => updateFeed(feed.id, { url: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-[var(--color-dashboard-bg)] border border-[var(--color-widget-border)] text-sm text-[var(--color-text-primary)]"
                  placeholder="https://example.com/rss"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                  {t('news_colspan')}
                </label>
                <select
                  value={clampColSpan(feed.colSpan)}
                  onChange={(e) => updateFeed(feed.id, { colSpan: clampColSpan(Number(e.target.value)) })}
                  className="w-full px-2 py-2 rounded bg-[var(--color-dashboard-bg)] border border-[var(--color-widget-border)] text-sm text-[var(--color-text-primary)]"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                  {t('news_feed_id')}
                </label>
                <div className="px-3 py-2 rounded bg-[var(--color-dashboard-bg)] border border-[var(--color-widget-border)] text-sm text-[var(--color-text-secondary)] truncate">
                  {feed.id}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sortedFeeds.length === 0 && (
        <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
          {t('news_no_feeds')}
        </p>
      )}

      <div className="p-4 rounded-lg border border-dashed border-[var(--color-widget-border)] bg-[var(--color-dashboard-bg)] space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {t('news_add_feed')}
          </h4>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={newFeed.enabled !== false}
                onChange={(e) => setNewFeed((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="accent-[var(--color-accent)]"
              />
              {t('news_enabled')}
            </label>
            <label className="flex items-center gap-2">
              <span>{t('news_colspan')}:</span>
              <select
                value={clampColSpan(newFeed.colSpan)}
                onChange={(e) => setNewFeed((prev) => ({ ...prev, colSpan: clampColSpan(Number(e.target.value)) }))}
                className="px-2 py-1 rounded bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-xs text-[var(--color-text-primary)]"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-4">
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
              {t('news_feed_name')}
            </label>
            <input
              value={newFeed.name}
              onChange={(e) => setNewFeed((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 rounded bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-sm text-[var(--color-text-primary)]"
              placeholder={t('news_feed_name')}
            />
          </div>
          <div className="col-span-6">
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
              {t('news_feed_url')}
            </label>
            <input
              value={newFeed.url}
              onChange={(e) => setNewFeed((prev) => ({ ...prev, url: e.target.value }))}
              className="w-full px-3 py-2 rounded bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-sm text-[var(--color-text-primary)]"
              placeholder="https://example.com/rss"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
              {t('news_feed_icon')}
            </label>
            <input
              value={newFeed.icon || ''}
              onChange={(e) => setNewFeed((prev) => ({ ...prev, icon: e.target.value }))}
              className="w-full px-3 py-2 rounded bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-sm text-[var(--color-text-primary)]"
              placeholder="📰"
              maxLength={4}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTest}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            {t('news_test_feed')}
          </button>
          <button
            onClick={handleAddFeed}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
          >
            {t('news_add_feed')}
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            saving
              ? 'bg-[var(--color-widget-bg)] text-[var(--color-text-secondary)] border border-[var(--color-widget-border)]'
              : 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]'
          }`}
        >
          {saving ? t('news_saving') : t('news_save')}
        </button>
      </div>
    </div>
  );
}

function WeatherTab() {
  const { t } = useTranslation();
  const weather = useSettingsStore((s) => s.weather ?? { latitude: 48.2082, longitude: 16.3738, units: 'metric', locationName: '' });
  const setWeatherSettings = useSettingsStore((s) => s.setWeatherSettings);
  const [latitude, setLatitude] = useState(String(weather.latitude));
  const [longitude, setLongitude] = useState(String(weather.longitude));
  const [units, setUnits] = useState<'metric' | 'imperial'>(weather.units ?? 'metric');
  const [locationName, setLocationName] = useState(weather.locationName ?? '');
  const [savingMessage, setSavingMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setLatitude(String(weather.latitude));
    setLongitude(String(weather.longitude));
    setUnits(weather.units ?? 'metric');
    setLocationName(weather.locationName ?? '');
  }, [weather.latitude, weather.longitude, weather.units, weather.locationName]);

  const parseCoordinate = (value: string, min: number, max: number) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
      return null;
    }
    return parsed;
  };

  const handleSave = () => {
    const lat = parseCoordinate(latitude, -90, 90);
    const lon = parseCoordinate(longitude, -180, 180);

    if (lat === null || lon === null) {
      setErrorMessage(t('weather_settings_invalid'));
      setSavingMessage(null);
      return;
    }

    setWeatherSettings({
      latitude: lat,
      longitude: lon,
      units,
      locationName: locationName.trim(),
    });
    setErrorMessage(null);
    setSavingMessage(t('weather_settings_saved'));
  };

  const handleTest = async () => {
    const lat = parseCoordinate(latitude, -90, 90);
    const lon = parseCoordinate(longitude, -180, 180);

    if (lat === null || lon === null) {
      setErrorMessage(t('weather_settings_invalid'));
      setSavingMessage(null);
      return;
    }

    setTesting(true);
    setSavingMessage(null);
    setErrorMessage(null);

    try {
      const result = await fetchWeatherData({ latitude: lat, longitude: lon, units });
      const unitLabel = units === 'imperial' ? '°F' : '°C';
      setSavingMessage(`${t('weather_settings_test_success')}: ${Math.round(result.temperature)}${unitLabel}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('weather_unknown_error');
      setErrorMessage(`${t('weather_error')}: ${message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--color-text-secondary)]">{t('weather_settings_description')}</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            {t('weather_settings_latitude')}
          </label>
          <input
            type="number"
            step="0.0001"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            {t('weather_settings_longitude')}
          </label>
          <input
            type="number"
            step="0.0001"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          {t('weather_settings_location')}
        </label>
        <input
          type="text"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          placeholder={t('weather_settings_location_placeholder')}
          className="w-full px-3 py-2 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          {t('weather_settings_unit')}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setUnits('metric')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              units === 'metric'
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-widget-bg)] text-[var(--color-text-primary)] border border-[var(--color-widget-border)] hover:border-[var(--color-accent)]'
            }`}
          >
            {t('weather_settings_unit_c')}
          </button>
          <button
            onClick={() => setUnits('imperial')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              units === 'imperial'
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-widget-bg)] text-[var(--color-text-primary)] border border-[var(--color-widget-border)] hover:border-[var(--color-accent)]'
            }`}
          >
            {t('weather_settings_unit_f')}
          </button>
        </div>
      </div>

      {(savingMessage || errorMessage) && (
        <div
          className={`text-sm ${
            errorMessage ? 'text-[var(--color-error)]' : 'text-[var(--color-accent)]'
          }`}
        >
          {errorMessage || savingMessage}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleTest}
          disabled={testing}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            testing
              ? 'bg-[var(--color-widget-bg)] text-[var(--color-text-secondary)] border border-[var(--color-widget-border)]'
              : 'bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
          }`}
        >
          {testing ? t('weather_settings_testing') : t('weather_settings_test')}
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
        >
          {t('weather_settings_save')}
        </button>
      </div>
    </div>
  );
}

function CalendarTab() {
  const { t } = useTranslation();
  const calendar = useSettingsStore((s) => s.calendar ?? { weekStartsOn: 'monday' });
  const setCalendarSettings = useSettingsStore((s) => s.setCalendarSettings);

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--color-text-secondary)]">{t('calendar_settings_description')}</p>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          {t('calendar_week_start_label')}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setCalendarSettings({ weekStartsOn: 'monday' })}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              calendar.weekStartsOn === 'monday'
                ? 'bg-[var(--color-accent)] text-white border-2 border-[var(--color-accent)]'
                : 'bg-[var(--color-widget-bg)] text-[var(--color-text-primary)] border-2 border-[var(--color-widget-border)] hover:border-[var(--color-accent)]'
            }`}
          >
            {t('calendar_week_start_monday')}
          </button>
          <button
            onClick={() => setCalendarSettings({ weekStartsOn: 'sunday' })}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              calendar.weekStartsOn === 'sunday'
                ? 'bg-[var(--color-accent)] text-white border-2 border-[var(--color-accent)]'
                : 'bg-[var(--color-widget-bg)] text-[var(--color-text-primary)] border-2 border-[var(--color-widget-border)] hover:border-[var(--color-accent)]'
            }`}
          >
            {t('calendar_week_start_sunday')}
          </button>
        </div>
      </div>
    </div>
  );
}

function GeneralTab() {
  const { t } = useTranslation();
  const general = useSettingsStore((s) => s.general ?? { theme: 'dark', language: 'de', refreshInterval: 60, mementoMoriEnabled: true });
  const appearance = useSettingsStore((s) => s.appearance ?? { backgroundOpacity: 100, widgetOpacity: 100, transparencyEnabled: true, enableBlur: false, blurStrength: 10 });
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setAppearanceSettings = useSettingsStore((s) => s.setAppearanceSettings);
  const setGeneralSettings = useSettingsStore((s) => s.setGeneralSettings);
  const layoutMode = useLayoutStore((s) => s.mode);
  const manualProfile = useLayoutStore((s) => s.manualProfile);
  const setLayoutMode = useLayoutStore((s) => s.setMode);
  const setManualProfile = useLayoutStore((s) => s.setManualProfile);
  const [detectedProfile, setDetectedProfile] = useState<LayoutProfile>(() => {
    const width = window.innerWidth;
    if (width >= layoutBreakpoints.ultrawide) return 'ultrawide';
    if (width >= layoutBreakpoints.standard) return 'standard';
    return 'compact';
  });
  useEffect(() => {
    const onResize = () => {
      const width = window.innerWidth;
      if (width >= layoutBreakpoints.ultrawide) setDetectedProfile('ultrawide');
      else if (width >= layoutBreakpoints.standard) setDetectedProfile('standard');
      else setDetectedProfile('compact');
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const [restarting, setRestarting] = useState(false);
  const [restartError, setRestartError] = useState<string | null>(null);
  const transparencyEnabled = appearance.transparencyEnabled !== false;

  const restartBackend = async () => {
    try {
      setRestarting(true);
      setRestartError(null);
      const res = await fetch('/api/restart', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Backend will restart - socket auto-reconnects, no page reload needed
      // Keep "Restarting..." visible for 3s to indicate the process
      setTimeout(() => setRestarting(false), 3000);
    } catch (err) {
      console.error('Backend restart failed', err);
      setRestartError(t('restart_failed'));
      setRestarting(false);
    }
  };

  const reloadFrontend = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          {t('theme_label')}
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              general.theme === 'dark'
                ? 'bg-[var(--color-accent)] text-white border-2 border-[var(--color-accent)]'
                : 'bg-[var(--color-widget-bg)] text-[var(--color-text-primary)] border-2 border-[var(--color-widget-border)] hover:border-[var(--color-accent)]'
            }`}
          >
            {t('theme_dark')}
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              general.theme === 'light'
                ? 'bg-[var(--color-accent)] text-white border-2 border-[var(--color-accent)]'
                : 'bg-[var(--color-widget-bg)] text-[var(--color-text-primary)] border-2 border-[var(--color-widget-border)] hover:border-[var(--color-accent)]'
            }`}
          >
            {t('theme_light')}
          </button>
        </div>
      </div>

      {/* Layout profile */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)]">
              {t('layout_mode_label')}
            </label>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {layoutMode === 'auto'
                ? t('layout_mode_auto_hint').replace('{profile}', t(`layout_profile_${detectedProfile}` as any))
                : t('layout_mode_manual_hint')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLayoutMode('auto')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                layoutMode === 'auto'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-widget-bg)] text-[var(--color-text-primary)] border border-[var(--color-widget-border)]'
              }`}
            >
              {t('layout_mode_auto')}
            </button>
            <button
              onClick={() => setLayoutMode('manual')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                layoutMode === 'manual'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-widget-bg)] text-[var(--color-text-primary)] border border-[var(--color-widget-border)]'
              }`}
            >
              {t('layout_mode_manual')}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            {t('layout_profile_label')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['compact', 'standard', 'ultrawide'] as LayoutProfile[]).map((profile) => (
              <button
                key={profile}
                onClick={() => setManualProfile(profile)}
                disabled={layoutMode === 'auto'}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  layoutMode === 'manual' && manualProfile === profile
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-widget-bg)] text-[var(--color-text-primary)] border border-[var(--color-widget-border)]'
                } ${layoutMode === 'auto' ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {t(`layout_profile_${profile}` as any)}
                {layoutMode === 'auto' && detectedProfile === profile ? ' •' : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Memento Mori toggle */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)]">
            {t('memento_mori_toggle')}
          </label>
          <p className="text-xs text-[var(--color-text-secondary)]">{t('memento_mori_hint')}</p>
        </div>
        <div
          className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
            general.mementoMoriEnabled ? 'bg-[var(--color-accent)]' : 'bg-gray-600'
          }`}
          onClick={() => setGeneralSettings({ mementoMoriEnabled: !general.mementoMoriEnabled })}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              general.mementoMoriEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </div>
      </div>

      {/* Transparency Settings */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)]">
              {t('transparency_mode_title')}
            </label>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {t('transparency_mode_hint')}
            </p>
          </div>
          <button
            onClick={() => setAppearanceSettings({ transparencyEnabled: !transparencyEnabled })}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors border border-[var(--color-widget-border)] ${transparencyEnabled ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-widget-bg)]'}`}
            aria-pressed={transparencyEnabled}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${transparencyEnabled ? 'translate-x-7' : 'translate-x-1'}`}
            />
            <span className="sr-only">{transparencyEnabled ? t('transparency_on') : t('transparency_off')}</span>
          </button>
        </div>

        <label className="block text-sm font-medium text-[var(--color-text-primary)]">
          {t('transparency_title') || 'Hintergrund-Transparenz'}
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">
              {appearance.backgroundOpacity}%
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={appearance.backgroundOpacity}
            disabled={!transparencyEnabled}
            onChange={(e) => setAppearanceSettings({ backgroundOpacity: parseInt(e.target.value) })}
            className={`w-full h-2 bg-[var(--color-widget-border)] rounded-lg appearance-none ${transparencyEnabled ? 'cursor-pointer accent-[var(--color-accent)]' : 'cursor-not-allowed opacity-50'}`}
          />

          <p className="text-xs text-[var(--color-text-secondary)]">
            {t('transparency_hint') || '0% = maximale Transparenz, 100% = vollständig opak'}
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-[var(--color-text-primary)]">
            {t('transparency_widget_title')}
          </label>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">
              {appearance.widgetOpacity}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={appearance.widgetOpacity}
            disabled={!transparencyEnabled}
            onChange={(e) => setAppearanceSettings({ widgetOpacity: parseInt(e.target.value) })}
            className={`w-full h-2 bg-[var(--color-widget-border)] rounded-lg appearance-none ${transparencyEnabled ? 'cursor-pointer accent-[var(--color-accent)]' : 'cursor-not-allowed opacity-50'}`}
          />
          <p className="text-xs text-[var(--color-text-secondary)]">
            {t('transparency_widget_hint')}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-[var(--color-text-primary)]">
          {t('restart_title')}
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={restartBackend}
            disabled={restarting}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border border-[var(--color-widget-border)] ${
              restarting
                ? 'bg-[var(--color-widget-bg)] text-[var(--color-text-secondary)]'
                : 'bg-[var(--color-error)]/10 text-[var(--color-error)] hover:bg-[var(--color-error)]/20'
            }`}
          >
            {restarting ? t('restart_running') : t('restart_backend')}
          </button>
          <button
            onClick={reloadFrontend}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors border border-[var(--color-widget-border)] bg-[var(--color-widget-bg)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            {t('restart_frontend')}
          </button>
        </div>
        {restartError && <div className="text-sm text-[var(--color-error)]">{restartError}</div>}
        <p className="text-xs text-[var(--color-text-secondary)]">
          {t('restart_hint')}
        </p>
      </div>
    </div>
  );
}

function PomodoroTab() {
  const { t } = useTranslation();
  const pomodoro = useSettingsStore((s) => s.pomodoro ?? { workDuration: 25, breakDuration: 5, longBreakDuration: 15, sessionsBeforeLongBreak: 4 });
  const setPomodoroSettings = useSettingsStore((s) => s.setPomodoroSettings);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-secondary)]">
        {t('pomodoro_tab_description')}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[var(--color-text-primary)] mb-1">
            {t('pomodoro_work')}
          </label>
          <input
            type="number"
            value={pomodoro.workDuration}
            onChange={(e) => setPomodoroSettings({ workDuration: Number(e.target.value) })}
            min={1}
            max={120}
            className="w-full px-3 py-2 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-sm text-[var(--color-text-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--color-text-primary)] mb-1">
            {t('pomodoro_break')}
          </label>
          <input
            type="number"
            value={pomodoro.breakDuration}
            onChange={(e) => setPomodoroSettings({ breakDuration: Number(e.target.value) })}
            min={1}
            max={30}
            className="w-full px-3 py-2 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-sm text-[var(--color-text-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--color-text-primary)] mb-1">
            {t('pomodoro_long_break')}
          </label>
          <input
            type="number"
            value={pomodoro.longBreakDuration}
            onChange={(e) => setPomodoroSettings({ longBreakDuration: Number(e.target.value) })}
            min={1}
            max={60}
            className="w-full px-3 py-2 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-sm text-[var(--color-text-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--color-text-primary)] mb-1">
            {t('pomodoro_sessions_until_long')}
          </label>
          <input
            type="number"
            value={pomodoro.sessionsBeforeLongBreak}
            onChange={(e) => setPomodoroSettings({ sessionsBeforeLongBreak: Number(e.target.value) })}
            min={1}
            max={10}
            className="w-full px-3 py-2 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-sm text-[var(--color-text-primary)]"
          />
        </div>
      </div>
    </div>
  );
}

function ClockTab() {
  const { t } = useTranslation();
  const clock = useSettingsStore((s) => s.clock);
  const setClockSettings = useSettingsStore((s) => s.setClockSettings);
  const [previewTime, setPreviewTime] = useState(new Date());
  const sizeMap: Record<'xs' | 's' | 'm' | 'l' | 'xl', { time: string; date: string }> = {
    xs: { time: '2rem', date: '0.75rem' },
    s: { time: '3rem', date: '0.875rem' },
    m: { time: '4rem', date: '1rem' },
    l: { time: '5.5rem', date: '1.25rem' },
    xl: { time: '7rem', date: '1.5rem' },
  };

  // Update preview time every second
  useEffect(() => {
    const interval = setInterval(() => setPreviewTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Format time inline
  const formatOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(clock.showSeconds && { second: '2-digit' }),
  };
  if (clock.timeFormat === '12h') {
    formatOptions.hour12 = true;
  } else if (clock.timeFormat === '24h') {
    formatOptions.hour12 = false;
  }
  const timeStr = previewTime.toLocaleTimeString(undefined, formatOptions);

  // Format date inline
  let dateStr = '';
  if (clock.showDate) {
    if (clock.dateFormat === 'system') {
      const dateOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...(clock.showWeekday && { weekday: clock.weekdayFormat }),
      };
      dateStr = previewTime.toLocaleDateString(undefined, dateOptions);
    } else {
      const day = previewTime.getDate().toString().padStart(2, '0');
      const month = (previewTime.getMonth() + 1).toString().padStart(2, '0');
      const year = previewTime.getFullYear();
      let weekdayStr = '';
      if (clock.showWeekday) {
        weekdayStr = previewTime.toLocaleDateString(undefined, { weekday: clock.weekdayFormat }) + ', ';
      }
      switch (clock.dateFormat) {
        case 'DMY':
          dateStr = `${weekdayStr}${day}.${month}.${year}`;
          break;
        case 'MDY':
          dateStr = `${weekdayStr}${month}/${day}/${year}`;
          break;
        case 'YMD':
          dateStr = `${weekdayStr}${year}-${month}-${day}`;
          break;
        case 'long':
          dateStr = previewTime.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            ...(clock.showWeekday && { weekday: clock.weekdayFormat }),
          });
          break;
        default:
          dateStr = `${weekdayStr}${day}.${month}.${year}`;
      }
    }
  }

  const size = sizeMap[clock.size || 'm'];

  return (
    <div className="space-y-6">
      {/* Size selector */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          {useTranslation().t('clock_size_label')}
        </label>
        <div className="grid grid-cols-5 gap-2">
          {(['xs', 's', 'm', 'l', 'xl'] as const).map((sizeKey) => (
            <button
              key={sizeKey}
              onClick={() => setClockSettings({ size: sizeKey })}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                clock.size === sizeKey
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-widget-bg)] text-[var(--color-text-primary)] border border-[var(--color-widget-border)]'
              }`}
            >
              {sizeKey.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] rounded-lg text-center">
        <p className="text-xs text-[var(--color-text-secondary)] mb-2">{t('preview')}</p>
        <p
          className="font-semibold text-[var(--color-text-primary)] leading-tight"
          style={{ fontSize: size.time }}
        >
          {timeStr}
        </p>
        {dateStr && (
          <p
            className="text-[var(--color-text-secondary)] mt-2"
            style={{ fontSize: size.date }}
          >
            {dateStr}
          </p>
        )}
      </div>

      {/* Time Format */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Time Format
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['system', '24h', '12h'] as const).map((format) => (
            <button
              key={format}
              onClick={() => setClockSettings({ timeFormat: format })}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                clock.timeFormat === format
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-widget-bg)] text-[var(--color-text-primary)] border border-[var(--color-widget-border)]'
              }`}
            >
              {format === 'system' && 'System'}
              {format === '24h' && '24h'}
              {format === '12h' && '12h'}
            </button>
          ))}
        </div>
      </div>

      {/* Show Seconds */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-[var(--color-text-primary)]">Show Seconds</label>
        <div
          className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
            clock.showSeconds ? 'bg-[var(--color-accent)]' : 'bg-gray-600'
          }`}
          onClick={() => setClockSettings({ showSeconds: !clock.showSeconds })}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              clock.showSeconds ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </div>
      </div>

      {/* Show Date */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-[var(--color-text-primary)]">Show Date</label>
        <div
          className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
            clock.showDate ? 'bg-[var(--color-accent)]' : 'bg-gray-600'
          }`}
          onClick={() => setClockSettings({ showDate: !clock.showDate })}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              clock.showDate ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </div>
      </div>

      {/* Date Format */}
      {clock.showDate && (
        <>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Date Format
            </label>
            <select
              value={clock.dateFormat}
              onChange={(e) => setClockSettings({ dateFormat: e.target.value as any })}
              className="w-full px-3 py-2 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-sm text-[var(--color-text-primary)]"
            >
              <option value="system">System</option>
              <option value="DMY">DD.MM.YYYY</option>
              <option value="MDY">MM/DD/YYYY</option>
              <option value="YMD">YYYY-MM-DD</option>
              <option value="long">Long Format</option>
            </select>
          </div>

          {/* Show Weekday */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-[var(--color-text-primary)]">Show Weekday</label>
            <div
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                clock.showWeekday ? 'bg-[var(--color-accent)]' : 'bg-gray-600'
              }`}
              onClick={() => setClockSettings({ showWeekday: !clock.showWeekday })}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  clock.showWeekday ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </div>
          </div>

          {/* Weekday Format */}
          {clock.showWeekday && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Weekday Format
              </label>
              <div className="flex gap-2">
                {(['short', 'long'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => setClockSettings({ weekdayFormat: format })}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      clock.weekdayFormat === format
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-widget-bg)] text-[var(--color-text-primary)] border border-[var(--color-widget-border)]'
                    }`}
                  >
                    {format === 'short' ? 'Short (Mon)' : 'Long (Monday)'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


function LanguageTab() {
  const languageSettings = useSettingsStore((s) => s.languageSettings);
  const setLanguageSettings = useSettingsStore((s) => s.setLanguageSettings);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  // Language labels with fallbacks
  const languageLabels: Record<Language, string> = {
    de: 'Deutsch',
    en: 'English',
    es: 'Español',
    sr: 'Srpski',
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguageSettings({ locale: lang });
    setLanguage(lang); // Sync with general.language for backwards compatibility
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--color-text-secondary)]">
        Select your preferred language. All interface elements and Minty will use this language.
      </p>

      {/* App Language */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Language
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(languageLabels) as [Language, string][]).map(([lang, label]) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                languageSettings.locale === lang
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-widget-bg)] text-[var(--color-text-primary)] border border-[var(--color-widget-border)] hover:border-[var(--color-accent)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Info Note */}
      <div className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] rounded-md px-3 py-2">
        💡 This language applies to all interface elements, including Minty's comments.
      </div>
    </div>
  );
}

export function SettingsModal() {
  const { t } = useTranslation();
  const isOpen = useSettingsStore((s) => s.isOpen);
  const closeSettings = useSettingsStore((s) => s.closeSettings);
  const activeTab = useSettingsStore((s) => s.activeTab);
  const setActiveTab = useSettingsStore((s) => s.setActiveTab);

  if (!isOpen) return null;

  const tabs = [
    { id: 'widgets' as const, labelKey: 'tab_widgets' as const, icon: '🧩' },
    { id: 'weather' as const, labelKey: 'tab_weather' as const, icon: '🌤️' },
    { id: 'calendar' as const, labelKey: 'tab_calendar' as const, icon: '📅' },
    { id: 'clock' as const, labelKey: 'tab_clock' as const, icon: '🕐' },
    { id: 'language' as const, labelKey: 'tab_language' as const, icon: '🌐' },
    { id: 'news' as const, labelKey: 'tab_news' as const, icon: '📰' },
    { id: 'pomodoro' as const, labelKey: 'tab_pomodoro' as const, icon: '🍅' },
    { id: 'general' as const, labelKey: 'tab_general' as const, icon: '⚙️' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeSettings}
      />

      {/* Modal - Increased width for ultrawide displays */}
      <div className="relative w-full max-w-5xl mx-4 bg-[var(--color-card-bg)] rounded-xl shadow-2xl border border-[var(--color-widget-border)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-widget-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {t('settings_title')}
          </h2>
          <button
            onClick={closeSettings}
            className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Close settings"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs - Scrollable on narrow screens */}
        <div className="flex border-b border-[var(--color-widget-border)] overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{t(tab.labelKey)}</span>
            </button>
          ))}
        </div>

        {/* Content - Increased height for better usability */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'widgets' && <WidgetsTab />}
          {activeTab === 'weather' && <WeatherTab />}
          {activeTab === 'calendar' && <CalendarTab />}
          {activeTab === 'clock' && <ClockTab />}
          {activeTab === 'language' && <LanguageTab />}
          {activeTab === 'news' && <NewsTab />}
          {activeTab === 'general' && <GeneralTab />}
          {activeTab === 'pomodoro' && <PomodoroTab />}
        </div>
      </div>
    </div>
  );
}
