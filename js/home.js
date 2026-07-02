/* Home: countdown + a restrained, editorial total-eclipse hero.
 * A single black Moon disc with a soft, slowly-breathing corona over a deep
 * starfield — no day→night theatrics, no diamond-ring flash. Quiet and premium. */
(function () {
  'use strict';

  // ---------- Countdown (greatest eclipse 2028-07-22 02:55:26 UT) ----------
  var TARGET = Date.UTC(2028, 6, 22, 2, 55, 29);
  var el = { d: document.getElementById('cd-d'), h: document.getElementById('cd-h'), m: document.getElementById('cd-m'), s: document.getElementById('cd-s') };
  function tick() {
    var left = Math.max(0, TARGET - Date.now());
    var s = Math.floor(left / 1000);
    el.d.textContent = Math.floor(s / 86400);
    el.h.textContent = ('0' + Math.floor(s / 3600) % 24).slice(-2);
    el.m.textContent = ('0' + Math.floor(s / 60) % 60).slice(-2);
    el.s.textContent = ('0' + s % 60).slice(-2);
  }
  if (el.d) { tick(); setInterval(tick, 1000); }

  // ---------- Hero ----------
  var canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W, H, dpr, stars = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = [];
    for (var i = 0; i < 190; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.25 + 0.25, tw: Math.random() * Math.PI * 2, sp: 0.4 + Math.random() * 0.9 });
    }
  }
  window.addEventListener('resize', resize);
  resize();

  function draw(now) {
    var t = now / 1000;
    var cx = W * 0.5, cy = H * 0.42;
    var R = Math.min(W, H) * 0.14;               // Moon/Sun disc radius
    var breathe = reduced ? 1 : 1 + 0.02 * Math.sin(t * 0.5);

    // Transparent — the darkened place-slideshow shows behind the corona
    ctx.clearRect(0, 0, W, H);

    // Stars
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var tw = reduced ? 0.7 : 0.55 + 0.45 * Math.sin(t * st.sp + st.tw);
      // dim stars close to the corona
      var d = Math.hypot(st.x - cx, st.y - cy);
      var fade = Math.min(1, Math.max(0.15, (d - R * 1.5) / (R * 3)));
      ctx.fillStyle = 'rgba(238,240,248,' + (0.8 * tw * fade).toFixed(3) + ')';
      ctx.fillRect(st.x, st.y, st.r, st.r);
    }

    // Corona — layered soft glow + gentle streamers, all warm-white
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    var glow = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 3.4 * breathe);
    glow.addColorStop(0, 'rgba(255,252,244,0.92)');
    glow.addColorStop(0.12, 'rgba(255,240,214,0.5)');
    glow.addColorStop(0.4, 'rgba(255,214,150,0.14)');
    glow.addColorStop(1, 'rgba(255,206,106,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, R * 3.4 * breathe, 0, 7); ctx.fill();

    if (!reduced) {
      for (var k = 0; k < 30; k++) {
        var ang = (k / 30) * Math.PI * 2 + Math.sin(t * 0.15 + k) * 0.03;
        var len = R * (1.7 + 1.4 * Math.abs(Math.sin(k * 2.4)) + 0.12 * Math.sin(t * 0.6 + k));
        var g = ctx.createLinearGradient(cx, cy, cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
        g.addColorStop(0, 'rgba(255,246,228,0.30)');
        g.addColorStop(1, 'rgba(255,214,150,0)');
        ctx.strokeStyle = g; ctx.lineWidth = R * 0.4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * R * 1.0, cy + Math.sin(ang) * R * 1.0);
        ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
        ctx.stroke();
      }
    }
    ctx.restore();

    // The Moon — pure black disc with a faint warm rim
    ctx.fillStyle = '#050507';
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,236,205,0.22)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R + 0.5, 0, 7); ctx.stroke();

    if (!reduced) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
