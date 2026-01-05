import { useEffect, useRef, useState } from 'react';
import { WidgetWrapper } from './WidgetWrapper';
import { useTranslation, type TranslationKey } from '../../i18n';
import { useAmbientStore } from '../../stores/ambientStore';

interface SoundConfig {
  id: string;
  labelKey: TranslationKey;
  icon: string;
  file: string;
  color: string;
}

const AMBIENT_SOUNDS: SoundConfig[] = [
  { id: 'rain', labelKey: 'ambient_sound_rain', icon: '🌧️', file: '/sounds/rain.mp3', color: '#3b82f6' },
  { id: 'forest', labelKey: 'ambient_sound_forest', icon: '🌲', file: '/sounds/forest.mp3', color: '#22c55e' },
  { id: 'cafe', labelKey: 'ambient_sound_cafe', icon: '☕', file: '/sounds/cafe.mp3', color: '#f59e0b' },
  { id: 'fireplace', labelKey: 'ambient_sound_fireplace', icon: '🔥', file: '/sounds/fireplace.mp3', color: '#ef4444' },
  { id: 'ocean', labelKey: 'ambient_sound_ocean', icon: '🌊', file: '/sounds/ocean.mp3', color: '#06b6d4' },
  { id: 'wind', labelKey: 'ambient_sound_wind', icon: '💨', file: '/sounds/wind.mp3', color: '#8b5cf6' },
  { id: 'thunder', labelKey: 'ambient_sound_thunder', icon: '⛈️', file: '/sounds/thunder.mp3', color: '#6366f1' },
  { id: 'whitenoise', labelKey: 'ambient_sound_whitenoise', icon: '📻', file: '/sounds/whitenoise.mp3', color: '#71717a' },
];

interface ActiveSound {
  id: string;
  audio: HTMLAudioElement;
  volume: number;
}

