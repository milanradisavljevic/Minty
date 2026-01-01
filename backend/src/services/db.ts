import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'ultrawide-dashboard');
const DB_PATH = path.join(CONFIG_DIR, 'data.db');

// Ensure config directory exists before opening DB
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Settings table for generic key/value persistence (JSON stored as text)
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  )
`
).run();

export function getSetting<T>(key: string, fallback: T): T {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export function setSetting<T>(key: string, value: T): void {
  const payload = JSON.stringify(value);
  db.prepare(
    `
    INSERT INTO settings(key, value, updated_at)
    VALUES(?, ?, strftime('%s','now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `
  ).run(key, payload);
}

export { db, DB_PATH, CONFIG_DIR };
