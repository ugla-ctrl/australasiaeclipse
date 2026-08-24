/* Public live leaderboard, below the interactive map.
 * Reuses the existing community_stats() RPC (already exposed as window.__sbRpc by
 * index.html) and data/spots.json for names. Entirely additive: does not touch
 * hub.js, its community:stats event, or the existing side panel poll in any way.
 * Polls on its own timer so the board updates without a page reload. */
(function () {
  var POLL_MS = 20000;
  var listEl = document.getElementById('leaderboardList');
  if (!listEl) return;

  var SPOT_INFO = {}; // id -> { name, region }

  function esc(t) {
    var d = document.createElement('div');
    d.textContent = t == null ? '' : t;
    return d.innerHTML;
  }

  function loadSpotInfo() {
    return fetch('data/spots.json').then(function (r) { return r.json(); }).then(function (d) {
      (d.spots || []).forEach(function (s) { SPOT_INFO[s.id] = { name: s.name, region: s.region }; });
    }).catch(function () {});
  }

  function render(spotVotes) {
    var rows = Object.keys(spotVotes || {}).map(function (id) {
      var info = SPOT_INFO[id];
      return {
        id: id,
        name: info ? info.name : 'A suggested spot',
        region: info ? info.region : null,
        votes: spotVotes[id] || 0
      };
    });
    // include seeded spots with zero votes so the board never looks empty or partial
    Object.keys(SPOT_INFO).forEach(function (id) {
      if (!spotVotes || !(id in spotVotes)) rows.push({ id: id, name: SPOT_INFO[id].name, region: SPOT_INFO[id].region, votes: 0 });
    });
    rows.sort(function (a, b) { return b.votes - a.votes; });

    if (!rows.length) {
      listEl.innerHTML = '<p class="leaderboard-loading">No votes yet. Be the first, above.</p>';
      return;
    }
    var max = Math.max.apply(null, rows.map(function (r) { return r.votes; }).concat([1]));
    listEl.innerHTML = rows.map(function (r, i) {
      var rank = i + 1;
      var rankCls = rank <= 3 ? ' top' + rank : '';
      return (
        '<div class="leaderboard-row' + rankCls + '">' +
          '<div class="lb-rank">' + rank + '</div>' +
          '<div class="lb-main">' +
            '<div class="lb-top"><span class="lb-name">' + esc(r.name) + '</span><span class="lb-votes">' + r.votes + '</span></div>' +
            (r.region ? '<div class="lb-region">' + esc(r.region) + '</div>' : '') +
            '<div class="poll-bar"><i style="width:' + (r.votes / max * 100) + '%"></i></div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function tick() {
    if (!window.__sbRpc) return; // index.html's inline script hasn't finished defining it yet; the next tick will catch it
    window.__sbRpc('community_stats').then(function (s) {
      render(s && s.spot_votes);
    }).catch(function () {});
  }

  loadSpotInfo().then(function () {
    tick();
    setInterval(tick, POLL_MS);
  });
})();
