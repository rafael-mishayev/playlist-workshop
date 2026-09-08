import { AppError } from '../models/AppError.js';
import { Video } from '../models/Video.js';

export class SearchController {
  constructor(youtube, playlist) {
    this.youtube = youtube;
    this.playlist = playlist;
  }

  async index(req, res) {
    let videos = [];
    let error = null;

    const query =
      typeof req.query.q === 'string'
        ? req.query.q.trim()
        : '';

    if (req.query.q !== undefined) {
      try {
        videos = await this.youtube.search(query);
        req.session.searchResults = videos;
      } catch (failure) {
        if (!(failure instanceof AppError)) {
          throw failure;
        }

        error = failure.message;
        res.status(failure.status);
      }
    }

    res.render('search', {
      title: 'Search videos',
      query,
      videos,
      error,
      savedIds: new Set(
        this.playlist
          .list(req.user.id)
          .map(item => item.videoId)
      )
    });
  }

  player(req, res) {
    const result = req.session.searchResults?.find(
      video => video.videoId === req.params.videoId
    );

    if (!result) {
      throw new AppError(
        'Search for this video again before playing it.',
        404
      );
    }

    const video = new Video(result);

    res.render('player', {
      title: video.title,
      item: video,
      backUrl: '/search'
    });
  }
}