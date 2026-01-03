import { useDashboardStore } from '../../stores/dashboardStore';
import { useAmbientStore } from '../../stores/ambientStore';
import { WidgetWrapper } from './WidgetWrapper';
import { formatUptime } from '../../utils/format';
import { useSettingsStore, type Language, type LanguageSettings } from '../../stores/settingsStore';
import deTranslations from '../../i18n/locales/de.json';
import enTranslations from '../../i18n/locales/en.json';
import esTranslations from '../../i18n/locales/es.json';
import srTranslations from '../../i18n/locales/sr.json';
import { useEffect, useState, useRef } from 'react';

type SystemState = 'healthy' | 'highCpu' | 'highRam' | 'highTemp';
type TimeOfDayMood = 'morning' | 'forenoon' | 'afternoon' | 'evening' | 'night' | 'lateNight';

type MintyTranslations = typeof enTranslations;

const mintyTranslations: Record<Language, MintyTranslations> = {
  de: deTranslations,
  en: enTranslations,
  es: esTranslations,
  sr: srTranslations,
};

function getMintyLocale(languageSettings?: LanguageSettings): Language {
  const preferredLanguage =
    languageSettings?.mintyLanguage === 'follow'
      ? languageSettings?.locale
      : languageSettings?.mintyLanguage;

  if (preferredLanguage && preferredLanguage in mintyTranslations) {
    return preferredLanguage as Language;
  }

  return 'en';
}

function getNestedValue(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (value && typeof value === 'object' && key in (value as Record<string, unknown>)) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

function getMintyValue(locale: Language, path: string): unknown {
  const primary = getNestedValue(mintyTranslations[locale], path);
  if (primary !== undefined) {
    return primary;
  }
  return getNestedValue(mintyTranslations.en, path);
}

function getMintyArray(locale: Language, path: string): string[] {
  const value = getMintyValue(locale, path);
  return Array.isArray(value) ? value : [];
}

function getMintyString(locale: Language, path: string, fallback: string): string {
  const value = getMintyValue(locale, path);
  return typeof value === 'string' ? value : fallback;
}

function getSystemState(cpu: number, ram: number, temp?: number): SystemState {
  // Temperature takes priority
  if (temp !== undefined && temp >= 70) return 'highTemp';
  if (temp !== undefined && temp >= 60 && cpu > 50) return 'highTemp';

  // Then CPU
  if (cpu >= 80) return 'highCpu';

  // Then RAM
  if (ram >= 85) return 'highRam';
  if (ram >= 70 && cpu < 30) return 'highRam';

  return 'healthy';
}

function getTimeOfDayMood(): TimeOfDayMood {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 9) return 'morning';      // 05:00-08:59: Müde
  if (hour >= 9 && hour < 12) return 'forenoon';    // 09:00-11:59: Wach/Fröhlich
  if (hour >= 12 && hour < 17) return 'afternoon';  // 12:00-16:59: Normal
  if (hour >= 17 && hour < 20) return 'evening';    // 17:00-19:59: Entspannt
  if (hour >= 20 && hour < 23) return 'night';      // 20:00-22:59: Müde werdend
  return 'lateNight';                                 // 23:00-04:59: Sehr müde
}

