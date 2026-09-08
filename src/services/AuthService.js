import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { AppError } from '../models/AppError.js';
export class AuthService {
  constructor(users) {
    this.users = users;
    this.dummyHash = bcrypt.hashSync('dummy-password-for-timing', 12);
  }
  validate(username, password) {
    if (typeof username !== 'string' || !/^[A-Za-z0-9_]{3,30}$/.test(username.trim()))
      throw new AppError('Username must be 3–30 letters, numbers, or underscores.');
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72)
      throw new AppError('Password must contain at least 8 characters and at most 72 UTF-8 bytes.');
  }
  async register(username, password, confirmation) {
    this.validate(username, password);
    if (password !== confirmation) throw new AppError('Passwords do not match.');
    const user = new User({ username: username.trim(), password_hash: await bcrypt.hash(password, 12) });
    try { return this.users.create(user); }
    catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') throw new AppError('That username is already taken.', 409);
      throw error;
    }
  }
  async login(username, password) {
    if (typeof username !== 'string' || typeof password !== 'string' || username.length > 100 || Buffer.byteLength(password) > 72)
      throw new AppError('Invalid username or password.', 401);
    const user = this.users.findByUsername(username.trim());
    const valid = await bcrypt.compare(password, user?.passwordHash ?? this.dummyHash);
    if (!user || !valid) throw new AppError('Invalid username or password.', 401);
    return user;
  }
}
