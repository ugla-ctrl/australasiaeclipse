/* Eclipse engine — local circumstances for the 2028 Jul 22 total solar eclipse.
 * Computed from the polynomial Besselian elements (JPL DE405).
 * Elements: Fred Espenak, www.EclipseWise.com — reproduced with required attribution.
 * Works in browser (window.Eclipse) and Node (module.exports).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Eclipse = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var D2R = Math.PI / 180;

  // Polynomial Besselian elements, t0 = 2028 Jul 22 03:00:00.0 TD
  var EL = {
    t0: 3.0,                          // decimal hours TD
    dT: 73.2,                         // ΔT seconds (UT1 = TD − ΔT)
    x:  [-0.15441,  0.54499, -0.00002, -0.00001],
    y:  [-0.58642, -0.17461, -0.00010,  0.00000],
    d:  [20.1823,  -0.0080,  -0.0000,   0.0000],
    l1: [ 0.53526, -0.00009, -0.00001,  0.0000],
    l2: [-0.01085, -0.00009, -0.00001,  0.0000],
    mu: [223.3787, 15.0010,   0.0000,   0.0000],
    tanf1: 0.0046016,
    tanf2: 0.0045786,
    // Greatest eclipse (for countdowns / display) 02:55:26.4 UT1
    greatestUT: Date.UTC(2028, 6, 22, 2, 55, 26),
    // Umbral shadow on Earth (UT1 decimal hours) — clamp searches to this window
    u1UT: 1.5107, u4UT: 4.3341
  };

  function poly(c, t) { return c[0] + t * (c[1] + t * (c[2] + t * c[3])); }
  function dpoly(c, t) { return c[1] + t * (2 * c[2] + 3 * t * c[3]); }

  // Elements at time t (decimal hours TD since midnight)
  function elements(t) {
    var s = t - EL.t0;
    return {
      x: poly(EL.x, s),  y: poly(EL.y, s),
      d: poly(EL.d, s) * D2R,
      mu: poly(EL.mu, s),
      l1: poly(EL.l1, s), l2: poly(EL.l2, s),
      dx: dpoly(EL.x, s), dy: dpoly(EL.y, s),
      dd: dpoly(EL.d, s) * D2R,
      dmu: dpoly(EL.mu, s) * D2R
    };
  }

  // Observer geocentric coordinates (lat, lng in degrees, h meters)
  function observer(lat, lng, h) {
    h = h || 0;
    var phi = lat * D2R;
    var u = Math.atan(0.99664719 * Math.tan(phi));
    return {
      rs: 0.99664719 * Math.sin(u) + (h / 6378137) * Math.sin(phi), // ρ sin φ'
      rc: Math.cos(u) + (h / 6378137) * Math.cos(phi),              // ρ cos φ'
      lat: lat, lng: lng
    };
  }

  // Fundamental-plane state for observer at time t (hours TD)
  function state(obs, t) {
    var e = elements(t);
    var H = (e.mu + obs.lng - 0.00417807 * EL.dT) * D2R; // local hour angle of shadow axis
    var sinH = Math.sin(H), cosH = Math.cos(H);
    var sind = Math.sin(e.d), cosd = Math.cos(e.d);
    var xi = obs.rc * sinH;
    var eta = obs.rs * cosd - obs.rc * cosH * sind;
    var zeta = obs.rs * sind + obs.rc * cosH * cosd;
    var dxi = e.dmu * obs.rc * cosH;
    var deta = e.dmu * xi * sind - zeta * e.dd;
    var u = e.x - xi, v = e.y - eta;
    var du = e.dx - dxi, dv = e.dy - deta;
    var L1p = e.l1 - zeta * EL.tanf1;
    var L2p = e.l2 - zeta * EL.tanf2;
    // Sun altitude (geodetic approximation)
    var phi = obs.lat * D2R;
    var sinAlt = Math.sin(phi) * sind + Math.cos(phi) * cosd * cosH;
    return { u: u, v: v, du: du, dv: dv, n2: du * du + dv * dv,
             L1p: L1p, L2p: L2p, zeta: zeta, alt: Math.asin(Math.max(-1, Math.min(1, sinAlt))) / D2R };
  }

  // Iterate to the time of maximum eclipse for an observer. Returns hours TD.
  function timeOfMax(obs) {
    var t = EL.t0;
    for (var i = 0; i < 8; i++) {
      var s = state(obs, t);
      var tau = -(s.u * s.du + s.v * s.dv) / s.n2;
      t += tau;
      if (Math.abs(tau) < 1e-7) break;
    }
    return t;
  }

  // Solve a contact: |m(t)| = radius (L1' penumbral, |L2'| umbral), sign = -1 first, +1 last
  function contact(obs, tGuess, sign, useUmbra) {
    var t = tGuess;
    for (var i = 0; i < 12; i++) {
      var s = state(obs, t);
      var L = useUmbra ? Math.abs(s.L2p) : s.L1p;
      var n = Math.sqrt(s.n2);
      var mMin = (s.u * s.dv - s.v * s.du) / n;         // min distance (signed)
      var disc = L * L - mMin * mMin;
      if (disc < 0) return null;
      var tau = -(s.u * s.du + s.v * s.dv) / s.n2 + sign * Math.sqrt(disc) / n;
      t += tau;
      if (Math.abs(tau) < 1e-7) return t;
    }
    return t;
  }

  function fmtDur(hours) {
    if (hours == null || hours <= 0) return null;
    var sec = Math.round(hours * 3600);
    return Math.floor(sec / 60) + 'm ' + ('0' + (sec % 60)).slice(-2) + 's';
  }

  // UT decimal hours → ms epoch on eclipse day
  function utToDate(hUT) {
    return Date.UTC(2028, 6, 22) + hUT * 3600000;
  }

  /* Local circumstances for any point.
   * Returns null if no eclipse visible; otherwise:
   * { type: 'total'|'partial', magnitude, obscuration, durationTotality (h), duration (str),
   *   maxUT (ms), c1UT, c2UT, c3UT, c4UT (ms|null), sunAlt (deg at max) } */
  function circumstances(lat, lng, h) {
    var obs = observer(lat, lng, h);
    var tMax = timeOfMax(obs);
    var s = state(obs, tMax);
    var m = Math.hypot(s.u, s.v);
    if (m >= s.L1p) return null;                        // no eclipse here
    var mag = (s.L1p - m) / (s.L1p + s.L2p);
    var total = s.L2p < 0 && m < -s.L2p;
    var res = {
      type: total ? 'total' : 'partial',
      magnitude: mag,
      sunAlt: s.alt,
      maxUT: utToDate(tMax - EL.dT / 3600),
      durationTotality: null, duration: null,
      c1UT: null, c2UT: null, c3UT: null, c4UT: null
    };
    if (s.alt < -0.5) return null;                      // sun below horizon at max
    var n = Math.sqrt(s.n2);
    var c1 = contact(obs, tMax - Math.abs(s.L1p) / n, -1, false);
    var c4 = contact(obs, tMax + Math.abs(s.L1p) / n, +1, false);
    if (c1 != null) res.c1UT = utToDate(c1 - EL.dT / 3600);
    if (c4 != null) res.c4UT = utToDate(c4 - EL.dT / 3600);
    if (total) {
      var semi = Math.sqrt(s.L2p * s.L2p - m * m) / n;  // hours
      res.durationTotality = 2 * semi;
      res.duration = fmtDur(2 * semi);
      res.c2UT = utToDate(tMax - semi - EL.dT / 3600);
      res.c3UT = utToDate(tMax + semi - EL.dT / 3600);
    }
    // Obscuration: two-circle overlap, sun radius ∝ 1, moon/sun ratio from L1',L2'
    var ratio = (s.L1p + s.L2p) / (s.L1p - s.L2p);      // moon:sun apparent size
    res.obscuration = total ? 1 : obscuration(mag, ratio);
    return res;
  }

  // Fraction of Sun's area covered, from magnitude and size ratio
  function obscuration(mag, ratio) {
    if (mag <= 0) return 0;
    if (mag >= 1) return 1;
    var sep = 1 + ratio - 2 * mag;                      // center separation (sun radii)
    var r = ratio;
    if (sep >= 1 + r) return 0;
    if (sep <= r - 1) return 1;
    var a = Math.acos(Math.max(-1, Math.min(1, (sep * sep + 1 - r * r) / (2 * sep))));
    var b = Math.acos(Math.max(-1, Math.min(1, (sep * sep + r * r - 1) / (2 * sep * r))));
    return (a + r * r * b - sep * Math.sin(a)) / Math.PI;
  }

  /* Point on the central line at time t (hours TD). Returns {lat,lng} or null. */
  function centralPoint(t) {
    var e = elements(t);
    var e2 = 0.00669438;
    var rho1 = Math.sqrt(1 - e2 * Math.cos(e.d) * Math.cos(e.d));
    var sd1 = Math.sin(e.d) / rho1;
    var cd1 = Math.sqrt(1 - e2) * Math.cos(e.d) / rho1;
    var y1 = e.y / rho1;
    var b2 = 1 - e.x * e.x - y1 * y1;
    if (b2 < 0) return null;
    var B = Math.sqrt(b2);
    var sinPhi1 = B * sd1 + y1 * cd1;
    var cosPhi1SinH = e.x;
    var cosPhi1CosH = B * cd1 - y1 * sd1;
    var H = Math.atan2(cosPhi1SinH, cosPhi1CosH) / D2R;
    var phi1 = Math.asin(Math.max(-1, Math.min(1, sinPhi1)));
    var lat = Math.atan(Math.tan(phi1) / Math.sqrt(1 - e2)) / D2R;
    var lng = H - e.mu + 0.00417807 * EL.dT;
    lng = ((lng + 540) % 360) - 180;
    return { lat: lat, lng: lng };
  }

  return {
    EL: EL,
    circumstances: circumstances,
    centralPoint: centralPoint,
    fmtDur: fmtDur
  };
}));
