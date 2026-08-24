/* Public live leaderboard, below the interactive map.
 * Reuses the existing community_stats() RPC (already exposed as window.__sbRpc by
 * index.html). Driven entirely by the votes table via spot_votes + spot_names (both
 * returned by that RPC), so a brand new visitor-suggested spot appears here, with
 * its real name, the moment it gets its first vote, no static file to keep in sync.
 * Entirely additive: does not touch hub.js, its community:stats event, or the
 * existing side panel poll in any way. Polls on its own timer so the board updates
 * without a page reload. */
(function () {
  var POLL_MS = 20000;
  var RING_SEGMENTS = 6; // top N get their own wedge; the rest fold into "other"
  var listEl = document.getElementById('leaderboardList');
  if (!listEl) return;

  function esc(t) {
    var d = document.createElement('div');
    d.textContent = t == null ? '' : t;
    return d.innerHTML;
  }

  // Same gold, fading opacity per rank, so the ring and the list read as one system.
  function wedgeColor(i) {
    var a = Math.max(0.22, 1 - i * 0.15);
    return 'rgba(255, 206, 106, ' + a.toFixed(2) + ')';
  }

  function render(spotVotes, spotNames) {
    var ids = Object.keys(spotVotes || {}).filter(function (id) { return (spotVotes[id] || 0) > 0; });
    var rows = ids.map(function (id) {
      return { id: id, name: (spotNames && spotNames[id]) || 'A suggested spot', votes: spotVotes[id] };
    });
    rows.sort(function (a, b) { return b.votes - a.votes; });

    var total = rows.reduce(function (a, r) { return a + r.votes; }, 0);
    if (!total) {
      listEl.innerHTML = '<p class="leaderboard-loading">No votes yet. Be the first, above.</p>';
      return;
    }
    rows.forEach(function (r) { r.pct = Math.round((r.votes / total) * 1000) / 10; });

    // ---- the ring: top N wedges + one "other" wedge for the tail ----
    var top = rows.slice(0, RING_SEGMENTS);
    var otherPct = rows.slice(RING_SEGMENTS).reduce(function (a, r) { return a + r.pct; }, 0);
    var stops = [], cum = 0;
    top.forEach(function (r, i) {
      var start = cum, end = cum + r.pct;
      stops.push(wedgeColor(i) + ' ' + start + '% ' + end + '%');
      cum = end;
    });
    if (otherPct > 0) stops.push('rgba(164, 158, 146, 0.32) ' + cum + '% ' + (cum + otherPct) + '%');
    cum += otherPct;
    if (cum < 100) stops.push('rgba(255,255,255,0) ' + cum + '% 100%');
    var gradient = 'conic-gradient(from -90deg, ' + stops.join(', ') + ')';

    var leader = rows[0];
    var corona =
      '<div class="lb-corona-wrap">' +
        '<div class="lb-corona" style="background:' + gradient + '">' +
          '<div class="lb-corona-center">' +
            '<div class="cc-pct">' + leader.pct + '%</div>' +
            '<div class="cc-name">' + esc(leader.name) + '</div>' +
            '<div class="cc-label">in the lead</div>' +
          '</div>' +
        '</div>' +
        '<div class="lb-rest">' + rows.map(function (r, i) {
          return (
            '<div class="lb-row">' +
              '<div class="lb-fill" style="width:' + (r.votes / rows[0].votes * 100) + '%"></div>' +
              '<span class="lb-r-rank" style="color:' + wedgeColor(Math.min(i, RING_SEGMENTS)) + '">' + (i + 1) + '</span>' +
              '<span class="lb-r-name">' + esc(r.name) + '</span>' +
              '<span class="lb-r-pct">' + r.pct + '%</span>' +
            '</div>'
          );
        }).join('') + '</div>' +
      '</div>';

    listEl.innerHTML = corona;
  }

  function tick() {
    if (!window.__sbRpc) return; // index.html's inline script hasn't finished defining it yet; the next tick will catch it
    window.__sbRpc('community_stats').then(function (s) {
      render(s && s.spot_votes, s && s.spot_names);
    }).catch(function () {});
  }

  tick();
  setInterval(tick, POLL_MS);
})();
