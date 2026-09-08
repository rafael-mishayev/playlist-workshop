export class User {
  constructor({ id = null, username, password_hash, created_at = null }) {
    this.id = id;
    this.username = username;
    this.passwordHash = password_hash;
    this.createdAt = created_at;
  }
}
