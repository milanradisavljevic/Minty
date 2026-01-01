import { db } from './db.js';
import type { Task, Note } from '../../../shared/types/index.js';

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    note TEXT,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`
).run();

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`
).run();

const mapTask = (row: any): Task => ({
  id: row.id,
  title: row.title,
  note: row.note || undefined,
  completed: Boolean(row.completed),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapNote = (row: any): Note => ({
  id: row.id,
  content: row.content,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function listTasks(): Task[] {
  const stmt = db.prepare('SELECT * FROM tasks ORDER BY completed ASC, updated_at DESC');
  const rows = stmt.all();
  return rows.map(mapTask);
}

export function createTask(title: string, note?: string): Task {
  const now = Date.now();
  const result = db
    .prepare('INSERT INTO tasks(title, note, completed, created_at, updated_at) VALUES(?, ?, 0, ?, ?)')
    .run(title, note ?? null, now, now);

  return mapTask({
    id: result.lastInsertRowid,
    title,
    note,
    completed: 0,
    created_at: now,
    updated_at: now,
  });
}

export function updateTask(id: number, changes: Partial<Omit<Task, 'id'>>): Task | null {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) return null;

  const updated = {
    ...existing,
    title: changes.title ?? existing.title,
    note: changes.note ?? existing.note,
    completed: typeof changes.completed === 'boolean' ? Number(changes.completed) : existing.completed,
    updated_at: Date.now(),
  };

  db.prepare(
    'UPDATE tasks SET title = ?, note = ?, completed = ?, updated_at = ? WHERE id = ?'
  ).run(updated.title, updated.note, updated.completed, updated.updated_at, id);

  return mapTask(updated);
}

export function deleteTask(id: number): boolean {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return result.changes > 0;
}

export function listNotes(): Note[] {
  const stmt = db.prepare('SELECT * FROM notes ORDER BY updated_at DESC');
  return stmt.all().map(mapNote);
}

export function createNote(content: string): Note {
  const now = Date.now();
  const result = db.prepare('INSERT INTO notes(content, created_at, updated_at) VALUES(?, ?, ?)').run(content, now, now);
  return mapNote({ id: result.lastInsertRowid, content, created_at: now, updated_at: now });
}

export function updateNote(id: number, content: string): Note | null {
  const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  if (!existing) return null;
  const now = Date.now();
  db.prepare('UPDATE notes SET content = ?, updated_at = ? WHERE id = ?').run(content, now, id);
  return mapNote({ ...existing, content, updated_at: now });
}

export function deleteNote(id: number): boolean {
  const result = db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  return result.changes > 0;
}
