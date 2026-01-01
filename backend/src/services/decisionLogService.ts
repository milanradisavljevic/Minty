import { db } from './db.js';
import type { Decision } from '../../../shared/types/index.js';

// 1. Create Table
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    reason TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`
).run();

// 2. Row Mapper
const mapDecision = (row: any): Decision => ({
  id: row.id,
  title: row.title,
  reason: row.reason || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// 3. Service Functions
export function listDecisions(): Decision[] {
  const stmt = db.prepare('SELECT * FROM decisions ORDER BY created_at DESC');
  const rows = stmt.all();
  return rows.map(mapDecision);
}

export function createDecision(title: string, reason?: string): Decision {
  const now = Date.now();
  const result = db
    .prepare('INSERT INTO decisions(title, reason, created_at, updated_at) VALUES(?, ?, ?, ?)')
    .run(title, reason ?? null, now, now);

  return mapDecision({
    id: result.lastInsertRowid,
    title,
    reason,
    created_at: now,
    updated_at: now,
  });
}
