export class Video {
  constructor({ videoId, title, thumbnailUrl, channelTitle }) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new TypeError('Invalid video ID');
    this.videoId = videoId;
    this.title = String(title).slice(0, 500);
    this.thumbnailUrl = /^https:\/\/(i\.ytimg\.com|img\.youtube\.com)\//.test(thumbnailUrl)
      ? thumbnailUrl : `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
    this.channelTitle = String(channelTitle).slice(0, 200);
  }
  get embedUrl() { return `https://www.youtube.com/embed/${this.videoId}`; }
}
