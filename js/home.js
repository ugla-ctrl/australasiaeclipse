/* Home: countdown to greatest eclipse (2028-07-22 02:55:29 UT). */
(function () {
  'use strict';
  var TARGET = Date.UTC(2028, 6, 22, 2, 55, 29);
  var el = { d: document.getElementById('cd-d'), h: document.getElementById('cd-h'), m: document.getElementById('cd-m'), s: document.getElementById('cd-s') };
  if (!el.d) return;
  function tick() {
    var left = Math.max(0, TARGET - Date.now());
    var s = Math.floor(left / 1000);
    el.d.textContent = Math.floor(s / 86400);
    el.h.textContent = ('0' + Math.floor(s / 3600) % 24).slice(-2);
    el.m.textContent = ('0' + Math.floor(s / 60) % 60).slice(-2);
    el.s.textContent = ('0' + s % 60).slice(-2);
  }
  tick();
  setInterval(tick, 1000);
})();
