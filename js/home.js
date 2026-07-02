/* Home hero: looping canvas eclipse over an outback dune silhouette + countdown. */
(function () {
  'use strict';

  // ---------- Countdown (greatest eclipse 2028-07-22 02:55:26 UT) ----------
  var TARGET = Date.UTC(2028, 6, 22, 2, 55, 26);
  var el = {
    d: document.getElementById('cd-d'), h: document.getElementById('cd-h'),
    m: document.getElementById('cd-m'), s: document.getElementById('cd-s')
  };
  function tick() {
    var left = Math.max(0, TARGET - Date.now());
    var s = Math.floor(left / 1000);
    el.d.textContent = Math.floor(s / 86400);
    el.h.textContent = ('0' + Math.floor(s / 3600) % 24).slice(-2);
    el.m.textContent = ('0' + Math.floor(s / 60) % 60).slice(-2);
    el.s.textContent = ('0' + s % 60).slice(-2);
  }
  if (el.d) { tick(); setInterval(tick, 1000); }

  // ---------- Hero animation ----------
  var canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W, H, dpr;
  var stars = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = [];
    for (var i = 0; i < 140; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H * 0.75,
                   r: Math.random() * 1.3 + 0.3, tw: Math.random() * Math.PI * 2 });
    }
  }
  window.addEventListener('resize', resize);
  resize();

  // Coverage curve: dwell at totality mid-cycle
  var CYCLE = 26000;
  function coverage(t) {
    var p = (t % CYCLE) / CYCLE;              // 0..1
    var x = Math.abs(p - 0.5) * 2;            // 1 → 0 → 1
    var c = 1 - Math.pow(x, 1.6);             // ease
    return Math.min(1, c * 1.18);             // hold >1 clipped → totality dwell
  }

  // Dune ridge generator (stable pseudo-noise)
  function ridge(y0, amp, freq, seed) {
    var pts = [];
    for (var x = 0; x <= W + 20; x += 20) {
      var y = y0 + Math.sin(x * freq + seed) * amp
                 + Math.sin(x * freq * 2.7 + seed * 1.7) * amp * 0.4;
      pts.push([x, y]);
    }
    return pts;
  }

  function draw(now) {
    var cov = reduced ? 1 : coverage(now);
    var total = cov >= 1;
    var dark = Math.pow(cov, 3);              // sky darkening
    var sunX = W * 0.5, sunY = H * 0.34;
    var R = Math.min(W, H) * 0.085;

    // Sky
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    var duskTop = [8 + 30 * (1 - dark), 10 + 24 * (1 - dark), 22 + 40 * (1 - dark)];
    var duskBot = [120 - 90 * dark, 52 - 36 * dark, 40 - 26 * dark];
    sky.addColorStop(0, 'rgb(' + duskTop.map(Math.round).join(',') + ')');
    sky.addColorStop(0.62, 'rgb(' + [duskBot[0] * 0.55, duskBot[1] * 0.55, duskBot[2] * 0.6].map(Math.round).join(',') + ')');
    sky.addColorStop(1, 'rgb(' + duskBot.map(Math.round).join(',') + ')');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Stars (appear as it darkens)
    if (dark > 0.45) {
      var sa = (dark - 0.45) / 0.55;
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var tw = 0.6 + 0.4 * Math.sin(now / 700 + st.tw);
        ctx.fillStyle = 'rgba(236,237,242,' + (sa * 0.85 * tw).toFixed(3) + ')';
        ctx.fillRect(st.x, st.y, st.r, st.r);
      }
    }

    // Corona (during/near totality)
    if (cov > 0.94) {
      var ca = (cov - 0.94) / 0.06;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      // streamers
      for (var k = 0; k < 26; k++) {
        var ang = (k / 26) * Math.PI * 2 + Math.sin(now / 9000 + k) * 0.05;
        var len = R * (1.9 + 1.5 * Math.abs(Math.sin(k * 2.7)) + 0.25 * Math.sin(now / 1400 + k * 1.3));
        var g = ctx.createLinearGradient(sunX, sunY, sunX + Math.cos(ang) * len, sunY + Math.sin(ang) * len);
        g.addColorStop(0, 'rgba(240,240,255,' + (0.4 * ca).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(200,205,255,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = R * 0.45;
        ctx.beginPath();
        ctx.moveTo(sunX + Math.cos(ang) * R * 1.02, sunY + Math.sin(ang) * R * 1.02);
        ctx.lineTo(sunX + Math.cos(ang) * len, sunY + Math.sin(ang) * len);
        ctx.stroke();
      }
      // inner glow
      var cg = ctx.createRadialGradient(sunX, sunY, R, sunX, sunY, R * 2.6);
      cg.addColorStop(0, 'rgba(255,255,255,' + (0.85 * ca).toFixed(3) + ')');
      cg.addColorStop(0.35, 'rgba(220,225,255,' + (0.28 * ca).toFixed(3) + ')');
      cg.addColorStop(1, 'rgba(200,205,255,0)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(sunX, sunY, R * 2.6, 0, 7); ctx.fill();
      ctx.restore();
    }

    // Sun (photosphere) — dims as covered
    if (!total) {
      var glow = ctx.createRadialGradient(sunX, sunY, R * 0.4, sunX, sunY, R * 3.2);
      var ga = 0.5 * (1 - dark);
      glow.addColorStop(0, 'rgba(255,196,110,' + ga.toFixed(3) + ')');
      glow.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(sunX, sunY, R * 3.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd9a0';
      ctx.beginPath(); ctx.arc(sunX, sunY, R, 0, 7); ctx.fill();
    }

    // Moon disc
    var span = reduced ? 0 : (((now % CYCLE) / CYCLE) - 0.5) * 2; // -1..1
    var mx = sunX + span * R * 2.9;
    var my = sunY - span * R * 0.35;
    ctx.fillStyle = total ? '#05060a' : 'rgb(10,11,16)';
    ctx.beginPath(); ctx.arc(mx, my, R * 1.03, 0, 7); ctx.fill();

    // Diamond ring flash just before/after totality
    if (!reduced && cov > 0.985 && cov < 0.9995) {
      var fa = 1 - Math.abs(cov - 0.992) / 0.0075;
      if (fa > 0) {
        var edge = span < 0 ? -1 : 1;
        var fx = sunX + edge * R * 0.92, fy = sunY - R * 0.28;
        var fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, R * 1.2);
        fg.addColorStop(0, 'rgba(255,255,255,' + (0.95 * fa).toFixed(3) + ')');
        fg.addColorStop(0.2, 'rgba(255,230,180,' + (0.5 * fa).toFixed(3) + ')');
        fg.addColorStop(1, 'rgba(255,220,160,0)');
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.arc(fx, fy, R * 1.2, 0, 7); ctx.fill();
      }
    }

    // Dune silhouettes (three ridges, deepening red → black)
    var base = H * 0.78;
    var layers = [
      { y: base, amp: H * 0.02, f: 0.004, seed: 5, c: [96 - 60 * dark, 34 - 22 * dark, 30 - 20 * dark] },
      { y: base + H * 0.06, amp: H * 0.025, f: 0.0028, seed: 11, c: [64 - 42 * dark, 22 - 15 * dark, 22 - 15 * dark] },
      { y: base + H * 0.13, amp: H * 0.018, f: 0.0036, seed: 23, c: [30 - 20 * dark, 12 - 8 * dark, 14 - 9 * dark] }
    ];
    layers.forEach(function (L) {
      ctx.fillStyle = 'rgb(' + L.c.map(function (v) { return Math.max(2, Math.round(v)); }).join(',') + ')';
      ctx.beginPath();
      ctx.moveTo(-20, H + 20);
      ridge(L.y, L.amp, L.f, L.seed).forEach(function (p) { ctx.lineTo(p[0], p[1]); });
      ctx.lineTo(W + 20, H + 20);
      ctx.closePath();
      ctx.fill();
    });

    // Vignette
    var vg = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H * 0.5, H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    if (!reduced) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
