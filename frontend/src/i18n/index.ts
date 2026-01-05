import { useSettingsStore, type Language } from '../stores/settingsStore';
import deTranslations from './locales/de.json';
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import srTranslations from './locales/sr.json';

type Translations = typeof deTranslations;
type TranslationRecord = Record<string, unknown>;

const translations: Record<Language, Translations> = {
  de: deTranslations,
  en: enTranslations,
  es: esTranslations,
  sr: srTranslations,
};

const isRecord = (value: unknown): value is TranslationRecord =>
  typeof value === 'object' && value !== null;

/**
 * Get nested translation by dot-notation key
 * Example: t('settings.title') => 'Einstellungen'
 */
export function useTranslation() {
  const language = useSettingsStore((state) => state.general?.language || 'de');

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: unknown = translations[language];

    for (const k of keys) {
      if (isRecord(value) && k in value) {
        value = value[k];
      } else {
        // Fallback to English if key not found
        value = translations.en;
        for (const fallbackKey of keys) {
          if (isRecord(value) && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            return key; // Return key if not found in any language
          }
        }
        break;
      }
    }

    return typeof value === 'string' ? value : key;
  };

  /**
   * Get array of translations for Minty comments
   */
  const tArray = (key: string): string[] => {
    const keys = key.split('.');
    let value: unknown = translations[language];

    for (const k of keys) {
      if (isRecord(value) && k in value) {
        value = value[k];
      } else {
        return [];
      }
    }

    return Array.isArray(value) ? value : [];
  };

  return { t, tArray, language };
}

/**
 * Get browser locale (fallback for system language)
 */
export function getBrowserLocale(): Language {
  const browserLang = navigator.language.split('-')[0];

  if (browserLang === 'de') return 'de';
  if (browserLang === 'es') return 'es';
  if (browserLang === 'sr') return 'sr';

  return 'en'; // Default fallback
}

/**
 * Format time according to locale settings
 */
export function formatTime(
  date: Date,
  options: {
    timeFormat?: '24h' | '12h' | 'system';
    showSeconds?: boolean;
  } = {}
): string {
  const { timeFormat = 'system', showSeconds = true } = options;

  const formatOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds && { second: '2-digit' }),
  };

  if (timeFormat === '12h') {
    formatOptions.hour12 = true;
  } else if (timeFormat === '24h') {
    formatOptions.hour12 = false;
  }
  // 'system' leaves hour12 undefined, using browser default

  return date.toLocaleTimeString(undefined, formatOptions);
}

/**
 * Format date according to locale settings
 */
export function formatDate(
  date: Date,
  options: {
    dateFormat?: 'DMY' | 'MDY' | 'YMD' | 'long' | 'system';
    showWeekday?: boolean;
    weekdayFormat?: 'short' | 'long';
  } = {}
): string {
  const { dateFormat = 'system', showWeekday = false, weekdayFormat = 'long' } = options;

  if (dateFormat === 'system') {
    const formatOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...(showWeekday && { weekday: weekdayFormat }),
    };
    return date.toLocaleDateString(undefined, formatOptions);
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  let weekdayStr = '';
  if (showWeekday) {
    const formatOptions: Intl.DateTimeFormatOptions = {
      weekday: weekdayFormat,
    };
    weekdayStr = date.toLocaleDateString(undefined, formatOptions) + ', ';
  }

  switch (dateFormat) {
    case 'DMY':
      return `${weekdayStr}${day}.${month}.${year}`;
    case 'MDY':
      return `${weekdayStr}${month}/${day}/${year}`;
    case 'YMD':
      return `${weekdayStr}${year}-${month}-${day}`;
    case 'long':
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...(showWeekday && { weekday: weekdayFormat }),
      });
    default:
      return `${weekdayStr}${day}.${month}.${year}`;
  }
}
