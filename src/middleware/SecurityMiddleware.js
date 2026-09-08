import { randomBytes, timingSafeEqual } from 'node:crypto';
import { AppError } from '../models/AppError.js';
export class SecurityMiddleware {
  constructor(users) { this.users = users; }
  headers(req, res, next) {
    res.set({
      'Content-Security-Policy': "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' https://i.ytimg.com https://img.youtube.com; frame-src https://www.youtube.com; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY', 'Cache-Control': 'no-store'
    });
    next();
  }
  locals(req, res, next) {
    req.session.csrfToken ??= randomBytes(32).toString('hex');
    req.user = req.session.userId ? this.users.findById(req.session.userId) : null;
    res.locals.currentUser = req.user;
    res.locals.csrfToken = req.session.csrfToken;
    res.locals.notice = req.session.notice ?? null;
    delete req.session.notice;
    next();
  }
  csrf(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const token = req.body?._csrf;
    const expected = req.session.csrfToken;
    if (typeof token !== 'string' || Buffer.byteLength(token) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(expected)))
      throw new AppError('This form has expired. Reload the page and try again.', 403);
    next();
  }
  requireAuth(req, res, next) { if (!req.user) return res.redirect('/login'); next(); }
}
