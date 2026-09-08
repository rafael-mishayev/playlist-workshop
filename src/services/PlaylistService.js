import { AppError } from '../models/AppError.js';
import { Video } from '../models/Video.js';
export class PlaylistService {
  constructor(repository) { this.repository = repository; }
  list(userId) { return this.repository.findByUser(userId); }
  owned(id, userId) {
    if (!/^[1-9][0-9]*$/.test(String(id)) || !Number.isSafeInteger(Number(id))) throw new AppError('Playlist item not found.', 404);
    const item = this.repository.findOwned(Number(id), userId);
    if (!item) throw new AppError('Playlist item not found.', 404);
    return item;
  }
  add(userId, videoId, searchResults) {
    // Trust server-side search metadata, never client-submitted titles or URLs.
    const result = searchResults?.find(video => video.videoId === videoId);
    if (!result) throw new AppError('Search for this video again before adding it.');
    return this.repository.add(userId, new Video(result));
  }
  remove(id, userId) { const item = this.owned(id, userId); this.repository.remove(item.id, userId); }
}
