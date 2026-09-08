import { Video } from './Video.js';
export class PlaylistItem extends Video {
  constructor(row) {
    super({ videoId: row.video_id, title: row.title, thumbnailUrl: row.thumbnail_url, channelTitle: row.channel_title });
    this.id = row.id;
    this.userId = row.user_id;
    this.createdAt = row.created_at;
  }
}
