export class PlaylistController {
  constructor(service) { this.service = service; }
  index(req, res) { res.render('playlist', { title: 'My playlist', items: this.service.list(req.user.id) }); }
  add(req, res) {
    const added = this.service.add(req.user.id, req.body.videoId, req.session.searchResults);
    req.session.notice = added ? 'Video added to your playlist.' : 'This video is already in your playlist.';
    res.redirect(303, '/playlist');
  }
  remove(req, res) {
    this.service.remove(req.params.id, req.user.id);
    req.session.notice = 'Video removed.';
    res.redirect(303, '/playlist');
  }
  player(req, res) {
    const item = this.service.owned(
      req.params.id,
      req.user.id
    );

    res.render('player', {
      title: item.title,
      item,
      backUrl: '/playlist'
    });
  }
}
