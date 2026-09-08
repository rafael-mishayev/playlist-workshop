import { AppError } from '../models/AppError.js';
export class AuthController {
  constructor(service) { this.service = service; }
  home(req, res) { res.redirect(req.user ? '/search' : '/login'); }
  form(req, res) {
    if (req.user) return res.redirect('/search');
    const mode = req.path === '/register' ? 'register' : 'login';
    res.render('auth', { title: mode === 'register' ? 'Create account' : 'Log in', mode, error: null, username: '' });
  }
  async authenticate(req, res) {
    const mode = req.path === '/register' ? 'register' : 'login';
    try {
      const user = mode === 'register'
        ? await this.service.register(req.body.username, req.body.password, req.body.confirmPassword)
        : await this.service.login(req.body.username, req.body.password);
      await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
      req.session.userId = user.id;
      await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
      res.redirect(303, '/search');
    } catch (error) {
      if (!(error instanceof AppError)) throw error;
      res.status(error.status).render('auth', { title: mode === 'register' ? 'Create account' : 'Log in', mode,
        error: error.message, username: typeof req.body.username === 'string' ? req.body.username.slice(0, 30) : '' });
    }
  }
  async logout(req, res) {
    await new Promise((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve()));
    res.clearCookie('playlist.sid', { path: '/' });
    res.redirect(303, '/login');
  }
}
