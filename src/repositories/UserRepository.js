import { User } from '../models/User.js';
export class UserRepository {
  constructor(db) { this.db = db; }
  findByUsername(username) {
    const row = this.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    return row ? new User(row) : null;
  }
  findById(id) {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return row ? new User(row) : null;
  }
  create(user) {
    const result = this.db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(user.username, user.passwordHash);
    return this.findById(Number(result.lastInsertRowid));
  }
}
