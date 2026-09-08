import Sqlite from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
export class Database {
  constructor(filename) {
    if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true });
    this.connection = new Sqlite(filename);
    this.connection.pragma('journal_mode = WAL');
    this.connection.pragma('foreign_keys = ON');
    this.connection.pragma('busy_timeout = 5000');
    this.connection.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  }
  close() { this.connection.close(); }
}