function getMessage(state: SystemState, uptime: number | undefined, locale: Language): string {
  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay();
  const timeOfDay = getTimeOfDayMood();
  const fallbackMessage = 'Minty is thinking...';

  const pickRandom = (messages: string[], fallback: string) =>
    messages.length > 0
      ? messages[Math.floor(Math.random() * messages.length)]
      : fallback;

  // Easter Eggs (highest priority)
  if (hour === 13 && new Date().getMinutes() === 37) {
    return getMintyString(locale, 'minty.comments.easterEggs.leet', 'LEET.');
  }
  if (dayOfWeek === 5 && Math.random() < 0.3) {
    return getMintyString(
      locale,
      'minty.comments.easterEggs.friday',
      'Friday! Time for... exactly the same as always.'
    );
  }
  if (uptime && uptime > 7 * 24 * 60 * 60 && Math.random() < 0.2) {
    return getMintyString(
      locale,
      'minty.comments.easterEggs.uptime',
      'This machine has been running longer than some relationships.'
    );
  }

  // State-specific messages (system alerts)
  if (state === 'highTemp') {
    const messages = getMintyArray(locale, 'minty.comments.systemState.highTemp');
    const fallback = getMintyString(locale, 'minty.alerts.highTemp', fallbackMessage);
    return pickRandom(messages, fallback);
  }
  if (state === 'highCpu') {
    const messages = getMintyArray(locale, 'minty.comments.systemState.highCpu');
    return pickRandom(messages, fallbackMessage);
  }
  if (state === 'highRam') {
    const messages = getMintyArray(locale, 'minty.comments.systemState.highRam');
    const fallback = getMintyString(locale, 'minty.alerts.highRam', fallbackMessage);
    return pickRandom(messages, fallback);
  }

  // Healthy state - random messages from different categories (multilingual!)
  const categories = [
    getMintyArray(locale, 'minty.comments.linuxPride'),
    getMintyArray(locale, 'minty.comments.archRoasts'),
    getMintyArray(locale, 'minty.comments.windowsMac'),
    getMintyArray(locale, 'minty.comments.cinnamonMint'),
  ];

  // Time-based comments (20% chance, multilingual)
  if (Math.random() < 0.2) {
    const messages = getMintyArray(locale, `minty.comments.timeOfDay.${timeOfDay}`);
    if (messages.length > 0) {
      return pickRandom(messages, fallbackMessage);
    }
  }

  // Random category selection
  const allMessages = categories.flat();
  return pickRandom(allMessages, fallbackMessage);
}

// Sparkle component for healthy state
function Sparkles() {
  return (
    <g className="sparkles">
      {[...Array(5)].map((_, i) => (
        <g key={i} style={{
          animation: `sparkle ${1.5 + i * 0.3}s ease-in-out infinite`,
          animationDelay: `${i * 0.2}s`
        }}>
          <circle
            cx={30 + Math.cos(i * 72 * Math.PI / 180) * 45}
            cy={35 + Math.sin(i * 72 * Math.PI / 180) * 40}
            r="2"
            fill="#fcd34d"
          />
        </g>
      ))}
    </g>
  );
}

// Sweat drops for high temp
function SweatDrops() {
  return (
    <g className="sweat-drops">
      <path
        d="M65 30 Q67 35 65 40 Q63 35 65 30"
        fill="#60a5fa"
        style={{ animation: 'sweatDrop 1s ease-in infinite' }}
      />
      <path
        d="M70 25 Q72 30 70 35 Q68 30 70 25"
        fill="#60a5fa"
        style={{ animation: 'sweatDrop 1.2s ease-in infinite', animationDelay: '0.3s' }}
      />
    </g>
  );
}

// Heat waves for high temp
function HeatWaves() {
  return (
    <g className="heat-waves" opacity="0.6">
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M${35 + i * 15} 5 Q${40 + i * 15} 0 ${45 + i * 15} 5`}
          fill="none"
          stroke="#fb923c"
          strokeWidth="2"
          style={{
            animation: 'heatWave 1s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`
          }}
        />
      ))}
    </g>
  );
}

// Circuit lines on the leaf - refined design matching favicon.svg
function CircuitPattern({ intensity, color }: { intensity: number; color: string }) {
  const baseOpacity = 0.4 + intensity * 0.4;
  const pulseStyle = intensity > 0.6 ? { animation: 'circuit-pulse 1.5s ease-in-out infinite' } : {};

  return (
    <g className="circuit-pattern" opacity={baseOpacity} style={pulseStyle}>
      {/* Central spine circuit */}
      <path
        d="M50 20 L50 35"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Branch circuits - matching favicon.svg style */}
      <path
        d="M50 28 L58 28 L58 38"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M50 28 L42 28 L42 38"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Circuit nodes - glowing effect */}
      <circle cx="50" cy="20" r="2.5" fill={color}>
        <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="58" cy="28" r="2" fill={color}>
        <animate attributeName="opacity" values="0.7;1;0.7" dur="2.3s" repeatCount="indefinite" />
      </circle>
      <circle cx="42" cy="28" r="2" fill={color}>
        <animate attributeName="opacity" values="0.7;1;0.7" dur="2.1s" repeatCount="indefinite" />
      </circle>
      <circle cx="58" cy="38" r="2" fill={color}>
        <animate attributeName="opacity" values="0.6;1;0.6" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="42" cy="38" r="2" fill={color}>
        <animate attributeName="opacity" values="0.6;1;0.6" dur="1.9s" repeatCount="indefinite" />
      </circle>

      {/* Additional circuits when CPU is high */}
      {intensity > 0.5 && (
        <>
          <path
            d="M35 35 L30 35 L30 48 M65 35 L70 35 L70 48"
            fill="none"
            stroke={color}
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.7"
          />
          <circle cx="30" cy="48" r="1.5" fill={color} opacity="0.8" />
          <circle cx="70" cy="48" r="1.5" fill={color} opacity="0.8" />
        </>
      )}

      {/* Extra detail circuits at high intensity */}
      {intensity > 0.75 && (
        <>
          <path
            d="M50 35 L50 48 M45 48 L55 48"
            fill="none"
            stroke={color}
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.5"
          />
          <circle cx="45" cy="48" r="1.5" fill={color} opacity="0.6" />
          <circle cx="55" cy="48" r="1.5" fill={color} opacity="0.6" />
        </>
      )}
    </g>
  );
}

