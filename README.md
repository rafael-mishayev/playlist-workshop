# Playlist Workshop

[![Tests](https://github.com/rafael-mishayev/playlist-workshop/actions/workflows/test.yml/badge.svg)](https://github.com/rafael-mishayev/playlist-workshop/actions/workflows/test.yml)

A YouTube playlist manager with user accounts: search YouTube, watch videos, and
keep a personal playlist. Server-rendered with Express 5, EJS and SQLite on a
layered MVC + Repository architecture - no ORM, no frontend framework, no
client-side JavaScript.

## Features

- **Accounts** - register and log in; sessions are stored in SQLite and survive
  server restarts.
- **YouTube search** - search through the YouTube Data API v3 and play any result
  in an embedded player before deciding to save it.
- **Personal playlist** - save videos, play them later, and remove them. Each user
  only ever sees and controls their own items.
- **Graceful without an API key** - accounts and saved playlists work without one;
  search shows a configuration message instead of failing.
- **Friendly upstream errors** - timeouts, exhausted quota and YouTube failures
  render clear HTML error pages, with no automatic retries burning extra quota.

## Security highlights

- **Passwords** - bcrypt with cost 12. Passwords must be 8+ characters and at most
  72 UTF-8 bytes, because bcrypt silently truncates anything longer.
- **Sessions** - the session ID rotates on login and registration, logout destroys
  the stored session, and sessions expire after 30 minutes of inactivity. Cookies
  are HttpOnly, SameSite=Lax, and Secure in production.
- **CSRF** - every POST form carries a synchronizer token, compared in constant time.
- **No forged playlist entries** - the add form submits only a video ID. Title,
  thumbnail and channel come from the server's own copy of the user's latest search,
  so a crafted request can't inject fake metadata.
- **Ownership checks** - playlist playback and deletion query by both item ID and
  the authenticated user ID; search-result playback only accepts videos from the
  current user's latest results.
- **SQL injection** - all runtime SQL is parameterized and lives in repositories.
- **XSS** - EJS escapes every dynamic field, and the Content Security Policy allows
  YouTube frames and thumbnails but no page scripts.
- **Input validation** - input length, body size, IDs, thumbnail hosts and embed
  URLs are all validated.
- **Rate limiting** - 20 auth attempts per IP per 15 minutes and 10 searches per IP
  per minute.
- **No secret leakage** - passwords are never logged, and neither are Axios errors,
  since their config object contains the API key. The key never leaves the server.

## Architecture

| Directory | Responsibility |
| --- | --- |
| `src/models` | User, Video, PlaylistItem, AppError classes |
| `src/repositories` | Parameterized SQL; hydrate rows into entities |
| `src/services` | Authentication, playlist rules, YouTube HTTP, session store |
| `src/controllers` | Handle requests and render EJS views |
| `src/routes` | Route binding and rate-limit configuration |
| `src/views` | EJS pages and shared partials |
| `src/middleware` | Security headers, CSRF, authentication |
| `src/db` | SQLite initialization and schema |
| `public` | Responsive CSS |
| `test` | HTTP integration and service tests |

`src/app.js` is the composition root and wires everything with constructor
injection: controllers depend on services, services on repositories. `PlaylistItem`
extends `Video` and reuses its validated embed-URL getter, and views receive class
instances rather than raw rows.

## Database

- `users` - id, username, password_hash, created_at.
- `playlist_items` - id, user_id, video_id, title, thumbnail_url, channel_title,
  created_at.
- `sessions` - persisted sessions and their expiry.

Usernames are unique case-insensitively, and foreign keys enforce ownership.
`UNIQUE(user_id, video_id)` prevents duplicate playlist entries even under
concurrent submissions. WAL mode, foreign keys and a busy timeout are enabled, and
schema initialization is idempotent.

## Routes

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/` | Redirect to login or search |
| GET / POST | `/register` | Form / create account and log in |
| GET / POST | `/login` | Form / authenticate |
| POST | `/logout` | Destroy session |
| GET | `/search?q=...` | Search and render videos |
| GET | `/watch/:videoId` | Play a video from the latest search results |
| GET | `/playlist` | List owned items |
| POST | `/playlist` | Add a video from the latest successful search |
| POST | `/playlist/:id/remove` | Remove an owned item |
| GET | `/playlist/:id/play` | Play a video saved in the user's playlist |

Search, playback and playlist routes require login. Successful mutations redirect
with 303; errors render an EJS page with the relevant status code.

## Tests

```bash
npm test
```

The suite runs against the real Express routes, EJS views, bcrypt and temporary
SQLite files. It covers auth validation, case-insensitive duplicate usernames,
session rotation, missing and malformed CSRF tokens, SQL-injection-style input,
escaped titles, forged additions, duplicate items, ownership isolation, search-result
playback scoping, persistence after reopening the database, session expiry, and
logout. Service tests verify the YouTube request, Video mapping and failure handling
through an injected HTTP client, so no real API key or network access is needed.

## Getting started

Use Node.js 22 or 24 and npm:

```bash
npm ci
cp .env.example .env
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Copy the generated secret into `SESSION_SECRET` in `.env`, set your own
`YOUTUBE_API_KEY`, then run:

```bash
npm start
```

Open http://localhost:3000 (or use `npm run dev` for watch mode). The SQLite
database and its directory are created automatically. The native modules
better-sqlite3 and bcrypt may need Python and C/C++ build tools if no prebuilt
binary exists for your platform.

### YouTube API key

Create or select a Google Cloud project, enable YouTube Data API v3, create an API
key and restrict it to that API. On a server with fixed outbound IPs, add an IP
restriction too - browser referrer restrictions don't work for server-side
requests. No API key is included in this repository.

Searches request `part=snippet`, `type=video`, `videoEmbeddable=true` and
`maxResults=12`. Playlists are local to this app and never modify the user's
YouTube account. Only the latest search results are kept in the session, so an
older search tab may need a fresh search before playing or saving a video.

### Deployment notes

Production needs HTTPS, `NODE_ENV=production`, a strong session secret, and durable
storage for `DB_PATH`. Set `TRUST_PROXY=1` only behind exactly one trusted reverse
proxy (use `0` for local HTTP). Rate-limit counters are in-process, so running
multiple instances would require a shared rate-limit store and a different
database strategy.

## References

- [YouTube search.list](https://developers.google.com/youtube/v3/docs/search/list)
- [express-session](https://expressjs.com/en/resources/middleware/session/)
