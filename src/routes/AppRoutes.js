import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
export class AppRoutes {
  constructor(auth, search, playlist, security, errors) {
    this.router = Router();
    const authLimit = rateLimit({
      windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false,
      handler: errors.authRateLimit.bind(errors)
    });
    const searchLimit = rateLimit({
      windowMs: 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
      handler: errors.searchRateLimit.bind(errors)
    });
    this.router.get('/', auth.home.bind(auth));
    this.router.get(['/login', '/register'], auth.form.bind(auth));
    this.router.post(['/login', '/register'], authLimit, auth.authenticate.bind(auth));
    this.router.post('/logout', auth.logout.bind(auth));
    this.router.get('/search', security.requireAuth.bind(security), searchLimit, search.index.bind(search));
    this.router.get('/watch/:videoId', security.requireAuth.bind(security), search.player.bind(search));
    this.router.get('/playlist', security.requireAuth.bind(security), playlist.index.bind(playlist));
    this.router.post('/playlist', security.requireAuth.bind(security), playlist.add.bind(playlist));
    this.router.post('/playlist/:id/remove', security.requireAuth.bind(security), playlist.remove.bind(playlist));
    this.router.get('/playlist/:id/play', security.requireAuth.bind(security), playlist.player.bind(playlist));
    this.router.use(errors.notFound.bind(errors));
  }
}