// RAM chips pattern
function RamChips({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <g className="ram-chips" opacity="0.8">
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${35 + i * 10}, 55)`}>
          <rect x="0" y="0" width="6" height="10" rx="1" fill="#3b82f6" />
          <rect x="1" y="2" width="4" height="1" fill="#1e3a5f" />
          <rect x="1" y="5" width="4" height="1" fill="#1e3a5f" />
          <rect x="1" y="8" width="4" height="1" fill="#1e3a5f" />
        </g>
      ))}
    </g>
  );
}

// The Minty leaf character
function MintyCharacter({ state, cpu }: { state: SystemState; cpu: number }) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayMood>(getTimeOfDayMood());

  // Update time of day mood every 15 minutes
  useEffect(() => {
    setTimeOfDay(getTimeOfDayMood());
    const interval = setInterval(() => {
      setTimeOfDay(getTimeOfDayMood());
    }, 15 * 60 * 1000); // 15 minutes
    return () => clearInterval(interval);
  }, []);

  // Blink animation - random intervals between 3-7 seconds
  useEffect(() => {
    const scheduleBlink = () => {
      const delay = 3000 + Math.random() * 4000; // 3-7 seconds
      const doubleBlink = Math.random() > 0.7; // 30% chance of double blink

      return setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);

          if (doubleBlink) {
            setTimeout(() => {
              setIsBlinking(true);
              setTimeout(() => setIsBlinking(false), 150);
            }, 200);
          }
        }, 150);

        scheduleBlink();
      }, delay);
    };

    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Colors based on state
  const leafColors = {
    healthy: { main: '#22c55e', dark: '#16a34a', light: '#4ade80' },
    highCpu: { main: '#22c55e', dark: '#16a34a', light: '#4ade80' },
    highRam: { main: '#3b82f6', dark: '#2563eb', light: '#60a5fa' },
    highTemp: { main: '#f97316', dark: '#ea580c', light: '#fb923c' },
  };

  const colors = leafColors[state];

  // Face expression
  const getEyes = () => {
    // Adjust eye size based on time of day
    let eyeScaleY = 1;
    if (timeOfDay === 'morning' || timeOfDay === 'lateNight') {
      eyeScaleY = 0.6; // Half closed (tired)
    } else if (timeOfDay === 'night') {
      eyeScaleY = 0.8; // Slightly tired
    }

    const blinkTransform = isBlinking
      ? 'scaleY(0.1)'
      : `scaleY(${eyeScaleY})`;
    const blinkStyle = { transform: blinkTransform, transformOrigin: '50px 40px', transition: 'transform 0.1s ease-in-out' };

    switch (state) {
      case 'highTemp':
        return (
          <g style={blinkStyle}>
            {/* Stressed spiral eyes */}
            <circle cx="42" cy="40" r="4" fill="white" />
            <circle cx="58" cy="40" r="4" fill="white" />
            <path d="M40 40 Q42 38 44 40 Q42 42 40 40" fill="#333" />
            <path d="M56 40 Q58 38 60 40 Q58 42 56 40" fill="#333" />
          </g>
        );
      case 'highCpu':
        return (
          <g style={blinkStyle}>
            {/* Determined eyes */}
            <ellipse cx="42" cy="40" rx="4" ry="5" fill="white" />
            <ellipse cx="58" cy="40" rx="4" ry="5" fill="white" />
            <circle cx="43" cy="40" r="2.5" fill="#333" />
            <circle cx="59" cy="40" r="2.5" fill="#333" />
            {/* Eyebrows showing effort */}
            <path d="M38 35 L46 37" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M62 35 L54 37" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        );
      case 'highRam':
        return (
          <g style={blinkStyle}>
            {/* Worried eyes */}
            <ellipse cx="42" cy="40" rx="4" ry="5" fill="white" />
            <ellipse cx="58" cy="40" rx="4" ry="5" fill="white" />
            <circle cx="42" cy="41" r="2.5" fill="#333" />
            <circle cx="58" cy="41" r="2.5" fill="#333" />
            {/* Raised eyebrows */}
            <path d="M38 34 L46 36" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M62 34 L54 36" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        );
      default:
        return (
          <g style={blinkStyle}>
            {/* Happy eyes */}
            <ellipse cx="42" cy="40" rx="4" ry="5" fill="white" />
            <ellipse cx="58" cy="40" rx="4" ry="5" fill="white" />
            <circle cx="43" cy="40" r="2.5" fill="#333" />
            <circle cx="59" cy="40" r="2.5" fill="#333" />
            {/* Eye shine */}
            <circle cx="44" cy="39" r="1" fill="white" />
            <circle cx="60" cy="39" r="1" fill="white" />
          </g>
        );
    }
  };

  const getMouth = () => {
    switch (state) {
      case 'highTemp':
        return <path d="M45 52 Q50 48 55 52" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" />;
      case 'highCpu':
        return <path d="M45 50 L55 50" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" />;
      case 'highRam':
        return <path d="M45 52 Q50 50 55 52" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" />;
      default:
        return <path d="M45 50 Q50 55 55 50" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" />;
    }
  };

  const getBlush = () => {
    if (state === 'healthy') {
      return (
        <>
          <ellipse cx="35" cy="45" rx="4" ry="2.5" fill="#fca5a5" opacity="0.5" />
          <ellipse cx="65" cy="45" rx="4" ry="2.5" fill="#fca5a5" opacity="0.5" />
        </>
      );
    }
    return null;
  };

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        {/* Leaf gradient */}
        <linearGradient id="leafGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.light} />
          <stop offset="50%" stopColor={colors.main} />
          <stop offset="100%" stopColor={colors.dark} />
        </linearGradient>

        {/* Glow filter */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Effects based on state */}
      {state === 'healthy' && <Sparkles />}
      {state === 'highTemp' && <HeatWaves />}
      {state === 'highTemp' && <SweatDrops />}

      {/* Main leaf body */}
      <g filter={state === 'healthy' ? 'url(#glow)' : undefined}>
        <path
          d="M50 10
             Q75 20 80 45
             Q82 60 70 75
             Q60 85 50 88
             Q40 85 30 75
             Q18 60 20 45
             Q25 20 50 10"
          fill="url(#leafGradient)"
          style={{
            animation: `minty-breathe ${timeOfDay === 'morning' || timeOfDay === 'lateNight' ? '5s' : '3s'} ease-in-out infinite`
          }}
        />

        {/* Leaf vein (stem) */}
        <path
          d="M50 15 L50 80"
          fill="none"
          stroke={colors.dark}
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Side veins */}
        <path
          d="M50 30 L35 40 M50 45 L30 55 M50 60 L35 68"
          fill="none"
          stroke={colors.dark}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.3"
        />
        <path
          d="M50 30 L65 40 M50 45 L70 55 M50 60 L65 68"
          fill="none"
          stroke={colors.dark}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.3"
        />
      </g>

      {/* Circuit pattern */}
      <CircuitPattern intensity={cpu / 100} color={colors.main} />

      {/* RAM chips for high RAM state */}
      <RamChips visible={state === 'highRam'} />

      {/* Face */}
      <g className="face">
        {getEyes()}
        {getMouth()}
        {getBlush()}
      </g>

      {/* Arms */}
      <g className="arms">
        {/* Left arm */}
        <path
          d={state === 'highTemp'
            ? "M22 50 Q15 45 12 50 Q10 55 15 58"
            : state === 'highCpu'
            ? "M22 50 Q12 48 8 55"
            : "M22 50 Q15 55 18 62"}
          fill="none"
          stroke={colors.main}
          strokeWidth="6"
          strokeLinecap="round"
          style={{ animation: state === 'healthy' ? 'wave 2s ease-in-out infinite' : undefined }}
        />
        {/* Left hand */}
        <circle
          cx={state === 'highTemp' ? 15 : state === 'highCpu' ? 8 : 18}
          cy={state === 'highTemp' ? 58 : state === 'highCpu' ? 55 : 62}
          r="4"
          fill={colors.main}
        />

        {/* Right arm */}
        <path
          d={state === 'highTemp'
            ? "M78 50 Q85 45 88 50 Q90 55 85 58"
            : state === 'highCpu'
            ? "M78 50 Q88 48 92 55"
            : "M78 50 Q85 55 82 62"}
          fill="none"
          stroke={colors.main}
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Right hand */}
        <circle
          cx={state === 'highTemp' ? 85 : state === 'highCpu' ? 92 : 82}
          cy={state === 'highTemp' ? 58 : state === 'highCpu' ? 55 : 62}
          r="4"
          fill={colors.main}
        />
      </g>

      {/* Legs */}
      <g className="legs">
        {/* Left leg */}
        <path
          d="M40 85 Q38 92 35 96"
          fill="none"
          stroke={colors.main}
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Left foot */}
        <ellipse cx="35" cy="96" rx="5" ry="3" fill={colors.dark} />

        {/* Right leg */}
        <path
          d="M60 85 Q62 92 65 96"
          fill="none"
          stroke={colors.main}
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Right foot */}
        <ellipse cx="65" cy="96" rx="5" ry="3" fill={colors.dark} />
      </g>
    </svg>
  );
}

type AlertType = 'highRam' | 'highTemp' | 'pomodoro';

export function SystemPet() {
  const metrics = useDashboardStore((state) => state.metrics);
  const activeSounds = useAmbientStore((state) => state.activeSounds);
  const languageSettings = useSettingsStore((state) => state.languageSettings);
  const mintyLocale = getMintyLocale(languageSettings);
  const [showMessage, setShowMessage] = useState(true);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [baseMessage, setBaseMessage] = useState<string>('');
  const [alertCooldowns, setAlertCooldowns] = useState<Map<AlertType, number>>(new Map());
  const [mintySize, setMintySize] = useState<'small' | 'medium' | 'large'>('medium');
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMintyLocale = useRef<Language>(mintyLocale);

  // Check if specific ambient sounds are active
  const hasFireplace = activeSounds.has('fireplace');
  const hasRain = activeSounds.has('rain');

  // Resize Observer for responsive Minty sizing
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        console.log('[Minty] Container width:', width);

        if (width < 250) {
          console.log('[Minty] Setting size: small');
          setMintySize('small');
        } else if (width < 400) {
          console.log('[Minty] Setting size: medium');
          setMintySize('medium');
        } else {
          console.log('[Minty] Setting size: large');
          setMintySize('large');
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Alert system with cooldown (10 minutes per alert type)
  const triggerAlert = (type: AlertType, message: string) => {
    const now = Date.now();
    const lastAlertTime = alertCooldowns.get(type) || 0;
    const cooldownPeriod = 10 * 60 * 1000; // 10 minutes

    if (now - lastAlertTime > cooldownPeriod) {
      setCurrentMessage(message);
      setShowMessage(true);
      setAlertCooldowns(new Map(alertCooldowns.set(type, now)));

      // Reset message after a few seconds
      setTimeout(() => {
        setCurrentMessage('');
      }, 8000);
    }
  };

  // Check for alert conditions
  useEffect(() => {
    if (!metrics) return;

    const highRamAlert = getMintyString(mintyLocale, 'minty.alerts.highRam', 'Running out of memory!');
    const highTempAlert = getMintyString(mintyLocale, 'minty.alerts.highTemp', 'Getting hot here! Cooling!');

    // High RAM alert
    if (metrics.memory.percent >= 95) {
      triggerAlert('highRam', highRamAlert);
    }

    // High temp alert
    if (metrics.temperature && metrics.temperature >= 80) {
      triggerAlert('highTemp', highTempAlert);
    }
  }, [metrics?.memory.percent, metrics?.temperature, mintyLocale]);

  // Generate initial base message when metrics become available
  useEffect(() => {
    if (!metrics || baseMessage) return;
    const systemState = getSystemState(metrics.cpu.overall, metrics.memory.percent, metrics.temperature);
    setBaseMessage(getMessage(systemState, metrics.uptime, mintyLocale));
  }, [metrics, baseMessage, mintyLocale]);

  useEffect(() => {
    if (!metrics || lastMintyLocale.current === mintyLocale) return;
    lastMintyLocale.current = mintyLocale;
    const systemState = getSystemState(metrics.cpu.overall, metrics.memory.percent, metrics.temperature);
    setBaseMessage(getMessage(systemState, metrics.uptime, mintyLocale));
    setCurrentMessage('');
    setShowMessage(false);
    setTimeout(() => setShowMessage(true), 200);
  }, [metrics, mintyLocale]);

  // Update base message every 60 seconds (not on every render!)
  useEffect(() => {
    if (!metrics) return;
    const interval = setInterval(() => {
      const systemState = getSystemState(metrics.cpu.overall, metrics.memory.percent, metrics.temperature);
      const newMessage = getMessage(systemState, metrics.uptime, mintyLocale);
      setBaseMessage(newMessage);
      // Animate the message change
      setShowMessage(false);
      setTimeout(() => setShowMessage(true), 200);
    }, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [metrics, mintyLocale]);

  // Click on Minty → show new random message
  const handleMintyClick = () => {
    if (!metrics) return;
    const systemState = getSystemState(metrics.cpu.overall, metrics.memory.percent, metrics.temperature);
    const newMessage = getMessage(systemState, metrics.uptime, mintyLocale);
    setBaseMessage(newMessage);
    setCurrentMessage(''); // Clear any alert message so base message shows
    setShowMessage(false);
    setTimeout(() => setShowMessage(true), 50);
  };

  if (!metrics) {
    const loadingMessage = getMintyString(mintyLocale, 'minty.alerts.loading', 'Minty is waking up...');
    return (
      <WidgetWrapper titleKey="widget_systemPet" noPadding>
        <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-secondary)]">
          <div className="text-4xl mb-2 animate-pulse">🌿</div>
          <span className="text-sm">{loadingMessage}</span>
        </div>
      </WidgetWrapper>
    );
  }

  const systemState = getSystemState(metrics.cpu.overall, metrics.memory.percent, metrics.temperature);
  // Use stored baseMessage (updated every 60s), not computed on every render
  const message = currentMessage || baseMessage || 'Minty is thinking...'; // Alert message takes priority
  const ageLabel = formatUptime(metrics.uptime);

  // State badge colors
  const stateLabels = {
    healthy: getMintyString(mintyLocale, 'minty.states.healthy', 'active'),
    highCpu: getMintyString(mintyLocale, 'minty.states.highCpu', 'active'),
    highRam: getMintyString(mintyLocale, 'minty.states.highRam', 'hungry'),
    highTemp: getMintyString(mintyLocale, 'minty.states.highTemp', 'hot'),
  };

  const stateBadgeColors = {
    healthy: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22c55e', label: stateLabels.healthy },
    highCpu: { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6', label: stateLabels.highCpu },
    highRam: { bg: 'rgba(234, 179, 8, 0.2)', text: '#eab308', label: stateLabels.highRam },
    highTemp: { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444', label: stateLabels.highTemp },
  };

  const badge = stateBadgeColors[systemState];

  // Bar colors
  const getCpuColor = () => {
    if (metrics.cpu.overall >= 80) return '#ef4444';
    if (metrics.cpu.overall >= 50) return '#3b82f6';
    return '#22c55e';
  };

  const getRamColor = () => {
    if (metrics.memory.percent >= 85) return '#ef4444';
    if (metrics.memory.percent >= 70) return '#eab308';
    return '#22c55e';
  };

  const getTempColor = () => {
    if (!metrics.temperature) return '#22c55e';
    if (metrics.temperature >= 70) return '#ef4444';
    if (metrics.temperature >= 55) return '#eab308';
    return '#22c55e';
  };

  return (
    <WidgetWrapper titleKey="widget_systemPet" noPadding>
      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes sweatDrop {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(10px); opacity: 0; }
        }
        @keyframes heatWave {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(-3px); opacity: 0.3; }
        }
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
        @keyframes minty-breathe {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.08) translateY(-3px); }
        }
        @keyframes circuit-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
        @keyframes warmGlow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(251, 146, 60, 0.6)); }
          50% { filter: drop-shadow(0 0 16px rgba(251, 146, 60, 0.8)); }
        }
        @keyframes rainDrop {
          0% { transform: translateY(-10px); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(30px); opacity: 0; }
        }
        .minty-ambient-fireplace {
          filter: brightness(1.1);
          animation: warmGlow 2s ease-in-out infinite;
        }
        .minty-ambient-rain {
          filter: hue-rotate(-10deg) brightness(0.9) saturate(1.2);
          position: relative;
        }
        .minty-ambient-rain::before {
          content: '💧';
          position: absolute;
          top: -15px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 1.8rem;
          animation: rainDrop 1.5s ease-in infinite;
          opacity: 0.8;
          pointer-events: none;
        }
        .minty-ambient-rain::after {
          content: '💧';
          position: absolute;
          top: -20px;
          left: 30%;
          font-size: 1.4rem;
          animation: rainDrop 1.8s ease-in infinite;
          animation-delay: 0.5s;
          opacity: 0.7;
          pointer-events: none;
        }
      `}</style>

      <div ref={containerRef} className="h-full p-3 flex flex-col">
        {/* Header with age and status */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
            <span>🔥</span> {ageLabel}
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: badge.bg, color: badge.text }}
          >
            {badge.label}
          </span>
        </div>

        {/* Speech bubble */}
        {showMessage && (
          <div className="text-center mb-1">
            <div
              className="inline-block bg-[var(--color-widget-border)] rounded-xl px-3 py-1.5 text-xs relative"
              style={{ animation: 'pop-in 0.3s ease-out' }}
            >
              {message}
              <div
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[var(--color-widget-border)]"
              />
            </div>
          </div>
        )}

        {/* Minty Character */}
        <div className="flex-1 flex items-center justify-center min-h-0 relative">
          <div
            className={`cursor-pointer hover:scale-105 transition-all duration-300 ${
              mintySize === 'small' ? 'w-20 h-20' : mintySize === 'large' ? 'w-44 h-44' : 'w-32 h-32'
            } ${hasFireplace ? 'minty-ambient-fireplace' : ''} ${hasRain ? 'minty-ambient-rain' : ''}`}
            onClick={handleMintyClick}
            title="Klicke für neuen Spruch"
          >
            <MintyCharacter state={systemState} cpu={metrics.cpu.overall} />
          </div>
        </div>

        {/* Stats bars */}
        <div className="space-y-2 mt-2">
          {/* CPU */}
          <div className="flex items-center gap-2">
            <span className="text-xs w-12 flex items-center gap-1">
              <span>⚡</span> CPU
            </span>
            <div className="flex-1 h-2 bg-[var(--color-widget-border)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${metrics.cpu.overall}%`,
                  backgroundColor: getCpuColor()
                }}
              />
            </div>
            <span className="text-[10px] text-[var(--color-text-secondary)] w-10 text-right">
              {metrics.cpu.overall.toFixed(0)}%
            </span>
          </div>

          {/* RAM */}
          <div className="flex items-center gap-2">
            <span className="text-xs w-12 flex items-center gap-1">
              <span>🍔</span> RAM
            </span>
            <div className="flex-1 h-2 bg-[var(--color-widget-border)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${metrics.memory.percent}%`,
                  backgroundColor: getRamColor()
                }}
              />
            </div>
            <span className="text-[10px] text-[var(--color-text-secondary)] w-10 text-right">
              {metrics.memory.percent.toFixed(0)}%
            </span>
          </div>

          {/* Temp */}
          <div className="flex items-center gap-2">
            <span className="text-xs w-12 flex items-center gap-1">
              <span>🌡️</span> Temp
            </span>
            <div className="flex-1 h-2 bg-[var(--color-widget-border)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (metrics.temperature ?? 40))}%`,
                  backgroundColor: getTempColor()
                }}
              />
            </div>
            <span className="text-[10px] text-[var(--color-text-secondary)] w-10 text-right">
              {metrics.temperature ? `${metrics.temperature.toFixed(0)}°` : 'n/a'}
            </span>
          </div>
        </div>
      </div>
    </WidgetWrapper>
  );
}
