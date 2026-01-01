import fs from 'fs';
import path from 'path';
import { getConfig } from './configService.js';
import type { CalendarEvent } from '../../../shared/types/index.js';

interface CachedEvents {
  events: CalendarEvent[];
  fetchedAt: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cache: CachedEvents | null = null;

function parseICSTimestamp(value: string): number {
  // Handle all-day (VALUE=DATE)
  if (value.length === 8) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6)) - 1;
    const day = Number(value.slice(6, 8));
    return new Date(year, month, day).getTime();
  }

  // Basic UTC or local time parsing
  if (value.endsWith('Z')) {
    return Date.parse(value);
  }

  // YYYYMMDDTHHmmss or with TZID prefix (strip it)
  const parts = value.split(':');
  const datePart = parts.length > 1 ? parts[1] : parts[0];
  const year = Number(datePart.slice(0, 4));
  const month = Number(datePart.slice(4, 6)) - 1;
  const day = Number(datePart.slice(6, 8));
  const hour = Number(datePart.slice(9, 11));
  const minute = Number(datePart.slice(11, 13));
  const second = Number(datePart.slice(13, 15));
  return new Date(year, month, day, hour, minute, second).getTime();
}

function parseICSFile(filePath: string, calendarName: string): CalendarEvent[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const blocks = content.split('BEGIN:VEVENT').slice(1);

  return blocks
    .map((block, index) => {
      const lines = block.split(/\r?\n/);
      const summaryLine = lines.find((l) => l.startsWith('SUMMARY'));
      const startLine = lines.find((l) => l.startsWith('DTSTART'));
      const endLine = lines.find((l) => l.startsWith('DTEND'));
      const locationLine = lines.find((l) => l.startsWith('LOCATION'));

      if (!startLine || !endLine) return null;

      const startValue = startLine.split(':').slice(1).join(':').trim();
      const endValue = endLine.split(':').slice(1).join(':').trim();

      const start = parseICSTimestamp(startValue);
      const end = parseICSTimestamp(endValue);
      const allDay = startValue.length === 8;

      return {
        id: `${path.basename(filePath)}-${index}`,
        title: summaryLine ? summaryLine.split(':').slice(1).join(':').trim() : 'Termin',
        start,
        end,
        allDay,
        location: locationLine ? locationLine.split(':').slice(1).join(':').trim() : undefined,
        calendar: calendarName,
      } as CalendarEvent;
    })
    .filter((e): e is CalendarEvent => Boolean(e));
}

export async function getCalendarEvents(daysAhead = 3): Promise<CalendarEvent[]> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL) {
    return cache.events;
  }

  const cfg = getConfig();
  const events: CalendarEvent[] = [];

  // ICS sources
  for (const icsPath of cfg.calendar.icsPaths) {
    const resolved = icsPath.startsWith('~')
      ? path.join(process.env.HOME || '', icsPath.slice(1))
      : icsPath;
    events.push(...parseICSFile(resolved, path.basename(resolved)));
  }

  // CalDAV placeholder (not implemented yet)
  if (cfg.calendar.caldav.length > 0) {
    console.warn('CalDAV sources configured but fetching is not implemented yet.');
  }

  const windowEnd = now + daysAhead * 24 * 60 * 60 * 1000;
  const filtered = events.filter((event) => event.end >= now && event.start <= windowEnd);

  filtered.sort((a, b) => a.start - b.start);
  cache = { events: filtered, fetchedAt: now };
  return filtered;
}
