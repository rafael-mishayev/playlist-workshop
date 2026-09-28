import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import bcrypt from 'bcrypt';
import { Application } from '../src/app.js';
import { Video } from '../src/models/Video.js';
import { YouTubeService } from '../src/services/YouTubeService.js';
import { UserRepository } from '../src/repositories/UserRepository.js';
import { SessionRepository } from '../src/repositories/SessionRepository.js';
const secret = 'test-secret-with-more-than-thirty-two-characters';
const token = response => response.text.match(/name="_csrf" value="([a-f0-9]+)"/)[1];
class FakeYouTubeService {
  async search() { return [new Video({ videoId: 'dQw4w9WgXcQ', title: '<script>alert(1)</script>', thumbnailUrl: '', channelTitle: 'Test channel' })]; }
}
const config = { sessionSecret: secret, youtubeService: new FakeYouTubeService() };

test('SSR authentication, CSRF, ownership, persistence, and logout', async t => {
  const dir = mkdtempSync(join(process.cwd(), '.test-playlist-'));
  let application = new Application({ ...config, dbPath: join(dir, 'test.sqlite') });
  t.after(() => { application.close(); rmSync(dir, { recursive: true, force: true }); });
  const alice = request.agent(application.app);
  await alice.get('/playlist').expect(302).expect('Location', '/login');
  let page = await alice.get('/register').expect(200).expect('Content-Type', /html/);
  const initialCookie = page.headers['set-cookie'][0].split(';')[0];
  await alice.post('/register').type('form').send({ username: 'alice', password: 'password123' }).expect(403);
  await alice.post('/register').type('form').send({ _csrf: 'é'.repeat(64), username: 'alice' }).expect(403);
  await alice.post('/register').type('form').send({ _csrf: token(page), username: 'alice', password: 'short', confirmPassword: 'short' }).expect(400);
  const registered = await alice.post('/register').type('form').send({ _csrf: token(page), username: 'alice', password: 'password123', confirmPassword: 'password123' }).expect(303);
  const loggedCookie = registered.headers['set-cookie'][0].split(';')[0];
  assert.notEqual(loggedCookie, initialCookie, 'session ID rotates');
  assert.match(registered.headers['set-cookie'][0], /HttpOnly/);
  const user = new UserRepository(application.database.connection).findByUsername('alice');
  assert.notEqual(user.passwordHash, 'password123');
  assert.ok(await bcrypt.compare('password123', user.passwordHash));
  page = await alice.get('/search?q=music').expect(200);
  assert.match(page.text, /&lt;script&gt;/);
  assert.ok(!page.text.includes('<script>alert(1)</script>'));
  const csrf = token(page);
  await alice.post('/playlist').type('form').send({ _csrf: csrf, videoId: 'aaaaaaaaaaa', title: 'forged' }).expect(400);
  await alice.post('/playlist').type('form').send({ _csrf: csrf, videoId: 'dQw4w9WgXcQ' }).expect(303);
  await alice.post('/playlist').type('form').send({ _csrf: csrf, videoId: 'dQw4w9WgXcQ' }).expect(303);
  page = await alice.get('/playlist').expect(200);
  assert.match(page.text, /1 video/);
  const id = page.text.match(/href="\/playlist\/(\d+)\/play"/)[1];
  await alice.get(`/playlist/${id}/play`).expect(200).expect(/https:\/\/www.youtube.com\/embed\/dQw4w9WgXcQ/);
  const bob = request.agent(application.app);
  page = await bob.get('/register');
  await bob.post('/register').type('form').send({ _csrf: token(page), username: 'bob', password: 'password123', confirmPassword: 'password123' }).expect(303);
  page = await bob.get('/playlist');
  await bob.get(`/playlist/${id}/play`).expect(404);
  await bob.post(`/playlist/${id}/remove`).type('form').send({ _csrf: token(page) }).expect(404);
  // Reopen the actual SQLite file: both session and playlist survive a restart.
  application.close();
  application = new Application({ ...config, dbPath: join(dir, 'test.sqlite') });
  const resumed = request.agent(application.app);
  page = await resumed.get('/playlist').set('Cookie', loggedCookie).expect(200);
  assert.match(page.text, /1 video/);
  await resumed.post(`/playlist/${id}/remove`).set('Cookie', loggedCookie).type('form').send({ _csrf: token(page) }).expect(303);
  page = await resumed.get('/playlist').expect(200);
  assert.match(page.text, /Your playlist is empty/);
  await resumed.post('/logout').type('form').send({ _csrf: token(page) }).expect(303);
  await resumed.get('/playlist').set('Cookie', loggedCookie).expect(302);
  const login = request.agent(application.app);
  page = await login.get('/login');
  await login.post('/login').type('form').send({ _csrf: token(page), username: "alice' OR 1=1 --", password: 'password123' }).expect(401);
  await login.post('/login').type('form').send({ _csrf: token(page), username: 'alice', password: 'wrong' }).expect(401);
  await login.post('/login').type('form').send({ _csrf: token(page), username: 'ALICE', password: 'password123' }).expect(303);
  const duplicate = request.agent(application.app);
  page = await duplicate.get('/register');
  await duplicate.post('/register').type('form').send({ _csrf: token(page), username: 'Alice', password: 'password123', confirmPassword: 'password123' }).expect(409);
  const sessions = new SessionRepository(application.database.connection);
  sessions.save('expired', { cookie: {} }, Date.now() - 1);
  assert.equal(sessions.find('expired'), null);
});

