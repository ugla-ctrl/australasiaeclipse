import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const E = require('../js/eclipse.js');

const fmt = ms => ms == null ? '—' : new Date(ms).toISOString().slice(11, 19) + ' UT';

const sites = [
  ['Greatest eclipse pt', -15.5783, 126.7067, '5m 10s, alt 52.6, max 02:55:26 UT'],
  ['Broome',              -17.9614, 122.2359, '~5m 04s, ~03:14 UT'],
  ['Kununurra',           -15.7736, 128.7386, '~4m 58s'],
  ['Alice Springs',       -23.6980, 133.8807, 'near limit ~2m55s?'],
  ['Coober Pedy',         -29.0135, 134.7544, '~3m 40s'],
  ['Sydney Opera House',  -33.8568, 151.2153, '~3m 49s, ~04:19 UT'],
  ['Queenstown NZ',       -45.0312, 168.6626, '~2m 40s, low sun'],
  ['Dunedin NZ',          -45.8788, 170.5028, '~2m 15s, sun ~1°'],
  ['Perth (partial)',     -31.9523, 115.8613, 'partial only'],
  ['Auckland (partial)',  -36.8485, 174.7633, 'partial only'],
];

for (const [name, lat, lng, expect] of sites) {
  const c = E.circumstances(lat, lng, 0);
  if (!c) { console.log(name.padEnd(22), 'no eclipse visible   expect:', expect); continue; }
  console.log(
    name.padEnd(22),
    c.type.padEnd(8),
    (c.duration || '—').padEnd(8),
    'mag ' + c.magnitude.toFixed(3),
    'obsc ' + (c.obscuration * 100).toFixed(1) + '%',
    'alt ' + c.sunAlt.toFixed(1) + '°',
    'max ' + fmt(c.maxUT),
    'C2 ' + fmt(c.c2UT),
    '| expect:', expect
  );
}

// central line sanity: landfall→exit
for (const t of [1.6, 2.0, 2.956, 3.5, 4.0, 4.28]) {
  const p = E.centralPoint(t);
  console.log('t=' + t.toFixed(2) + 'h TD central:', p ? p.lat.toFixed(2) + ', ' + p.lng.toFixed(2) : 'off-earth');
}
