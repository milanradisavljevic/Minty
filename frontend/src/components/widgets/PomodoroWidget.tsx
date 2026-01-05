import { useEffect, useMemo, useRef, useState } from 'react';
import { WidgetWrapper } from './WidgetWrapper';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTranslation } from '../../i18n';

type Phase = 'work' | 'break' | 'longBreak';

interface SessionState {
  phase: Phase;
  remaining: number; // seconds
  cycleCount: number;
  sessionsToday: number;
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}

// Lightweight beep without extra assets
function playChime() {
  try {
    type AudioContextCtor = typeof AudioContext;
    const AudioContextClass =
      window.AudioContext || (window as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const duration = 0.2;
    [880, 660].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.25);
      osc.stop(ctx.currentTime + idx * 0.25 + duration);
    });
  } catch {
    // ignore
  }
}

export function PomodoroWidget() {
  const { t } = useTranslation();
  const settings = useSettingsStore((s) => s.pomodoro ?? { workDuration: 25, breakDuration: 5, longBreakDuration: 15, sessionsBeforeLongBreak: 4 });
  const [state, setState] = useState<SessionState>(() => {
    const todayKey = new Date().toDateString();
    const stored = localStorage.getItem('pomodoro-sessions');
    const parsed = stored ? JSON.parse(stored) as { date: string; count: number } : null;
    const sessionsToday = parsed?.date === todayKey ? parsed.count : 0;
    return {
      phase: 'work',
      remaining: settings.workDuration * 60,
      cycleCount: 0,
      sessionsToday,
    };
  });
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Persist session count by day
  useEffect(() => {
    const todayKey = new Date().toDateString();
    localStorage.setItem('pomodoro-sessions', JSON.stringify({ date: todayKey, count: state.sessionsToday }));
  }, [state.sessionsToday]);

  // Reset durations if settings change and timer is idle
  useEffect(() => {
    if (!isRunning) {
      const target =
        state.phase === 'work'
          ? settings.workDuration * 60
          : state.phase === 'longBreak'
          ? settings.longBreakDuration * 60
          : settings.breakDuration * 60;
      setState((prev) => ({ ...prev, remaining: target }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.workDuration, settings.breakDuration, settings.longBreakDuration, settings.sessionsBeforeLongBreak]);

  // Tick handler
  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = window.setInterval(() => {
      setState((prev) => {
        const next = prev.remaining - 1;
        if (next > 0) {
          return { ...prev, remaining: next };
        }

        // Phase finished
        playChime();
        if (prev.phase === 'work') {
          const completed = prev.sessionsToday + 1;
          const needsLongBreak = (prev.cycleCount + 1) % settings.sessionsBeforeLongBreak === 0;
          return {
            phase: needsLongBreak ? 'longBreak' : 'break',
            remaining: (needsLongBreak ? settings.longBreakDuration : settings.breakDuration) * 60,
            cycleCount: prev.cycleCount + 1,
            sessionsToday: completed,
          };
        }

        // Break finished -> back to work
        return {
          phase: 'work',
          remaining: settings.workDuration * 60,
          cycleCount: prev.cycleCount,
          sessionsToday: prev.sessionsToday,
        };
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, settings.breakDuration, settings.longBreakDuration, settings.sessionsBeforeLongBreak, settings.workDuration]);

  const progress = useMemo(() => {
    const total =
      state.phase === 'work'
        ? settings.workDuration * 60
        : state.phase === 'longBreak'
        ? settings.longBreakDuration * 60
        : settings.breakDuration * 60;
    return Math.min(100, Math.max(0, ((total - state.remaining) / total) * 100));
  }, [state.phase, state.remaining, settings.breakDuration, settings.longBreakDuration, settings.workDuration]);

  const handleStartPause = () => setIsRunning((prev) => !prev);

  const handleReset = () => {
    setIsRunning(false);
    setState((prev) => ({
      ...prev,
      phase: 'work',
      remaining: settings.workDuration * 60,
      cycleCount: 0,
    }));
  };

  const phaseLabel =
    state.phase === 'work'
      ? t('pomodoro_phase_work')
      : state.phase === 'break'
      ? t('pomodoro_phase_short_break')
      : t('pomodoro_phase_long_break');
  const mintyLine =
    state.phase === 'work' ? t('pomodoro_minty_work') : t('pomodoro_minty_break');

  return (
    <WidgetWrapper title={t('widget_pomodoro')} noPadding>
      <div className="h-full p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
              {t('pomodoro_phase_label')}
            </p>
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">{phaseLabel}</p>
          </div>
          <div className="text-sm text-[var(--color-text-secondary)]">
            {t('pomodoro_today')}: <span className="text-[var(--color-accent)] font-medium">{state.sessionsToday}</span> {t('pomodoro_sessions_word')}
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-between bg-[var(--color-widget-border)]/40 border border-[var(--color-widget-border)] rounded-lg p-4">
          <div className="text-4xl font-bold tabular-nums text-[var(--color-text-primary)]">
            {formatTime(state.remaining)}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartPause}
              className="px-3 py-2 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              {isRunning ? t('pomodoro_pause') : t('pomodoro_start')}
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-2 rounded-md bg-[var(--color-widget-border)] text-[var(--color-text-primary)] text-sm font-medium hover:bg-[var(--color-widget-border)]/70 transition-colors"
            >
              {t('pomodoro_reset')}
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-[var(--color-text-secondary)]">
            <span>{t('pomodoro_progress')}</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-[var(--color-widget-border)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-purple-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Minty line */}
        <div className="mt-auto text-sm text-[var(--color-text-secondary)] bg-[var(--color-widget-border)]/40 border border-[var(--color-widget-border)] rounded-lg px-3 py-2">
          {mintyLine}
        </div>
      </div>
    </WidgetWrapper>
  );
}
