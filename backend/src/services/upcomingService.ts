import Database from 'better-sqlite3';
import { CONFIG_DIR } from './db.js';
import path from 'path';

const DB_PATH = path.join(CONFIG_DIR, 'dashboard.db');

// Get or create database connection
function getDb() {
  const db = new Database(DB_PATH);

  // Create table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS upcoming (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'personal',
      url TEXT,
      notes TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);

  return db;
}

export interface UpcomingItem {
  id: number;
  title: string;
  date: string;
  category: 'tech' | 'gaming' | 'entertainment' | 'finance' | 'personal';
  url?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

interface DbRow {
  id: number;
  title: string;
  date: string;
  category: string;
  url: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

function rowToItem(row: DbRow): UpcomingItem {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    category: row.category as UpcomingItem['category'],
    url: row.url || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listUpcoming(): UpcomingItem[] {
  const db = getDb();
  try {
    const rows = db.prepare('SELECT * FROM upcoming ORDER BY date ASC').all() as DbRow[];
    return rows.map(rowToItem);
  } finally {
    db.close();
  }
}

export function createUpcoming(
  title: string,
  date: string,
  category: string,
  url?: string,
  notes?: string
): UpcomingItem {
  const db = getDb();
  try {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO upcoming (title, date, category, url, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(title, date, category, url || null, notes || null, now, now);

    const row = db.prepare('SELECT * FROM upcoming WHERE id = ?').get(result.lastInsertRowid) as DbRow;
    return rowToItem(row);
  } finally {
    db.close();
  }
}

export function updateUpcoming(
  id: number,
  updates: Partial<{ title: string; date: string; category: string; url: string; notes: string }>
): UpcomingItem | null {
  const db = getDb();
  try {
    const existing = db.prepare('SELECT * FROM upcoming WHERE id = ?').get(id) as DbRow | undefined;
    if (!existing) return null;

    const now = Date.now();
    const newTitle = updates.title ?? existing.title;
    const newDate = updates.date ?? existing.date;
    const newCategory = updates.category ?? existing.category;
    const newUrl = updates.url !== undefined ? (updates.url || null) : existing.url;
    const newNotes = updates.notes !== undefined ? (updates.notes || null) : existing.notes;

    db.prepare(`
      UPDATE upcoming
      SET title = ?, date = ?, category = ?, url = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(newTitle, newDate, newCategory, newUrl, newNotes, now, id);

    const row = db.prepare('SELECT * FROM upcoming WHERE id = ?').get(id) as DbRow;
    return rowToItem(row);
  } finally {
    db.close();
  }
}

export function deleteUpcoming(id: number): boolean {
  const db = getDb();
  try {
    const result = db.prepare('DELETE FROM upcoming WHERE id = ?').run(id);
    return result.changes > 0;
  } finally {
    db.close();
  }
}