export function AmbientSoundWidget() {
  const { t } = useTranslation();
  const [activeSounds, setActiveSounds] = useState<Map<string, ActiveSound>>(new Map());
  const [globalVolume, setGlobalVolume] = useState(0.5);
  const [loadErrors, setLoadErrors] = useState<Set<string>>(new Set());
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const { addSound, removeSound } = useAmbientStore();

  // Cleanup on unmount
  useEffect(() => {
    const audios = audioRefs.current;
    return () => {
      audios.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audios.clear();
    };
  }, []);

  // Update all volumes when global volume changes
  useEffect(() => {
    activeSounds.forEach((sound) => {
      sound.audio.volume = sound.volume * globalVolume;
    });
  }, [globalVolume, activeSounds]);

  const toggleSound = async (soundConfig: SoundConfig) => {
    const existing = activeSounds.get(soundConfig.id);

    if (existing) {
      // Stop the sound
      existing.audio.pause();
      existing.audio.currentTime = 0;
      audioRefs.current.delete(soundConfig.id);

      const newMap = new Map(activeSounds);
      newMap.delete(soundConfig.id);
      setActiveSounds(newMap);
      removeSound(soundConfig.id);
    } else {
      // Start the sound
      try {
        const audio = new Audio(soundConfig.file);
        audio.loop = true;
        audio.volume = globalVolume;

        // Check if file exists
        audio.onerror = () => {
          setLoadErrors((prev) => new Set(prev).add(soundConfig.id));
        };

        await audio.play();

        audioRefs.current.set(soundConfig.id, audio);

        const newMap = new Map(activeSounds);
        newMap.set(soundConfig.id, {
          id: soundConfig.id,
          audio,
          volume: 1.0,
        });
        setActiveSounds(newMap);
        addSound(soundConfig.id);

        // Clear any previous error
        setLoadErrors((prev) => {
          const newSet = new Set(prev);
          newSet.delete(soundConfig.id);
          return newSet;
        });
      } catch (error) {
        console.error(`Failed to play ${t(soundConfig.labelKey)}:`, error);
        setLoadErrors((prev) => new Set(prev).add(soundConfig.id));
      }
    }
  };

  const setSoundVolume = (soundId: string, volume: number) => {
    const sound = activeSounds.get(soundId);
    if (sound) {
      sound.audio.volume = volume * globalVolume;
      const newMap = new Map(activeSounds);
      newMap.set(soundId, { ...sound, volume });
      setActiveSounds(newMap);
    }
  };

  const stopAll = () => {
    activeSounds.forEach((sound) => {
      sound.audio.pause();
      sound.audio.currentTime = 0;
      removeSound(sound.id);
    });
    audioRefs.current.clear();
    setActiveSounds(new Map());
  };

  const isActive = (soundId: string) => activeSounds.has(soundId);
  const hasError = (soundId: string) => loadErrors.has(soundId);
  const activeCount = activeSounds.size;

  return (
    <WidgetWrapper titleKey="widget_ambientSound" noPadding>
      <div className="h-full p-3 flex flex-col">
        {/* Header with global volume */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-secondary)]">
              {activeCount > 0
                ? t('ambient_active_count').replace('{count}', String(activeCount))
                : t('ambient_none_active')}
            </span>
            {activeCount > 0 && (
              <button
                onClick={stopAll}
                className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-error)]/20 text-[var(--color-error)] hover:bg-[var(--color-error)]/30 transition-colors"
              >
                {t('ambient_stop_all')}
              </button>
            )}
          </div>

          {/* Global volume */}
          <div className="flex items-center gap-2">
            <span className="text-xs">🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={globalVolume}
              onChange={(e) => setGlobalVolume(parseFloat(e.target.value))}
              className="w-16 h-1 accent-[var(--color-accent)] cursor-pointer"
            />
          </div>
        </div>

        {/* Sound grid */}
        <div className="flex-1 grid grid-cols-4 gap-2 content-start">
          {AMBIENT_SOUNDS.map((sound) => {
            const active = isActive(sound.id);
            const error = hasError(sound.id);
            const soundName = t(sound.labelKey);

            return (
              <button
                key={sound.id}
                onClick={() => toggleSound(sound)}
                disabled={error}
                className={`
                  relative flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200
                  ${
                    active
                      ? 'bg-[var(--color-accent)]/20 ring-2 ring-[var(--color-accent)]'
                      : error
                      ? 'bg-[var(--color-widget-border)] opacity-50 cursor-not-allowed'
                      : 'bg-[var(--color-widget-border)] hover:bg-[var(--color-widget-border)]/80'
                  }
                `}
                style={active ? { boxShadow: `0 0 20px ${sound.color}40` } : undefined}
                title={error ? `${soundName} - ${t('ambient_file_missing')}` : soundName}
              >
                {/* Icon */}
                <span className={`text-xl mb-1 ${active ? 'animate-pulse' : ''}`}>
                  {error ? '❌' : sound.icon}
                </span>

                {/* Name */}
                <span className="text-[10px] text-[var(--color-text-secondary)]">
                  {soundName}
                </span>

                {/* Active indicator */}
                {active && (
                  <div
                    className="absolute top-1 right-1 w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: sound.color }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Individual volume controls for active sounds */}
        {activeCount > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--color-widget-border)] space-y-2">
            <span className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider">
              {t('ambient_mixer')}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {Array.from(activeSounds.entries()).map(([id, sound]) => {
                const config = AMBIENT_SOUNDS.find((s) => s.id === id);
                if (!config) return null;

                return (
                  <div key={id} className="flex items-center gap-2">
                    <span className="text-xs">{config.icon}</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={sound.volume}
                      onChange={(e) => setSoundVolume(id, parseFloat(e.target.value))}
                      className="flex-1 h-1 accent-[var(--color-accent)] cursor-pointer"
                      style={{ accentColor: config.color }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Help text if no sounds loaded */}
        {loadErrors.size === AMBIENT_SOUNDS.length && (
          <div className="mt-auto pt-2 text-center">
            <p className="text-[10px] text-[var(--color-text-secondary)]">
              {t('ambient_add_files_hint')}{' '}
              <code className="text-[var(--color-accent)]">public/sounds/</code>
            </p>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
}
