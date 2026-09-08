import session from 'express-session';
export class SQLiteSessionStore extends session.Store {
  constructor(repository) {
    super();
    this.repository = repository;
    this.timer = setInterval(() => {
      try { repository.prune(); } catch { console.error('Session cleanup failed'); }
    }, 60_000);
    this.timer.unref();
  }
  expiration(data) { return new Date(data.cookie.expires).getTime(); }
  get(sid, callback) {
    let data;
    try { data = this.repository.find(sid); } catch (error) { return callback(error); }
    callback(null, data);
  }
  set(sid, data, callback = () => {}) {
    try { this.repository.save(sid, data, this.expiration(data)); } catch (error) { return callback(error); }
    callback(null);
  }
  touch(sid, data, callback = () => {}) {
    try { this.repository.touch(sid, this.expiration(data)); } catch (error) { return callback(error); }
    callback(null);
  }
  destroy(sid, callback = () => {}) {
    try { this.repository.remove(sid); } catch (error) { return callback(error); }
    callback(null);
  }
  close() { clearInterval(this.timer); }
}
