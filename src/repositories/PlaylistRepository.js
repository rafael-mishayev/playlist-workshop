import { PlaylistItem } from '../models/PlaylistItem.js';
export class PlaylistRepository {
  constructor(db) { this.db = db; }
  findByUser(userId) {
    return this.db.prepare('SELECT * FROM playlist_items WHERE user_id = ? ORDER BY created_at DESC, id DESC').all(userId).map(row => new PlaylistItem(row));
  }
  findOwned(id, userId) {
    const row = this.db.prepare('SELECT * FROM playlist_items WHERE id = ? AND user_id = ?').get(id, userId);
    return row ? new PlaylistItem(row) : null;
  }
  add(userId, video) {
    return this.db.prepare(`INSERT INTO playlist_items (user_id, video_id, title, thumbnail_url, channel_title)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, video_id) DO NOTHING`)
      .run(userId, video.videoId, video.title, video.thumbnailUrl, video.channelTitle).changes > 0;
  }
  remove(id, userId) {
    return this.db.prepare('DELETE FROM playlist_items WHERE id = ? AND user_id = ?').run(id, userId).changes > 0;
  }
}
