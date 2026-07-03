/* 3D globe view — Three.js. Lazy-initialised the first time the user switches to 3D.
 * Textures: NASA Blue Marble / Earth at Night (via three-globe example assets, CDN-pinned). */
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const TEX = {
  day: 'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg',
  night: 'https://unpkg.com/three-globe@2.31.0/example/img/earth-night.jpg'
};

let inited = false, running = false;
let scene, camera, renderer, globe, group, raycaster, pointer;
let pinMeshes = [];
let materials = {};
let el, light = 'night';

// interaction state
let dragging = false, px = 0, py = 0, vx = 0, vy = 0, idle = 0;
let rotX = -0.44, rotY = 2.36; // start centred on Australia
let dist = 2.9;

const D2R = Math.PI / 180;
function toVec(lat, lng, r) {
  const phi = (90 - lat) * D2R, theta = (lng + 180) * D2R;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

// --- pins + click-to-suggest, shared with the 2D map through window hooks ---
let pinGeo, clickMark;
function addPin(s) {
  if (!group) return;
  if (!pinGeo) pinGeo = new THREE.SphereGeometry(0.012, 12, 10);
  const col = s.suggested ? 0xff8a1e : 0xffce6a;
  const m = new THREE.Mesh(pinGeo, new THREE.MeshBasicMaterial({ color: col }));
  m.position.copy(toVec(s.lat, s.lng, 1.012));
  m.userData.spot = s;
  group.add(m); pinMeshes.push(m);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25 }));
  halo.position.copy(m.position); halo.userData.spot = s; // clicking the halo selects the pin too (bigger target)
  group.add(halo); pinMeshes.push(halo);
}
// Pick under the cursor. Returns {spot} if a pin was hit, else {lat,lng} on the
// globe surface, else null. Uses an ANALYTIC unit sphere (not the faceted mesh)
// and inverts toVec exactly, so the lat/lng is as accurate as a 2D map click.
const _pickSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1);
function pickAt(clientX, clientY) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const pin = raycaster.intersectObjects(pinMeshes)[0];
  if (pin) return { spot: pin.object.userData.spot };
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectSphere(_pickSphere, hit)) return null;
  globe.worldToLocal(hit); // undo the globe's rotation -> local unit-sphere coords
  const lat = 90 - Math.acos(Math.max(-1, Math.min(1, hit.y))) / D2R;
  let lng = Math.atan2(hit.z, -hit.x) / D2R - 180;
  lng = ((lng % 360) + 540) % 360 - 180;
  return { lat: lat, lng: lng };
}
function setMark(lat, lng) {
  if (!group) return;
  if (!clickMark) {
    clickMark = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff8a1e }));
    clickMark.add(new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff8a1e, transparent: true, opacity: 0.4 })));
    group.add(clickMark);
  }
  clickMark.position.copy(toVec(lat, lng, 1.013));
  clickMark.visible = true;
}
function clearMark() { if (clickMark) clickMark.visible = false; }
window.__globeAddPin = addPin;      // called by hub.js when a spot is suggested
window.__globeMark = setMark;       // amber "your spot" marker on the globe
window.__globeClearMark = clearMark;

function init() {
  el = document.getElementById('globe');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x05060a);
  el.appendChild(renderer.domElement);

  group = new THREE.Group();
  scene.add(group);

  // Earth
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  materials.day = new THREE.MeshBasicMaterial({ map: loader.load(TEX.day) });
  materials.night = new THREE.MeshBasicMaterial({ map: loader.load(TEX.night) });
  materials.day.map.colorSpace = THREE.SRGBColorSpace;
  materials.night.map.colorSpace = THREE.SRGBColorSpace;
  globe = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), materials[light]);
  group.add(globe);

  // Atmosphere (fresnel shell)
  const atm = new THREE.Mesh(
    new THREE.SphereGeometry(1.045, 64, 48),
    new THREE.ShaderMaterial({
      transparent: true, side: THREE.BackSide, depthWrite: false,
      uniforms: { c: { value: new THREE.Color(0x7aa0ff) } },
      vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 c; varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0.,0.,1.)), 3.5); gl_FragColor = vec4(c, 1.0) * i; }'
    })
  );
  group.add(atm);

  // Stars
  const starGeo = new THREE.BufferGeometry();
  const n = 1600, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(28 + Math.random() * 30);
    pos.set([v.x, v.y, v.z], i * 3);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xbfc4d6, size: 0.055, sizeAttenuation: true, transparent: true, opacity: 0.8 })));

  // Path geometry from the same data as the 2D map
  fetch('data/path.json').then(r => r.json()).then(d => {
    // umbra band ribbon
    const verts = [], idx = [];
    const N = Math.min(d.north.length, d.south.length);
    for (let i = 0; i < N; i++) {
      const a = toVec(d.north[i][0], d.north[i][1], 1.006);
      const b = toVec(d.south[i][0], d.south[i][1], 1.006);
      verts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      if (i < N - 1) {
        const k = i * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const bandGeo = new THREE.BufferGeometry();
    bandGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    bandGeo.setIndex(idx);
    group.add(new THREE.Mesh(bandGeo, new THREE.MeshBasicMaterial({
      color: 0xffce6a, transparent: true, opacity: 0.30, side: THREE.DoubleSide, depthWrite: false
    })));
    // central line
    const linePts = d.central.map(p => toVec(p[0], p[1], 1.008));
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
    group.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xfff2d6, transparent: true, opacity: 0.95 })));
  });

  // Pins — read from the shared spot list loaded by hub.js (incl. saved suggestions)
  (window.SPOTS || []).forEach(addPin);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  // ---- controls ----
  const dom = renderer.domElement;
  dom.style.cursor = 'grab';
  dom.addEventListener('pointerdown', e => { dragging = true; px = e.clientX; py = e.clientY; vx = vy = 0; dom.style.cursor = 'grabbing'; dom.setPointerCapture(e.pointerId); });
  dom.addEventListener('pointermove', e => {
    if (dragging) {
      vx = (e.clientX - px) * 0.0032; vy = (e.clientY - py) * 0.0032; // lower drag gain — less twitchy
      rotY += vx; rotX += vy;
      px = e.clientX; py = e.clientY; idle = 0;
    } else {
      // hover cursor over pins
      const r = dom.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      dom.style.cursor = raycaster.intersectObjects(pinMeshes).length ? 'pointer' : 'grab';
    }
  });
  dom.addEventListener('pointerup', e => {
    dragging = false; dom.style.cursor = 'grab';
    // click (not drag): select a pin, or check/suggest the exact point clicked
    if (Math.abs(vx) < 0.003 && Math.abs(vy) < 0.003) {
      const pick = pickAt(e.clientX, e.clientY);
      if (!pick) return;
      if (pick.spot) { if (window.__openSpot) window.__openSpot(pick.spot); }
      else if (window.__openPoint) window.__openPoint(pick.lat, pick.lng);
    }
  });
  dom.addEventListener('wheel', e => {
    e.preventDefault();
    dist = Math.max(1.45, Math.min(5, dist + e.deltaY * 0.0011)); // gentler zoom
    idle = 0;
  }, { passive: false });

  window.addEventListener('resize', size);
  size();
  inited = true;
}

