export class SessionRepository {
  constructor(db) { this.db = db; }
  find(sid) {
    const row = this.db.prepare('SELECT data FROM sessions WHERE sid = ? AND expires_at > ?').get(sid, Date.now());
    return row ? JSON.parse(row.data) : null;
  }
  save(sid, data, expires) {
    this.db.prepare(`INSERT INTO sessions(sid, data, expires_at) VALUES (?, ?, ?)
      ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at`).run(sid, JSON.stringify(data), expires);
  }
  touch(sid, expires) { this.db.prepare('UPDATE sessions SET expires_at = ? WHERE sid = ?').run(expires, sid); }
  remove(sid) { this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid); }
  prune() { this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now()); }
}
