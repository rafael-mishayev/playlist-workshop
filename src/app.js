import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'node:url';
import { Database } from './db/Database.js';
import { UserRepository } from './repositories/UserRepository.js';
import { PlaylistRepository } from './repositories/PlaylistRepository.js';
import { SessionRepository } from './repositories/SessionRepository.js';
import { SQLiteSessionStore } from './services/SQLiteSessionStore.js';
import { AuthService } from './services/AuthService.js';
import { PlaylistService } from './services/PlaylistService.js';
import { YouTubeService } from './services/YouTubeService.js';
import { AuthController } from './controllers/AuthController.js';
import { SearchController } from './controllers/SearchController.js';
import { PlaylistController } from './controllers/PlaylistController.js';
import { ErrorController } from './controllers/ErrorController.js';
import { SecurityMiddleware } from './middleware/SecurityMiddleware.js';
import { AppRoutes } from './routes/AppRoutes.js';
export class Application {
  constructor({ sessionSecret, dbPath = './data/playlist.sqlite', youtubeApiKey = '', production = false, trustProxy = false, youtubeService = null }) {
    if (!sessionSecret || sessionSecret.length < 32 || sessionSecret.startsWith('replace-'))
      throw new Error('Set SESSION_SECRET to at least 32 random characters.');
    this.database = new Database(dbPath);
    const users = new UserRepository(this.database.connection);
    const playlist = new PlaylistService(new PlaylistRepository(this.database.connection));
    this.store = new SQLiteSessionStore(new SessionRepository(this.database.connection));
    const security = new SecurityMiddleware(users);
    const errors = new ErrorController();
    this.app = express();
    this.app.disable('x-powered-by');
    if (trustProxy) this.app.set('trust proxy', 1);
    this.app.set('view engine', 'ejs');
    this.app.set('views', fileURLToPath(new URL('./views', import.meta.url)));
    this.app.use(security.headers.bind(security));
    this.app.use(express.static(fileURLToPath(new URL('../public', import.meta.url))));
    this.app.use(express.urlencoded({ extended: false, limit: '16kb', parameterLimit: 20 }));
    this.app.use(session({ name: 'playlist.sid', secret: sessionSecret, store: this.store, resave: false,
      saveUninitialized: false, rolling: true,
      cookie: { httpOnly: true, secure: production, sameSite: 'lax', maxAge: 30 * 60_000 } }));
    this.app.use(security.locals.bind(security));
    this.app.use(security.csrf.bind(security));
    this.app.use(new AppRoutes(new AuthController(new AuthService(users)),
      new SearchController(youtubeService ?? new YouTubeService(youtubeApiKey), playlist),
      new PlaylistController(playlist), security, errors).router);
    this.app.use(errors.handle.bind(errors));
  }
  close() { this.store.close(); this.database.close(); }
}
