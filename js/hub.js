/* EclipseSeeker Hub — 2D map, click-anywhere circumstances, pins, poll, shadow animation. */
(function () {
  'use strict';

  // ---------- Timezone heuristic (display only) ----------
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
    var ap = h < 12 ? 'am' : 'pm'; var hh = h % 12 || 12;
    return hh + ':' + m + ':' + s + ' ' + ap;
  }
  var R = 6371, D2R = Math.PI / 180;
  function havKm(a, b) {
    var dLa = (b[0] - a[0]) * D2R, dLo = (b[1] - a[1]) * D2R;
    var s = Math.sin(dLa / 2) * Math.sin(dLa / 2) +
            Math.cos(a[0] * D2R) * Math.cos(b[0] * D2R) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function compass(a, b) {
    var y = Math.sin((b[1] - a[1]) * D2R) * Math.cos(b[0] * D2R);
    var x = Math.cos(a[0] * D2R) * Math.sin(b[0] * D2R) -
            Math.sin(a[0] * D2R) * Math.cos(b[0] * D2R) * Math.cos((b[1] - a[1]) * D2R);
    var brg = (Math.atan2(y, x) / D2R + 360) % 360;
    return ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round(brg / 22.5) % 16];
  }

  // ---------- Map ----------
  var map = L.map('map', { zoomControl: true, worldCopyJump: true, attributionControl: false })
    .setView([-27, 141], 4);
  var tiles = {
    night: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 12 }),
    day: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 12 })
  };
  tiles.night.addTo(map);

  var PATH = null;
  var bandLayer, centralLayer, umbraLayer = null;

  fetch('data/path.json').then(function (r) { return r.json(); }).then(function (d) {
    PATH = d;
    var band = d.north.concat(d.south.slice().reverse());
    bandLayer = L.polygon(band, {
      color: '#8b5cf6', weight: 1, opacity: 0.55,
      fillColor: '#8b5cf6', fillOpacity: 0.14, interactive: false
    }).addTo(map);
    centralLayer = L.polyline(d.central, {
      color: '#a78bfa', weight: 2.5, opacity: 0.95, interactive: false,
      dashArray: null
    }).addTo(map);
    // soft outer glow line
    L.polyline(d.central, { color: '#8b5cf6', weight: 7, opacity: 0.18, interactive: false }).addTo(map);
  });

  // ---------- Pins ----------
  var totalStyle = { radius: 7, color: '#c4b5fd', weight: 2, fillColor: '#8b5cf6', fillOpacity: 0.9 };
  var partialStyle = { radius: 6, color: '#f5c86b', weight: 2, fillColor: '#0b0e16', fillOpacity: 0.9 };
  var markers = {};
  SPOTS.forEach(function (s) {
    s.circ = Eclipse.circumstances(s.lat, s.lng, 0);
    var m = L.circleMarker([s.lat, s.lng], s.circ && s.circ.type === 'total' ? totalStyle : partialStyle)
      .addTo(map)
      .bindTooltip(s.name, { direction: 'top', offset: [0, -8], className: 'pin-tip' })
      .on('click', function (ev) { L.DomEvent.stopPropagation(ev); openSpot(s); });
    markers[s.id] = m;
  });

  // ---------- Votes ----------
  function votesFor(s) {
    var extra = JSON.parse(localStorage.getItem('ae2028votes') || '{}');
    return s.seed + (extra[s.id] || 0);
  }
  function totalVotes() { return SPOTS.reduce(function (a, s) { return a + votesFor(s); }, 0); }
  function castVote(s) {
    var extra = JSON.parse(localStorage.getItem('ae2028votes') || '{}');
    var prev = localStorage.getItem('ae2028voted');
    if (prev === s.id) return;
    if (prev && extra[prev]) extra[prev]--;
    extra[s.id] = (extra[s.id] || 0) + 1;
    localStorage.setItem('ae2028votes', JSON.stringify(extra));
    localStorage.setItem('ae2028voted', s.id);
    renderPoll();
  }

  // ---------- Poll list ----------
  var pollList = document.getElementById('pollList');
  var pollMeta = document.getElementById('pollMeta');
  function renderPoll() {
    var tot = totalVotes();
    var max = Math.max.apply(null, SPOTS.map(votesFor).concat([1]));
    pollMeta.textContent = tot + ' vote' + (tot === 1 ? '' : 's') + ' cast · Click a pin on the map to add yours.';
    var sorted = SPOTS.slice(); // keep original order like the source site
    pollList.innerHTML = '';
    sorted.forEach(function (s, i) {
      var v = votesFor(s);
      var div = document.createElement('div');
      div.className = 'poll-item';
      var durTxt = s.circ && s.circ.type === 'total'
        ? s.circ.duration + ' totality'
        : Math.round((s.circ ? s.circ.obscuration : 0) * 100) + '% partial';
      div.innerHTML =
        '<div class="row"><span><span class="n">' + (i + 1) + '</span>' + s.name + '</span>' +
        '<span class="votes">' + v + '</span></div>' +
        '<div class="row"><span class="dur ' + (s.circ && s.circ.type === 'total' ? 'total' : '') + '">' + durTxt + '</span></div>' +
        '<div class="poll-bar"><i style="width:' + (v / max * 100) + '%"></i></div>';
      div.addEventListener('click', function () {
        openSpot(s);
        map.flyTo([s.lat, s.lng], Math.max(map.getZoom(), 6), { duration: 0.8 });
      });
      pollList.appendChild(div);
    });
  }
  renderPoll();

  // ---------- Side panel ----------
  var pollView = document.getElementById('pollView');
  var spotView = document.getElementById('spotView');
  var clickMarker = null;

  function contactRow(c, off) {
    function t(ms) { return ms == null ? '—' : fmtLocal(ms, off).replace(/:\d\d (am|pm)/, ' $1'); }
    var cells = c.type === 'total'
      ? [['C1', c.c1UT, 'Partial begins'], ['C2', c.c2UT, 'Totality begins'], ['MAX', c.maxUT, 'Maximum'], ['C3', c.c3UT, 'Totality ends'], ['C4', c.c4UT, 'Partial ends']]
      : [['C1', c.c1UT, 'Begins'], ['MAX', c.maxUT, 'Maximum'], ['C4', c.c4UT, 'Ends']];
    return '<div class="metric wide"><div class="k">Timeline (local)</div><div class="contact-times">' +
      cells.map(function (x) {
        return '<div><div class="ct">' + t(x[1]) + '</div><div class="cl">' + x[0] + '</div></div>';
      }).join('') + '</div></div>';
  }

  function nearestTotality(lat, lng) {
    if (!PATH) return null;
    var best = null, bd = 1e9;
    for (var i = 0; i < PATH.central.length; i += 2) {
      var d = havKm([lat, lng], PATH.central[i]);
      if (d < bd) { bd = d; best = PATH.central[i]; }
    }
    if (!best) return null;
    var c = Eclipse.circumstances(best[0], best[1], 0);
    return { km: Math.round(bd), dir: compass([lat, lng], best), dur: c && c.duration, at: best };
  }

  function circHtml(c, lat, lng, tz) {
    if (!c) return '<p class="spot-desc">The eclipse is not visible from this location.</p>';
    var h = '';
    h += '<span class="badge ' + c.type + '">' + (c.type === 'total' ? 'Total eclipse' : 'Partial eclipse') + '</span>';
    h += '<div class="metric-grid">';
    if (c.type === 'total') {
      h += '<div class="metric"><div class="k">Totality</div><div class="v hero-metric">' + c.duration + '</div></div>';
      h += '<div class="metric"><div class="k">Max eclipse</div><div class="v">' + fmtLocal(c.maxUT, tz.off).replace(/:\d\d (am|pm)/, ' $1') + ' <span style="font-size:12px;color:var(--muted)">' + tz.name + '</span></div></div>';
    } else {
      h += '<div class="metric"><div class="k">Sun covered</div><div class="v hero-metric" style="color:var(--gold)">' + Math.round(c.obscuration * 100) + '%</div></div>';
      h += '<div class="metric"><div class="k">Max eclipse</div><div class="v">' + fmtLocal(c.maxUT, tz.off).replace(/:\d\d (am|pm)/, ' $1') + ' <span style="font-size:12px;color:var(--muted)">' + tz.name + '</span></div></div>';
    }
    h += '<div class="metric"><div class="k">Sun altitude</div><div class="v">' + c.sunAlt.toFixed(0) + '°</div></div>';
    h += '<div class="metric"><div class="k">Magnitude</div><div class="v">' + c.magnitude.toFixed(3) + '</div></div>';
    h += contactRow(c, tz.off);
    h += '</div>';
    if (c.type !== 'total') {
      var n = nearestTotality(lat, lng);
      if (n) {
        h += '<div class="nearest-hint">You’re outside the path here. Closest totality: <b>' + n.km + ' km ' + n.dir +
             '</b> on the central line — <b>' + (n.dur || '—') + '</b> of darkness. <a href="#" data-goto="' +
             n.at[0] + ',' + n.at[1] + '" style="color:var(--violet);text-decoration:underline;">Jump there →</a></div>';
      }
    }
    return h;
  }

  function bindGoto(container) {
    container.querySelectorAll('[data-goto]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var p = a.getAttribute('data-goto').split(',').map(Number);
        map.flyTo(p, 7, { duration: 1 });
        openPoint(p[0], p[1]);
      });
    });
  }

  function openSpot(s) {
    var tz = { off: s.tz, name: s.tzName };
    spotView.innerHTML =
      '<button class="spot-close" title="Back to poll">✕</button>' +
      '<div class="eyebrow violet">Viewing spot</div>' +
      '<h2>' + s.name + '</h2>' +
      '<p class="side-sub">' + s.region + '</p>' +
      circHtml(s.circ, s.lat, s.lng, tz) +
      '<p class="spot-desc">' + s.desc + '</p>' +
      '<div class="weather-note"><b>July weather</b>' + s.weather + '</div>' +
      '<div class="metric wide"><div class="k">Community votes</div><div class="v">' + votesFor(s) +
      ' <span style="font-size:12px;color:var(--muted);font-family:var(--sans)">chasers plan to watch from here</span></div></div>' +
      '<button class="vote-btn" id="voteBtn">' +
      (localStorage.getItem('ae2028voted') === s.id ? '✓ You voted for this spot' : '♡ Vote for this spot') + '</button>';
    spotView.style.display = 'block';
    pollView.style.display = 'none';
    spotView.querySelector('.spot-close').addEventListener('click', closeSpot);
    var vb = document.getElementById('voteBtn');
    if (localStorage.getItem('ae2028voted') === s.id) vb.disabled = true;
    vb.addEventListener('click', function () {
      castVote(s); openSpot(s);
    });
    bindGoto(spotView);
  }

  function openPoint(lat, lng) {
    var c = Eclipse.circumstances(lat, lng, 0);
    var tz = tzFor(lat, lng);
    spotView.innerHTML =
      '<button class="spot-close" title="Back to poll">✕</button>' +
      '<div class="eyebrow violet">Your spot</div>' +
      '<h2>' + Math.abs(lat).toFixed(3) + '°' + (lat < 0 ? 'S' : 'N') + ', ' +
        Math.abs(lng).toFixed(3) + '°' + (lng < 0 ? 'W' : 'E') + '</h2>' +
      '<p class="side-sub">22 July 2028 · computed for this exact point</p>' +
      circHtml(c, lat, lng, tz) +
      (c && c.type === 'total'
        ? '<p class="spot-desc">This point is inside the path of totality. Stay anywhere within the violet band and you’ll stand in the Moon’s shadow.</p>'
        : '') +
      '<p class="attrib">Computed from the eclipse’s Besselian elements (Fred Espenak, EclipseWise.com). Times are local estimates; altitude/duration accurate to a few seconds.</p>';
    spotView.style.display = 'block';
    pollView.style.display = 'none';
    spotView.querySelector('.spot-close').addEventListener('click', closeSpot);
    bindGoto(spotView);
    if (clickMarker) map.removeLayer(clickMarker);
    clickMarker = L.circleMarker([lat, lng], {
      radius: 6, color: '#ff7a1a', weight: 2, fillColor: '#ff7a1a', fillOpacity: 0.5
    }).addTo(map);
  }

  function closeSpot() {
    spotView.style.display = 'none';
    pollView.style.display = 'block';
    if (clickMarker) { map.removeLayer(clickMarker); clickMarker = null; }
    renderPoll();
  }

  map.on('click', function (e) {
    openPoint(e.latlng.lat, ((e.latlng.lng + 540) % 360) - 180);
  });

  // ---------- Shadow animation ----------
  var playBtn = document.getElementById('playShadow');
  var clockEl = document.getElementById('shadowClock');
  var timeEl = document.getElementById('shadowTime');
  var durEl = document.getElementById('shadowDur');
  var playing = false, playT = 0, lastTs = 0, raf = null;

  function frameAt(u) { // u: 0..1 through frames, interpolated
    var f = PATH.frames;
    var x = u * (f.length - 1);
    var i = Math.min(Math.floor(x), f.length - 2);
    var k = x - i;
    var a = f[i], b = f[i + 1];
    var ring = a.ring.map(function (p, j) {
      var q = b.ring[j] || p;
      return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
    });
    return { ring: ring, ut: a.ut + (b.ut - a.ut) * k, dur: k < 0.5 ? a.dur : b.dur,
             c: [a.c[0] + (b.c[0] - a.c[0]) * k, a.c[1] + (b.c[1] - a.c[1]) * k] };
  }

  function stepShadow(ts) {
    if (!playing) return;
    if (!lastTs) lastTs = ts;
    playT += (ts - lastTs) / 28000; // full crossing in ~28 s
    lastTs = ts;
    if (playT >= 1) { stopShadow(); return; }
    var fr = frameAt(playT);
    if (umbraLayer) umbraLayer.setLatLngs(fr.ring);
    else umbraLayer = L.polygon(fr.ring, {
      color: '#0a0a14', weight: 1.5, opacity: 0.9,
      fillColor: '#05050c', fillOpacity: 0.72, interactive: false
    }).addTo(map);
    var tz = tzFor(fr.c[0], fr.c[1]);
    var ms = Date.UTC(2028, 6, 22) + fr.ut * 3600000;
    timeEl.textContent = fmtLocal(ms, tz.off).replace(/:\d\d (am|pm)/, ' $1') + ' ' + tz.name;
    durEl.textContent = fr.dur ? fr.dur + ' OF TOTALITY' : 'UMBRA';
    raf = requestAnimationFrame(stepShadow);
  }
  function stopShadow() {
    playing = false; lastTs = 0;
    playBtn.innerHTML = '▶&nbsp; Watch the shadow cross';
    clockEl.style.display = 'none';
    if (umbraLayer) { map.removeLayer(umbraLayer); umbraLayer = null; }
    if (raf) cancelAnimationFrame(raf);
  }
  playBtn.addEventListener('click', function () {
    if (!PATH) return;
    if (playing) { stopShadow(); return; }
    playing = true; playT = 0; lastTs = 0;
    playBtn.innerHTML = '■&nbsp; Stop';
    clockEl.style.display = 'block';
    map.flyToBounds([[-46, 112], [-10, 179]], { duration: 1 });
    requestAnimationFrame(stepShadow);
  });

  // ---------- View + light toggles ----------
  var segView = document.getElementById('segView');
  var segLight = document.getElementById('segLight');
  var mapEl = document.getElementById('map');
  var globeEl = document.getElementById('globe');
  var light = 'night';

  segView.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    segView.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
    b.classList.add('on');
    var is3d = b.dataset.v === '3d';
    mapEl.style.display = is3d ? 'none' : 'block';
    globeEl.style.display = is3d ? 'block' : 'none';
    if (is3d) window.dispatchEvent(new CustomEvent('globe:show', { detail: { light: light } }));
    else { window.dispatchEvent(new CustomEvent('globe:hide')); map.invalidateSize(); }
  });
  // Exposed for the 3D globe (pin clicks open the same panel)
  window.__openSpot = openSpot;
  window.__openPoint = openPoint;

  segLight.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    segLight.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
    b.classList.add('on');
    light = b.dataset.l;
    map.removeLayer(tiles[light === 'day' ? 'night' : 'day']);
    tiles[light].addTo(map);
    if (bandLayer) { bandLayer.bringToFront(); centralLayer.bringToFront(); }
    window.dispatchEvent(new CustomEvent('globe:light', { detail: { light: light } }));
  });
})();
