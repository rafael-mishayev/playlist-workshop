import 'dotenv/config';
import { Application } from './app.js';
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
const application = new Application({ sessionSecret: process.env.SESSION_SECRET, dbPath: process.env.DB_PATH,
  youtubeApiKey: process.env.YOUTUBE_API_KEY, production: process.env.NODE_ENV === 'production',
  trustProxy: process.env.TRUST_PROXY === '1' });
const server = application.app.listen(port, () => console.log(`Playlist Workshop: http://localhost:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  server.close(() => { application.close(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
});