test('Search-result playback is limited to the session\'s latest results', async t => {
  const dir = mkdtempSync(join(process.cwd(), '.test-playlist-'));
  const application = new Application({ ...config, dbPath: join(dir, 'test.sqlite') });
  t.after(() => { application.close(); rmSync(dir, { recursive: true, force: true }); });
  const register = async username => {
    const agent = request.agent(application.app);
    const page = await agent.get('/register');
    await agent.post('/register').type('form').send({ _csrf: token(page), username, password: 'password123', confirmPassword: 'password123' }).expect(303);
    return agent;
  };
  await request(application.app).get('/watch/dQw4w9WgXcQ').expect(302).expect('Location', '/login');
  const alice = await register('alice');
  await alice.get('/watch/dQw4w9WgXcQ').expect(404);
  await alice.get('/search?q=music').expect(200);
  const player = await alice.get('/watch/dQw4w9WgXcQ').expect(200).expect(/https:\/\/www.youtube.com\/embed\/dQw4w9WgXcQ/);
  assert.match(player.text, /&lt;script&gt;/);
  assert.ok(!player.text.includes('<script>alert(1)</script>'));
  await alice.get('/watch/aaaaaaaaaaa').expect(404);
  const bob = await register('bob');
  await bob.get('/watch/dQw4w9WgXcQ').expect(404);
});

test('YouTube request contract, entities, and safe upstream failures', async () => {
  const service = new YouTubeService('private-key', { async get(url, options) {
    assert.equal(url, 'https://www.googleapis.com/youtube/v3/search');
    assert.equal(options.params.type, 'video');
    assert.equal(options.params.videoEmbeddable, 'true');
    assert.equal(options.params.key, 'private-key');
    assert.equal(options.params.q, 'music');
    assert.equal(options.timeout, 8000);
    return { data: { items: [{ id: { videoId: 'dQw4w9WgXcQ' }, snippet: { title: 'A &amp; B', channelTitle: 'Channel' } }, { id: { channelId: 'invalid' } }] } };
  } });
  const videos = await service.search(' music ');
  assert.equal(videos.length, 1);
  assert.ok(videos[0] instanceof Video);
  assert.equal(videos[0].title, 'A & B');
  await assert.rejects(() => service.search(' '), { status: 400 });
  await assert.rejects(() => new YouTubeService('').search('music'), { status: 503 });
  for (const status of [403, 429, 500]) {
    const failing = new YouTubeService('private-key', { async get() { throw { response: { status }, config: { secret: 'private-key' } }; } });
    await assert.rejects(() => failing.search('music'), error => error.status === (status === 500 ? 502 : 503) && !error.message.includes('private-key'));
  }
});