function size() {
  if (!el || !el.clientWidth) return;
  camera.aspect = el.clientWidth / el.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(el.clientWidth, el.clientHeight);
}

// ---- Moon's umbra ("Watch the shadow cross"), driven each frame by hub.js ----
let umbra = null, umbraActive = false;
const UMBRA_R = 1.016; // above band (1.006), central line (1.008) and pins (1.012)
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,214,150,0.95)');
  gr.addColorStop(0.35, 'rgba(255,182,92,0.4)');
  gr.addColorStop(1, 'rgba(255,182,92,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function buildUmbra() {
  const fill = new THREE.Mesh(new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({ color: 0x04050a, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
  const rim = new THREE.LineLoop(new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0xffe6bf, transparent: true, opacity: 0.95, depthWrite: false }));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.set(0.13, 0.13, 1);
  fill.renderOrder = 10; rim.renderOrder = 11; glow.renderOrder = 12;
  group.add(fill); group.add(rim); group.add(glow);
  umbra = { fill, rim, glow };
}
function setUmbra(ring) {
  if (!inited || !group) return;
  if (!umbra) buildUmbra();
  const pts = ring.map(p => toVec(p[0], p[1], UMBRA_R));
  const c = new THREE.Vector3();
  pts.forEach(v => c.add(v));
  c.multiplyScalar(1 / pts.length).normalize().multiplyScalar(UMBRA_R);
  const fpos = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    fpos.push(c.x, c.y, c.z, a.x, a.y, a.z, b.x, b.y, b.z);
  }
  umbra.fill.geometry.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3));
  const rpos = []; pts.forEach(v => rpos.push(v.x, v.y, v.z));
  umbra.rim.geometry.setAttribute('position', new THREE.Float32BufferAttribute(rpos, 3));
  umbra.glow.position.copy(c);
  umbra.fill.visible = umbra.rim.visible = umbra.glow.visible = true;
  umbraActive = true;
}
function clearUmbra() {
  umbraActive = false;
  if (umbra) umbra.fill.visible = umbra.rim.visible = umbra.glow.visible = false;
}
window.__globeUmbra = setUmbra;
window.__globeUmbraClear = clearUmbra;

let lastT = 0;
function loop(t) {
  if (!running) return;
  requestAnimationFrame(loop);
  const dt = Math.min((t - lastT) / 1000, 0.05); lastT = t;
  if (!dragging) {
    rotY += vx; rotX += vy;
    vx *= 0.90; vy *= 0.90; // quicker settle — less floaty spin after release
    idle += dt;
    if (idle > 3 && !umbraActive) rotY += dt * 0.05; // gentle auto-rotate when idle (paused during the shadow run)
  }
  rotX = Math.max(-1.35, Math.min(1.35, rotX));
  group.rotation.set(rotX, rotY, 0);
  camera.position.set(0, 0, dist);
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}

window.addEventListener('globe:show', e => {
  light = (e.detail && e.detail.light) || light;
  if (!inited) init();
  globe.material = materials[light];
  size();
  running = true; lastT = performance.now();
  requestAnimationFrame(loop);
});
window.addEventListener('globe:hide', () => { running = false; clearMark(); });
window.addEventListener('globe:light', e => {
  light = e.detail.light;
  if (inited) globe.material = materials[light];
});
