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
    var podiumEligible = rows.length >= 3;
    var top3 = podiumEligible ? rows.slice(0, 3) : [];
    var rest = podiumEligible ? rows.slice(3) : rows;
    var restRankStart = podiumEligible ? 4 : 1;

    var podium = '';
    if (top3.length === 3) {
      podium = '<div class="lb-podium">' + top3.map(function (r, i) {
        return (
          '<div class="lb-p-card p' + (i + 1) + '">' +
            '<div class="lb-p-rank">' + (i + 1) + '</div>' +
            '<div class="lb-p-name">' + esc(r.name) + '</div>' +
            '<div class="lb-p-votes">' + r.votes + (r.votes === 1 ? ' vote' : ' votes') + '</div>' +
          '</div>'
        );
      }).join('') + '</div>';
    }

    var restHtml = rest.length ? '<div class="lb-rest">' + rest.map(function (r, i) {
      var rank = i + restRankStart;
      return (
        '<div class="lb-row">' +
          '<div class="lb-fill" style="width:' + (r.votes / max * 100) + '%"></div>' +
          '<span class="lb-r-rank">' + rank + '</span>' +
          '<span class="lb-r-name">' + esc(r.name) + '</span>' +
          '<span class="lb-r-votes">' + r.votes + '</span>' +
        '</div>'
      );
    }).join('') + '</div>' : '';

    listEl.innerHTML = podium + restHtml;
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
