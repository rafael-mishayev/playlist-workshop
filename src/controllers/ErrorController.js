import { AppError } from '../models/AppError.js';
export class ErrorController {
  authRateLimit(req, res) { res.status(429).render('error', { title: 'Please wait', message: 'Too many sign-in attempts. Try again in 15 minutes.' }); }
  searchRateLimit(req, res) { res.status(429).render('error', { title: 'Please wait', message: 'Too many searches. Try again in one minute.' }); }
  notFound(req, res) { res.status(404).render('error', { title: 'Not found', message: 'That page does not exist.' }); }
  handle(error, req, res, next) {
    if (res.headersSent) return next(error);
    const status = error instanceof AppError ? error.status : error.status === 413 ? 413 : 500;
    if (status === 500) console.error('Request failed:', error.name); // No request body, credentials, or upstream config.
    res.status(status).render('error', { title: `Error ${status}`, message: error instanceof AppError
      ? error.message : status === 413 ? 'The submitted form is too large.' : 'Something went wrong. Please try again.',
      currentUser: res.locals.currentUser ?? null, csrfToken: res.locals.csrfToken ?? '', notice: null });
  }
}
