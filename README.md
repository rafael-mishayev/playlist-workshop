# Playlist Workshop

Server-rendered Node.js course project: Express, EJS, SQLite, ES6 classes, MVC,
and the Repository Pattern. No frontend framework or ORM.

## Quick start

Use Node.js 22 or 24 LTS and npm. From this directory:

```bash
npm ci
cp .env.example .env
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Copy the generated secret into `SESSION_SECRET` in `.env`. Set your own
`YOUTUBE_API_KEY`, then run:

```bash
npm start
```

Open http://localhost:3000. Use `npm run dev` for watch mode. SQLite tables and the
data directory are created automatically. Never commit `.env` or `data/`.
Native modules better-sqlite3 and bcrypt may require Python and C/C++ build tools
if a prebuilt binary is unavailable for your platform.

## YouTube configuration

Create/select a Google Cloud project, enable YouTube Data API v3, create an API
key, and restrict it to that API. For servers with fixed outbound IPs, add an IP
restriction; browser referrer restrictions do not suit server-side requests.
Put the key in `.env` and restart. No API key is included in this project.

Authentication and saved playlists work without a key; search shows a configuration
message. Requests use `part=snippet`, `type=video`, `videoEmbeddable=true`, and
`maxResults=12`. The key stays on the server. Timeout, quota, and upstream failures
render HTML errors. No automatic retries consume extra quota.

Playlists are local to this application and do not modify YouTube accounts.
Videos can later become unavailable or restricted; the player includes a link to
watch on YouTube.

Users can play a video directly from the latest search results before saving it.
Search-result playback uses the results stored in the server-side session and does
not perform another YouTube API request. Because only the latest results are kept,
an older search page may require the user to search again before playing or saving
a video.

## Architecture

| Directory | Responsibility |
| --- | --- |
| `src/models` | User, Video, PlaylistItem, AppError classes |
| `src/repositories` | Parameterized runtime SQL; hydrate rows into entities |
| `src/services` | Authentication, playlist rules, YouTube HTTP, session adapter |
| `src/controllers` | Class methods handling requests and rendering EJS |
| `src/routes` | Route binding and rate-limit configuration |
| `src/views` | Complete EJS pages and shared partials |
| `src/middleware` | Class-based security headers, CSRF, authentication |
| `src/db` | SQLite initialization and static schema |
| `public` | Responsive CSS |
| `test` | HTTP integration and service tests |

`src/app.js` is the composition root, using constructor injection. `src/server.js`
loads dotenv and starts the server. Controllers depend on services, services on
repositories. Views receive class instances. PlaylistItem extends Video and reuses
its validated embed URL getter. JSON/config objects are used only for framework
configuration, upstream transport, and session serialization. Cached videos are
rehydrated before saving. EJS escapes all dynamic fields; only trusted partial
includes use unescaped output.

## Database

- `users`: id, username, password_hash, created_at.
- `playlist_items`: id, user_id, video_id, title, thumbnail_url, channel_title,
  created_at.
- `sessions`: additional infrastructure table for persisted sessions and expiry.

Usernames are case-insensitively unique. Foreign keys enforce ownership links.
`UNIQUE(user_id, video_id)` prevents duplicate playlist entries even under concurrent
submissions. WAL, foreign keys, and a busy timeout are enabled. Schema initialization
is idempotent; future changes to existing tables require explicit migrations.
Static schema DDL runs during initialization; all runtime SQL is in repositories.

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

Search, search-result playback, and playlist routes require login. All POST forms
require a CSRF token. Successful mutations redirect with 303; errors render EJS
with relevant statuses.

## Validation and security

- bcrypt cost 12; passwords require at least 8 characters and at most 72 UTF-8
  bytes to avoid silent bcrypt truncation.
- Session IDs rotate on login/registration; logout destroys the stored session.
- SQLite-backed sessions survive restarts and expire after 30 minutes of inactivity.
  Cookies are HttpOnly, SameSite=Lax, and Secure in production.
- Synchronizer-token CSRF protection uses constant-time comparison.
- Playlist playback and deletion query by both item ID and authenticated user ID.
- Search-result playback accepts only videos contained in the latest server-side
  search results stored in the authenticated user's session.
- Add forms submit only the video ID. Metadata comes from the server's most recent
  successful search, preventing forged titles/URLs. Older tabs may need a new search.
- Input length, body size, IDs, thumbnail hosts, and embed URLs are validated.
- CSP allows YouTube frames/thumbnails and disallows page scripts. Referrer policy
  preserves origin information required for embedding.
- Rate limits: 20 auth attempts/IP/15 minutes and 10 search-page requests/IP/minute.
  Counters are process-local and reset on restart.
- Passwords and Axios errors are not logged; Axios config can expose the API key.

Deployment requires HTTPS, NODE_ENV=production, a strong secret, and durable storage
for DB_PATH. Set TRUST_PROXY=1 only behind exactly one trusted reverse proxy; use
0 for local HTTP. Multiple server instances would need coordinated rate limiting
and a suitable database strategy. This is a single-process course application.

## Tests

```bash
npm test
```

The suite uses actual Express routes, EJS, bcrypt, and temporary SQLite files. It
covers auth validation, case-insensitive duplicate usernames, session rotation,
missing/malformed CSRF, SQL-injection-style input, escaped titles, forged additions,
duplicate items, ownership isolation, session/playlist persistence after reopening
the database, expiration, and logout. Service tests verify the YouTube request,
Video mapping, and failure responses using an injected client.

Direct playback from search results is implemented through the same validated
`Video` entity and player view. Add a dedicated HTTP integration test for
`/watch/:videoId` if this optional feature is part of the submitted grading scope.

Live Google search and actual iframe playback require your API key and a browser;
the automated tests use deterministic fixtures for the external service.

## References

- [YouTube search.list](https://developers.google.com/youtube/v3/docs/search/list)
- [express-session](https://expressjs.com/en/resources/middleware/session/)
