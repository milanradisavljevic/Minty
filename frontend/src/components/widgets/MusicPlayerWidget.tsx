import { useEffect, useState, useCallback } from 'react';
import { WidgetWrapper } from './WidgetWrapper';

interface MprisStatus {
  available: boolean;
  playing: boolean;
  player: string | null;
  title: string | null;
  artist: string | null;
  album: string | null;
  artUrl: string | null;
  position: number;
  length: number;
  volume: number;
}

// Get player icon based on name
function getPlayerIcon(player: string | null): string {
  if (!player) return '🎵';
  const name = player.toLowerCase();
  if (name.includes('spotify')) return '🟢';
  if (name.includes('firefox') || name.includes('chromium') || name.includes('chrome')) return '🌐';
  if (name.includes('vlc')) return '🎬';
  if (name.includes('rhythmbox')) return '🎶';
  if (name.includes('clementine')) return '🍊';
  return '🎵';
}

// Format time in mm:ss
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function MusicPlayerWidget() {
  const [status, setStatus] = useState<MprisStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Fallback: fetch status via REST if no socket
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/mpris/status');
        if (response.ok) {
          const data = await response.json();
          setStatus(data.status);
        }
      } catch (error) {
        console.error('Failed to fetch MPRIS status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handlePlayPause = useCallback(async () => {
    try {
      await fetch('/api/mpris/play-pause', { method: 'POST' });
    } catch (error) {
      console.error('Failed to toggle play/pause:', error);
    }
  }, []);

  const handleNext = useCallback(async () => {
    try {
      await fetch('/api/mpris/next', { method: 'POST' });
    } catch (error) {
      console.error('Failed to skip to next:', error);
    }
  }, []);

  const handlePrevious = useCallback(async () => {
    try {
      await fetch('/api/mpris/previous', { method: 'POST' });
    } catch (error) {
      console.error('Failed to go to previous:', error);
    }
  }, []);

  const handleVolumeChange = useCallback(async (volume: number) => {
    try {
      await fetch('/api/mpris/volume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume }),
      });
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  }, []);

  if (loading) {
    return (
      <WidgetWrapper titleKey="widget_musicPlayer" noPadding>
        <div className="h-full flex items-center justify-center text-[var(--color-text-secondary)]">
          <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      </WidgetWrapper>
    );
  }

  if (!status?.available) {
    return (
      <WidgetWrapper titleKey="widget_musicPlayer" noPadding>
        <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-secondary)] p-4">
          <span className="text-3xl mb-2">🔇</span>
          <span className="text-xs text-center">
            playerctl nicht verfügbar.
            <br />
            <code className="text-[10px] text-[var(--color-accent)]">sudo apt install playerctl</code>
          </span>
        </div>
      </WidgetWrapper>
    );
  }

  if (!status.title && !status.playing) {
    return (
      <WidgetWrapper titleKey="widget_musicPlayer" noPadding>
        <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-secondary)] p-4">
          <span className="text-3xl mb-2">🎵</span>
          <span className="text-xs">Kein Player aktiv</span>
          <span className="text-[10px] mt-1 opacity-50">Starte Spotify, VLC oder einen anderen Player</span>
        </div>
      </WidgetWrapper>
    );
  }

  const progress = status.length > 0 ? (status.position / status.length) * 100 : 0;

  return (
    <WidgetWrapper titleKey="widget_musicPlayer" noPadding>
      <div className="h-full flex flex-col p-3">
        {/* Player info */}
        <div className="flex items-center gap-1 mb-2 text-[10px] text-[var(--color-text-secondary)]">
          <span>{getPlayerIcon(status.player)}</span>
          <span className="truncate">{status.player || 'Unbekannt'}</span>
        </div>

        {/* Main content */}
        <div className="flex-1 flex gap-3 min-h-0">
          {/* Album art */}
          <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-[var(--color-widget-border)]">
            {status.artUrl ? (
              <img
                src={status.artUrl}
                alt={status.album || 'Album'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">
                🎵
              </div>
            )}
          </div>

          {/* Track info */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
              {status.title || 'Unbekannt'}
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">
              {status.artist || 'Unbekannter Künstler'}
            </p>
            {status.album && (
              <p className="text-[10px] text-[var(--color-text-secondary)]/60 truncate mt-0.5">
                {status.album}
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-1 bg-[var(--color-widget-border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-[var(--color-text-secondary)]">
            <span>{formatTime(status.position)}</span>
            <span>{formatTime(status.length)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mt-2">
          <button
            onClick={handlePrevious}
            className="p-2 text-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            title="Vorheriger"
          >
            ⏮️
          </button>
          <button
            onClick={handlePlayPause}
            className="p-3 text-2xl bg-[var(--color-accent)] rounded-full hover:bg-[var(--color-accent-hover)] transition-colors shadow-lg"
            title={status.playing ? 'Pause' : 'Play'}
          >
            {status.playing ? '⏸️' : '▶️'}
          </button>
          <button
            onClick={handleNext}
            className="p-2 text-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            title="Nächster"
          >
            ⏭️
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs">🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={status.volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-[var(--color-accent)] cursor-pointer"
          />
          <span className="text-[10px] text-[var(--color-text-secondary)] w-8 text-right">
            {Math.round(status.volume * 100)}%
          </span>
        </div>
      </div>
    </WidgetWrapper>
  );
}
