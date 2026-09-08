import axios from 'axios';
import he from 'he';
import { Video } from '../models/Video.js';
import { AppError } from '../models/AppError.js';
export class YouTubeService {
  constructor(apiKey, client = axios) { this.apiKey = apiKey; this.client = client; }
  async search(query) {
    if (typeof query !== 'string' || !query.trim() || query.trim().length > 100)
      throw new AppError('Enter a search query of 1–100 characters.');
    if (!this.apiKey) throw new AppError('Video search is not configured. Please contact the administrator.', 503);
    try {
      const { data } = await this.client.get('https://www.googleapis.com/youtube/v3/search', {
        params: { key: this.apiKey, part: 'snippet', type: 'video', videoEmbeddable: 'true', maxResults: 12, q: query.trim() },
        timeout: 8000
      });
      if (!Array.isArray(data.items)) throw new Error('Invalid upstream response');
      return data.items.filter(item => /^[A-Za-z0-9_-]{11}$/.test(item.id?.videoId) && item.snippet)
        .map(item => new Video({ videoId: item.id.videoId, title: he.decode(item.snippet.title ?? ''),
          thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? '', channelTitle: he.decode(item.snippet.channelTitle ?? '') }));
    } catch (error) {
      // Never log the Axios error: its config contains the secret API key.
      if (error.response?.status === 403 || error.response?.status === 429)
        throw new AppError('YouTube search is temporarily unavailable. Please try again later.', 503);
      throw new AppError('Unable to reach YouTube. Please try again.', 502);
    }
  }
}
