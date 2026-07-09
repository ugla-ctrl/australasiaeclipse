/* EclipseSeeker Hub — traditional path map, click-anywhere circumstances,
 * pins loaded from data/spots.json, community poll, suggest-a-spot, shadow animation. */
(function () {
  'use strict';

  var CORONA = '#ffce6a', CORONA_RIM = '#fff2d6', AMBER = '#ff8a1e';
  var R = 6371, D2R = Math.PI / 180;

  // ---------- helpers ----------
  function tzFor(lat, lng) {
    if (lng >= 112 && lng < 129 && lat < -12 && lat > -36) return { off: 8, name: 'AWST' };
    if (lng >= 129 && lng < 138 && lat < -10 && lat > -39) return { off: 9.5, name: 'ACST' };
    if (lng >= 138 && lng < 155 && lat < -9 && lat > -44) return { off: 10, name: 'AEST' };
    if (lng >= 166 && lng <= 179 && lat < -33 && lat > -48) return { off: 12, name: 'NZST' };
    var o = Math.round(lng / 15);
    return { off: o, name: 'UTC' + (o >= 0 ? '+' : '') + o };
  }
  function fmtLocal(ms, off) {
    var d = new Date(ms + off * 3600000);
    var h = d.getUTCHours(), m = ('0' + d.getUTCMinutes()).slice(-2), s = ('0' + d.getUTCSeconds()).slice(-2);
    return (h % 12 || 12) + ':' + m + ':' + s + ' ' + (h < 12 ? 'am' : 'pm');
  }
  function fmtShort(ms, off) { return fmtLocal(ms, off).replace(/:\d\d (am|pm)/, ' $1'); }
  function havKm(a, b) {
    var dLa = (b[0] - a[0]) * D2R, dLo = (b[1] - a[1]) * D2R;
    var s = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * D2R) * Math.cos(b[0] * D2R) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function compass(a, b) {
    var y = Math.sin((b[1] - a[1]) * D2R) * Math.cos(b[0] * D2R);
    var x = Math.cos(a[0] * D2R) * Math.sin(b[0] * D2R) - Math.sin(a[0] * D2R) * Math.cos(b[0] * D2R) * Math.cos((b[1] - a[1]) * D2R);
    var brg = (Math.atan2(y, x) / D2R + 360) % 360;
    return ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round(brg / 22.5) % 16];
  }

  // ---------- map ----------
  var map = L.map('map', { zoomControl: true, worldCopyJump: true, attributionControl: false }).setView([-27, 141], 4);
  var tiles = {
    night: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 12 }),
    day: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 12 })
  };
  tiles.day.addTo(map);
  (function () {
    // Night-blue wash. It must live in its OWN Leaflet pane stacked BETWEEN the tile
    // pane (z-index 200) and the overlay/path pane (z-index 400): a plain sibling of
    // the map pane can only sit fully under the tiles (invisible) or fully over the
    // path (dims the gold). The pane rides the map-pane transform, so the fill is
    // oversized to keep the viewport covered while panning.
    map.createPane('nightwash');
    var pane = map.getPane('nightwash');
    pane.style.zIndex = 250;
    pane.style.pointerEvents = 'none';
    var t = document.createElement('div'); t.className = 'map-tint';
    pane.appendChild(t);
  })();

  var PATH = null, umbraLayer = null;
  var pathLayers = [];

  function labelMarker(latlng, text, cls) {
    return L.marker(latlng, { interactive: false, keyboard: false,
      icon: L.divIcon({ className: '', html: '<span class="map-lbl ' + (cls || '') + '">' + text + '</span>', iconSize: [0, 0] }) });
  }

  fetch('data/path.json').then(function (r) { return r.json(); }).then(function (d) {
    PATH = d;
    // Shaded path of totality (band between north & south limits)
    var band = d.north.concat(d.south.slice().reverse());
    L.polygon(band, { color: 'transparent', weight: 0, fillColor: CORONA, fillOpacity: 0.13, interactive: false }).addTo(map);
    // Northern & southern limit lines — dashed, traditional
    var nLine = L.polyline(d.north, { color: CORONA, weight: 1.5, opacity: 0.8, dashArray: '6 6', interactive: false }).addTo(map);
    var sLine = L.polyline(d.south, { color: CORONA, weight: 1.5, opacity: 0.8, dashArray: '6 6', interactive: false }).addTo(map);
    // Central line — solid, bright, with a soft glow underneath
    L.polyline(d.central, { color: CORONA, weight: 8, opacity: 0.16, interactive: false }).addTo(map);
    var cLine = L.polyline(d.central, { color: CORONA_RIM, weight: 2.5, opacity: 0.95, interactive: false }).addTo(map);
    pathLayers = [cLine, nLine, sLine];
    // On-map labels (positioned over open areas to avoid clutter)
    var iN = Math.round(d.north.length * 0.30), iS = Math.round(d.south.length * 0.62), iC = Math.round(d.central.length * 0.46);
    labelMarker(d.north[iN], 'Northern limit', '').addTo(map);
    labelMarker(d.south[iS], 'Southern limit', '').addTo(map);
    labelMarker(d.central[iC], 'Central line', 'central').addTo(map);
  });

  // ---------- pins / spots ----------
  var SPOTS = [];
  var markers = {};
  var inPathStyle = { radius: 7, color: CORONA_RIM, weight: 2, fillColor: CORONA, fillOpacity: 0.95 };
  var suggestStyle = { radius: 7, color: AMBER, weight: 2, fillColor: 'transparent', fillOpacity: 0 };

  function addMarker(s) {
    var m = L.circleMarker([s.lat, s.lng], s.suggested ? suggestStyle : inPathStyle)
      .addTo(map)
      .bindTooltip(s.name + (s.suggested ? ' · suggested' : ''), { direction: 'top', offset: [0, -8], className: 'pin-tip' })
      .on('click', function (ev) { L.DomEvent.stopPropagation(ev); openSpot(s); });
    markers[s.id] = m;
  }

  // suggested spots persisted locally
  function loadSuggested() {
    var arr = JSON.parse(localStorage.getItem('ae2028suggested') || '[]');
    return arr.map(function (x) { x.suggested = true; return x; });
  }
  function saveSuggested(list) {
    localStorage.setItem('ae2028suggested', JSON.stringify(list.map(function (s) {
      return { id: s.id, name: s.name, region: s.region, lat: s.lat, lng: s.lng, seed: 0, suggested: true };
    })));
  }

  fetch('data/spots.json').then(function (r) { return r.json(); }).then(function (d) {
    SPOTS = d.spots.concat(loadSuggested());
    SPOTS.forEach(function (s) { s.circ = Eclipse.circumstances(s.lat, s.lng, 0); addMarker(s); });
    window.SPOTS = SPOTS;
    renderPoll();
  });

  // ---------- votes ----------
  function votesFor(s) {
    var extra = JSON.parse(localStorage.getItem('ae2028votes') || '{}');
    return (s.seed || 0) + (extra[s.id] || 0);
  }
  function totalVotes() { return SPOTS.reduce(function (a, s) { return a + votesFor(s); }, 0); }
  // anonymous per-browser id so votes can be roughly de-duplicated server-side
  function voterKey() {
    var k = localStorage.getItem('ae2028voter');
    if (!k) { k = 'v-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36); localStorage.setItem('ae2028voter', k); }
    return k;
  }
  function castVote(s) {
    var extra = JSON.parse(localStorage.getItem('ae2028votes') || '{}');
    var prev = localStorage.getItem('ae2028voted');
    if (prev === s.id) return;
    if (prev && extra[prev]) extra[prev]--;
    extra[s.id] = (extra[s.id] || 0) + 1;
    localStorage.setItem('ae2028votes', JSON.stringify(extra));
    localStorage.setItem('ae2028voted', s.id);
    // record the vote server-side (fire-and-forget; local UI already updated)
    if (window.__sbInsert) window.__sbInsert('votes', { spot_id: s.id, spot_name: s.name, voter_key: voterKey() }).catch(function () {});
  }

  // ---------- poll ----------
  var pollView = document.getElementById('pollView');
  var spotView = document.getElementById('spotView');
  var pollList = document.getElementById('pollList');
  var pollMeta = document.getElementById('pollMeta');

  function renderPoll() {
    var tot = totalVotes();
    var max = Math.max.apply(null, SPOTS.map(votesFor).concat([1]));
    pollMeta.textContent = tot + ' vote' + (tot === 1 ? '' : 's') + ' cast · Click a pin, or the map, to add yours.';
    pollList.innerHTML = '';
    SPOTS.forEach(function (s, i) {
      var v = votesFor(s);
      var isTotal = s.circ && s.circ.type === 'total';
      var durTxt = isTotal ? s.circ.duration + ' totality' : (s.circ ? Math.round(s.circ.obscuration * 100) + '% partial' : 'no eclipse');
      var div = document.createElement('div');
      div.className = 'poll-item' + (s.suggested ? ' suggested' : '');
      div.innerHTML =
        '<div class="row"><span><span class="n">' + (i + 1) + '</span>' + s.name +
          (s.suggested ? '<span class="tagchip">yours</span>' : '') + '</span>' +
          '<span class="votes">' + v + '</span></div>' +
        '<div class="row"><span class="dur ' + (isTotal ? 'total' : '') + '">' + durTxt + '</span></div>' +
        '<div class="poll-bar"><i style="width:' + (v / max * 100) + '%"></i></div>';
      div.addEventListener('click', function () { openSpot(s); map.flyTo([s.lat, s.lng], Math.max(map.getZoom(), 6), { duration: 0.8 }); });
      pollList.appendChild(div);
    });
  }

  // ---------- side panel content ----------
  function contactRow(c, off) {
    function t(ms) { return ms == null ? '—' : fmtShort(ms, off); }
    var cells = c.type === 'total'
      ? [['C1', c.c1UT], ['C2', c.c2UT], ['MAX', c.maxUT], ['C3', c.c3UT], ['C4', c.c4UT]]
      : [['C1', c.c1UT], ['MAX', c.maxUT], ['C4', c.c4UT]];
    return '<div class="metric wide"><div class="k">Timeline (local)</div><div class="contact-times">' +
      cells.map(function (x) { return '<div><div class="ct">' + t(x[1]) + '</div><div class="cl">' + x[0] + '</div></div>'; }).join('') +
      '</div></div>';
  }
  function nearestTotality(lat, lng) {
    if (!PATH) return null;
    var best = null, bd = 1e9;
    for (var i = 0; i < PATH.central.length; i += 2) { var dd = havKm([lat, lng], PATH.central[i]); if (dd < bd) { bd = dd; best = PATH.central[i]; } }
    if (!best) return null;
    var c = Eclipse.circumstances(best[0], best[1], 0);
    return { km: Math.round(bd), dir: compass([lat, lng], best), dur: c && c.duration, at: best };
  }
  function circHtml(c, lat, lng, tz) {
    if (!c) return '<p class="spot-desc">The eclipse is not visible from this location.</p>';
    var h = '<span class="badge ' + c.type + '">' + (c.type === 'total' ? 'Total eclipse' : 'Partial eclipse') + '</span><div class="metric-grid">';
    if (c.type === 'total') {
      h += '<div class="metric"><div class="k">Totality</div><div class="v hero-metric">' + c.duration + '</div></div>';
    } else {
      h += '<div class="metric"><div class="k">Sun covered</div><div class="v hero-metric" style="color:var(--gold)">' + Math.round(c.obscuration * 100) + '%</div></div>';
    }
    h += '<div class="metric"><div class="k">Max eclipse</div><div class="v">' + fmtShort(c.maxUT, tz.off) + ' <span style="font-size:12px;color:var(--muted)">' + tz.name + '</span></div></div>';
    h += '<div class="metric"><div class="k">Sun altitude</div><div class="v">' + c.sunAlt.toFixed(0) + '°</div></div>';
    h += '<div class="metric"><div class="k">Magnitude</div><div class="v">' + c.magnitude.toFixed(3) + '</div></div>';
    h += contactRow(c, tz.off) + '</div>';
    if (c.type !== 'total') {
      var n = nearestTotality(lat, lng);
      if (n) h += '<div class="nearest-hint">Outside the path here. Closest totality: <b>' + n.km + ' km ' + n.dir +
        '</b> on the central line — <b>' + (n.dur || '—') + '</b> of darkness. <a href="#" data-goto="' + n.at[0] + ',' + n.at[1] + '" style="color:var(--corona);text-decoration:underline;">Jump there →</a></div>';
    }
    return h;
  }
  function bindGoto(container) {
    container.querySelectorAll('[data-goto]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); var p = a.getAttribute('data-goto').split(',').map(Number); map.flyTo(p, 7, { duration: 1 }); openPoint(p[0], p[1]); });
    });
  }
  function showSpotView() { spotView.style.display = 'block'; pollView.style.display = 'none'; }
  function closeSpot() { spotView.style.display = 'none'; pollView.style.display = 'block'; if (clickMarker) { map.removeLayer(clickMarker); clickMarker = null; } if (window.__globeClearMark) window.__globeClearMark(); renderPoll(); }

  function openSpot(s) {
    var tz = { off: s.tz != null ? s.tz : tzFor(s.lat, s.lng).off, name: s.tzName || tzFor(s.lat, s.lng).name };
    spotView.innerHTML =
      '<button class="spot-close" title="Back to poll">✕</button>' +
      '<div class="eyebrow gold">' + (s.suggested ? 'Suggested spot' : 'Viewing spot') + '</div>' +
      '<h2>' + s.name + '</h2>' +
      '<p class="side-sub">' + (s.region || (Math.abs(s.lat).toFixed(3) + '°' + (s.lat < 0 ? 'S' : 'N') + ', ' + Math.abs(s.lng).toFixed(3) + '°' + (s.lng < 0 ? 'W' : 'E'))) + '</p>' +
      circHtml(s.circ, s.lat, s.lng, tz) +
      (s.desc ? '<p class="spot-desc">' + s.desc + '</p>' : '') +
      (s.weather ? '<div class="weather-note"><b>July weather</b>' + s.weather + '</div>' : '') +
      '<div class="metric wide"><div class="k">Community votes</div><div class="v">' + votesFor(s) +
      ' <span style="font-size:12px;color:var(--muted);font-family:var(--sans)">Seekers plan to watch from here</span></div></div>' +
      '<button class="vote-btn" id="voteBtn">' + (localStorage.getItem('ae2028voted') === s.id ? '✓ You voted for this spot' : '♡ Vote for this spot') + '</button>';
    showSpotView();
    spotView.querySelector('.spot-close').addEventListener('click', closeSpot);
    var vb = document.getElementById('voteBtn');
    if (localStorage.getItem('ae2028voted') === s.id) vb.disabled = true;
    vb.addEventListener('click', function () { castVote(s); openSpot(s); });
    bindGoto(spotView);
  }

  var clickMarker = null;
  function openPoint(lat, lng) {
    var c = Eclipse.circumstances(lat, lng, 0);
    var tz = tzFor(lat, lng);
    var coordName = Math.abs(lat).toFixed(3) + '°' + (lat < 0 ? 'S' : 'N') + ', ' + Math.abs(lng).toFixed(3) + '°' + (lng < 0 ? 'W' : 'E');
    spotView.innerHTML =
      '<button class="spot-close" title="Back to poll">✕</button>' +
      '<div class="eyebrow gold">Your spot</div>' +
      '<h2>' + coordName + '</h2>' +
      '<p class="side-sub">22 July 2028 · computed for this exact point</p>' +
      circHtml(c, lat, lng, tz) +
      '<button class="suggest-btn" id="suggestBtn">★ Suggest this as a viewing spot</button>' +
      '<p class="attrib">Times are calculated for this exact point and accurate to within a few seconds. Suggested spots are saved in your browser and shown to you here; a shared, cross-visitor list needs a backend.</p>';
    showSpotView();
    spotView.querySelector('.spot-close').addEventListener('click', closeSpot);
    bindGoto(spotView);
    document.getElementById('suggestBtn').addEventListener('click', function () { suggestSpot(lat, lng, c); });
    if (clickMarker) map.removeLayer(clickMarker);
    clickMarker = L.circleMarker([lat, lng], { radius: 6, color: AMBER, weight: 2, fillColor: AMBER, fillOpacity: 0.5 }).addTo(map);
    if (window.__globeMark) window.__globeMark(lat, lng); // mirror the picked point onto the 3D globe
  }

  function suggestSpot(lat, lng, c) {
    var def = c && c.type === 'total' ? 'My spot on the central line' : 'My viewing spot';
    var name = (window.prompt('Name this viewing spot:', def) || '').trim();
    if (!name) return;
    var id = 'sug-' + Math.abs(Math.round(lat * 1000)) + '-' + Math.abs(Math.round(lng * 1000));
    var region = tzFor(lat, lng).name + ' · suggested by you';
    var s = { id: id, name: name, region: region, lat: lat, lng: lng, seed: 0, suggested: true, circ: c };
    // de-dupe
    if (!SPOTS.some(function (x) { return x.id === id; })) {
      SPOTS.push(s);
      saveSuggested(SPOTS.filter(function (x) { return x.suggested; }));
      addMarker(s);
      if (window.__globeAddPin) window.__globeAddPin(s); // show the new spot on the globe too
      // submit the suggestion server-side so it actually reaches us (fire-and-forget)
      if (window.__sbInsert) window.__sbInsert('spot_suggestions', {
        name: name, lat: lat, lng: lng, region: region,
        eclipse_type: c && c.type, duration: (c && c.type === 'total') ? c.duration : null
      }).catch(function () {});
    }
    if (clickMarker) { map.removeLayer(clickMarker); clickMarker = null; }
    castVote(s);
    openSpot(s);
  }

  map.on('click', function (e) { openPoint(e.latlng.lat, ((e.latlng.lng + 540) % 360) - 180); });

  // "+ Suggest a spot" button: nudge the user to click the map
  document.getElementById('pollAdd').addEventListener('click', function () {
    document.getElementById('hub').scrollIntoView({ behavior: 'smooth', block: 'start' });
    var meta = pollMeta, old = meta.textContent;
    meta.textContent = 'Click your spot anywhere on the map, then “Suggest this as a viewing spot”.';
    meta.style.color = 'var(--accent)';
    setTimeout(function () { meta.textContent = old; meta.style.color = ''; }, 4200);
  });

  // ---------- shadow animation ----------
  var playBtn = document.getElementById('playShadow');
  var clockEl = document.getElementById('shadowClock'), timeEl = document.getElementById('shadowTime'), durEl = document.getElementById('shadowDur');
  var playing = false, playT = 0, lastTs = 0, raf = null;
  function frameAt(u) {
    var f = PATH.frames, x = u * (f.length - 1), i = Math.min(Math.floor(x), f.length - 2), k = x - i, a = f[i], b = f[i + 1];
    var ring = a.ring.map(function (p, j) { var q = b.ring[j] || p; return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]; });
    return { ring: ring, ut: a.ut + (b.ut - a.ut) * k, dur: k < 0.5 ? a.dur : b.dur, c: [a.c[0] + (b.c[0] - a.c[0]) * k, a.c[1] + (b.c[1] - a.c[1]) * k] };
  }
  function stepShadow(ts) {
    if (!playing) return;
    if (!lastTs) lastTs = ts;
    playT += (ts - lastTs) / 28000; lastTs = ts;
    if (playT >= 1) { stopShadow(); return; }
    var fr = frameAt(playT);
    if (umbraLayer) umbraLayer.setLatLngs(fr.ring);
    else umbraLayer = L.polygon(fr.ring, { className: 'umbra-shadow', color: '#ffe6bf', weight: 2.5, opacity: 0.95, fillColor: '#04050a', fillOpacity: 0.62, interactive: false }).addTo(map);
    if (window.__globeUmbra) window.__globeUmbra(fr.ring); // mirror the shadow onto the 3D globe
    var tz = tzFor(fr.c[0], fr.c[1]);
    timeEl.textContent = fmtShort(Date.UTC(2028, 6, 22) + fr.ut * 3600000, tz.off) + ' ' + tz.name;
    durEl.textContent = fr.dur ? fr.dur + ' OF TOTALITY' : 'UMBRA';
    raf = requestAnimationFrame(stepShadow);
  }
  function stopShadow() { playing = false; lastTs = 0; playBtn.innerHTML = '▶&nbsp; Watch the shadow cross'; clockEl.style.display = 'none'; if (umbraLayer) { map.removeLayer(umbraLayer); umbraLayer = null; } if (window.__globeUmbraClear) window.__globeUmbraClear(); if (raf) cancelAnimationFrame(raf); }
  playBtn.addEventListener('click', function () {
    if (!PATH) return;
    if (playing) { stopShadow(); return; }
    playing = true; playT = 0; lastTs = 0; playBtn.innerHTML = '■&nbsp; Stop'; clockEl.style.display = 'block';
    if (document.getElementById('globe').style.display !== 'block') map.flyToBounds([[-46, 112], [-10, 179]], { duration: 1 }); // 2D only
    requestAnimationFrame(stepShadow);
  });

  // exposed for the 3D globe
  window.__openSpot = openSpot;
  window.__openPoint = openPoint;

  // ---------- view + light toggles ----------
  var segView = document.getElementById('segView'), segLight = document.getElementById('segLight');
  var mapEl = document.getElementById('map'), globeEl = document.getElementById('globe');
  var light = 'day'; // default: 3D + Day
  segView.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    segView.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on');
    var is3d = b.dataset.v === '3d';
    mapEl.style.display = is3d ? 'none' : 'block'; globeEl.style.display = is3d ? 'block' : 'none';
    if (is3d) window.dispatchEvent(new CustomEvent('globe:show', { detail: { light: light } }));
    else { window.dispatchEvent(new CustomEvent('globe:hide')); map.invalidateSize(); }
  });
  segLight.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    segLight.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on');
    light = b.dataset.l;
    mapEl.classList.toggle('night', light === 'night');
    map.removeLayer(tiles[light === 'day' ? 'night' : 'day']); tiles[light].addTo(map);
    pathLayers.forEach(function (l) { l.bringToFront(); });
    window.dispatchEvent(new CustomEvent('globe:light', { detail: { light: light } }));
  });

  // Default to the 3D globe (feedback: 3D should be the default view). The 3D button
  // is pre-marked .on in the HTML; here we swap the panes and kick off the globe once
  // its module has registered the globe:show listener (fires on window load).
  mapEl.style.display = 'none'; globeEl.style.display = 'block';
  var startGlobe = function () { window.dispatchEvent(new CustomEvent('globe:show', { detail: { light: light } })); };
  if (document.readyState === 'complete') startGlobe();
  else window.addEventListener('load', startGlobe);
})();
