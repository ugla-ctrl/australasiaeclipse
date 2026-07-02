// Generate data/path.json: central line, path limits, umbra animation frames.
// All geometry derived numerically from the same engine the site uses at runtime.
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
const require = createRequire(import.meta.url);
const E = require('../js/eclipse.js');

const R = 6371;
const D2R = Math.PI / 180;

// Destination point given start, bearing (deg), distance (km)
function dest(lat, lng, brg, km) {
  const dr = km / R, la = lat * D2R, lo = lng * D2R, b = brg * D2R;
  const la2 = Math.asin(Math.sin(la) * Math.cos(dr) + Math.cos(la) * Math.sin(dr) * Math.cos(b));
  const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(dr) * Math.cos(la),
                              Math.cos(dr) - Math.sin(la) * Math.sin(la2));
  return [la2 / D2R, ((lo2 / D2R + 540) % 360) - 180];
}

function bearing(a, b) {
  const la1 = a[0] * D2R, la2 = b[0] * D2R, dl = (b[1] - a[1]) * D2R;
  const y = Math.sin(dl) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dl);
  return (Math.atan2(y, x) / D2R + 360) % 360;
}

const isTotal = (lat, lng) => {
  const c = E.circumstances(lat, lng, 0);
  return !!(c && c.type === 'total');
};

// Distance (km) from a point along bearing to the edge of totality
function edgeDist(lat, lng, brg, maxKm = 300) {
  if (!isTotal(lat, lng)) return 0;
  let lo = 0, hi = maxKm;
  const [hl, hg] = dest(lat, lng, brg, hi);
  if (isTotal(hl, hg)) return hi; // never happens with 300 km cap
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    const [ml, mg] = dest(lat, lng, brg, mid);
    if (isTotal(ml, mg)) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// --- Central line (TD hours). Umbra contact instants are ΔT-independent (fixed TD):
//     U1 = 01:31:51.9 TD, U4 = 04:21:15.8 TD.
const T0 = 1.53108, T1 = 4.35439;
const central = [];
for (let t = T0 + 0.002; t <= T1 - 0.002; t += 0.008) {
  const p = E.centralPoint(t);
  if (p) central.push({ t, lat: +p.lat.toFixed(4), lng: +p.lng.toFixed(4) });
}
console.log('central points:', central.length);

// --- Limits: perpendicular offsets from the central line
const north = [], south = [];
for (let i = 0; i < central.length; i++) {
  const p = central[i];
  const q = central[Math.min(i + 1, central.length - 1)];
  const p0 = central[Math.max(i - 1, 0)];
  const brg = bearing([p0.lat, p0.lng], [q.lat, q.lng]);
  const dn = edgeDist(p.lat, p.lng, brg - 90); // left of track ≈ north side
  const ds = edgeDist(p.lat, p.lng, brg + 90);
  north.push(dest(p.lat, p.lng, brg - 90, dn).map(v => +v.toFixed(4)));
  south.push(dest(p.lat, p.lng, brg + 90, ds).map(v => +v.toFixed(4)));
}

// --- Umbra outline frames for animation (every 90 s)
const frames = [];
for (let t = T0 + 0.004; t <= T1 - 0.004; t += 0.025) {
  const p = E.centralPoint(t);
  if (!p) continue;
  const ring = [];
  for (let b = 0; b < 360; b += 20) {
    const d = edgeDist(p.lat, p.lng, b);
    ring.push(dest(p.lat, p.lng, b, d).map(v => +v.toFixed(3)));
  }
  const c = E.circumstances(p.lat, p.lng, 0);
  frames.push({
    ut: +((t - E.EL.dT / 3600)).toFixed(4),         // UT decimal hours (ΔT from engine)
    c: [+p.lat.toFixed(3), +p.lng.toFixed(3)],
    dur: c && c.duration, ring
  });
}
console.log('umbra frames:', frames.length);

const out = {
  attribution: 'Eclipse Predictions by Fred Espenak, www.EclipseWise.com',
  central: central.map(p => [p.lat, p.lng]),
  north, south, frames
};
writeFileSync(new URL('../data/path.json', import.meta.url), JSON.stringify(out));
console.log('wrote data/path.json',
  (JSON.stringify(out).length / 1024).toFixed(0) + ' KB');

// Sanity: width at greatest eclipse ≈ 230 km
const gi = Math.floor(central.length * ((2.956 - T0) / (T1 - T0)));
const g = central[gi];
console.log('width near greatest:', (edgeDist(g.lat, g.lng, 0) + edgeDist(g.lat, g.lng, 180)).toFixed(0), 'km (expect ~229)');
