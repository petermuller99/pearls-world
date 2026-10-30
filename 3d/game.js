// First Steps 3D: a prototype of the runner in Three.js.
// Pearl runs toward -z along the Lekki-Ikoyi Link Bridge. Everything is built from
// simple shapes and canvas textures, so there are no model files to download.
import * as THREE from './vendor/three.module.min.js';

const $ = id => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const COL = { ink: 0x24163d, pearl: 0xfff8f0, coral: 0xff6b4a, lagoon: 0x0f8a8f, sun: 0xffc93c, blush: 0xff5c8a, skin: 0x8a5a3c, hair: 0x2b1a12 };
const LANES = [-1.5, 0, 1.5];
const RUN_MS = [
  { m: 60, t: 'First smile!' }, { m: 180, t: 'First word: "Dada"!' }, { m: 340, t: 'First tooth!' },
  { m: 520, t: 'First steps!', stage: 1 }, { m: 800, t: 'Walking like a pro!' }, { m: 1100, t: 'Off she runs!', stage: 2 },
  { m: 1500, t: 'Happy 1st birthday, Pearl!' }, { m: 2100, t: 'Big girl now!' }, { m: 3000, t: 'Unstoppable Pearl!' }];
const STAGE_SPEED = [5, 7, 9.5];

/* ---------- renderer ---------- */
const canvas = $('c');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  $('menu').hidden = true; $('nogl').hidden = false;
  throw e;
}
let pixelRatio = Math.min(devicePixelRatio || 1, 2);
renderer.setPixelRatio(pixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const HORIZON = 0xffd9a8;
scene.fog = new THREE.Fog(HORIZON, 40, 170);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);

function resize() {
  const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Keep about 64 degrees visible side to side so all three lanes fit in portrait.
  const hFov = 64 * Math.PI / 180;
  camera.fov = THREE.MathUtils.clamp(2 * Math.atan(Math.tan(hFov / 2) / camera.aspect) * 180 / Math.PI, 50, 78);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

/* ---------- textures drawn on canvas ---------- */
function tex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
const skyTex = tex(4, 256, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#ff8f6b'); g.addColorStop(.55, '#ffc58a'); g.addColorStop(1, '#ffe3b0');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});
scene.background = skyTex;

// Deck: sandy walkway in the middle for Pearl, a road on each side for danfos and keke.
const DECK_W = 13, SEG = 20;
const deckTex = tex(512, 128, (c, w, h) => {
  const u = w / DECK_W, X = x => (x + DECK_W / 2) * u;
  c.fillStyle = '#4b3a58'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#f2c79a'; c.fillRect(X(-2.6), 0, X(2.6) - X(-2.6), h);
  c.fillStyle = '#e8b688';
  for (let i = 0; i < 8; i++) c.fillRect(X(-2.6), i * 16, X(2.6) - X(-2.6), 2);
  c.fillStyle = '#fff8f0';
  for (const x of [-.75, .75]) for (let y = 0; y < h; y += 32) c.fillRect(X(x) - 2, y, 4, 18);
  c.fillStyle = '#ffc93c';
  for (const x of [-4.5, 4.5]) for (let y = 0; y < h; y += 64) c.fillRect(X(x) - 3, y, 6, 36);
}, true);
deckTex.repeat.set(1, SEG / 13);

const ankaraTex = tex(256, 128, (c, w, h) => {
  c.fillStyle = '#ff6b4a'; c.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 32) for (let x = (y / 32 % 2) * 16; x < w; x += 32) {
    c.fillStyle = '#ffc93c'; c.beginPath(); c.arc(x, y + 16, 10, 0, 7); c.fill();
    c.fillStyle = '#24163d'; c.beginPath(); c.arc(x, y + 16, 5, 0, 7); c.fill();
    c.fillStyle = '#fff8f0'; c.beginPath(); c.arc(x, y + 16, 2, 0, 7); c.fill();
  }
  c.fillStyle = '#0f8a8f'; c.fillRect(0, h - 10, w, 6);
}, true);

const flagTex = tex(96, 48, (c, w, h) => {
  c.fillStyle = '#008751'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#ffffff'; c.fillRect(w / 3, 0, w / 3, h);
});

function blockTex(letter, bg) {
  return tex(128, 128, (c, w, h) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#24163d'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10);
    c.fillStyle = '#fff8f0'; c.font = '400 84px "Bagel Fat One", "Arial Rounded MT Bold", sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(letter, w / 2, h / 2 + 6);
  });
}
const BLOCK_COLS = ['#ff6b4a', '#0f8a8f', '#ff5c8a', '#ffc93c', '#6b4fc9', '#3aa655'];
const blockMats = 'ABCDEF'.split('').map((l, i) => new THREE.MeshLambertMaterial({ map: blockTex(l, BLOCK_COLS[i]) }));

const ballTex = tex(256, 64, (c, w, h) => {
  const cols = ['#ff6b4a', '#fff8f0', '#ffc93c', '#fff8f0', '#0f8a8f', '#fff8f0', '#ff5c8a', '#fff8f0'];
  cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(i * w / cols.length, 0, w / cols.length + 1, h); });
});

const windowTex = tex(64, 128, (c, w, h) => {
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#d9c2b0';
  for (let y = 6; y < h; y += 14) for (let x = 6; x < w; x += 14) c.fillRect(x, y, 7, 8);
  c.fillStyle = '#ffe9a8';
  for (let i = 0; i < 6; i++) c.fillRect(6 + 14 * Math.floor(Math.random() * 4), 6 + 14 * Math.floor(Math.random() * 9), 7, 8);
}, true);

const danfoTex = tex(256, 64, (c, w, h) => {
  c.fillStyle = '#ffc93c'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#24163d'; c.fillRect(0, 38, w, 7); c.fillRect(0, 50, w, 4);
  c.fillStyle = '#3c3350';
  for (let x = 10; x < w - 20; x += 34) c.fillRect(x, 8, 26, 22);
});

/* ---------- shared bits ---------- */
const M = {
  skin: new THREE.MeshLambertMaterial({ color: COL.skin }),
  hair: new THREE.MeshLambertMaterial({ color: COL.hair }),
  blush: new THREE.MeshLambertMaterial({ color: COL.blush }),
  bowKnot: new THREE.MeshLambertMaterial({ color: 0xffd1e0 }),
  eye: new THREE.MeshBasicMaterial({ color: 0x1a1020 }),
  white: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  cheek: new THREE.MeshBasicMaterial({ color: 0xff8a8a, transparent: true, opacity: .45 }),
  dress: new THREE.MeshLambertMaterial({ map: ankaraTex }),
  shoe: new THREE.MeshLambertMaterial({ color: COL.pearl }),
  shadow: new THREE.MeshBasicMaterial({ color: COL.ink, transparent: true, opacity: .28, depthWrite: false }),
  pearl: new THREE.MeshStandardMaterial({ color: 0xfff8f0, roughness: .15, metalness: .1, emissive: 0x6a5a70, emissiveIntensity: .35 }),
  ball: new THREE.MeshLambertMaterial({ map: ballTex }),
  bottle: new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: .85 }),
  milk: new THREE.MeshLambertMaterial({ color: 0xfff3dc }),
  rail: new THREE.MeshLambertMaterial({ color: 0xfff8f0 }),
  barrier: new THREE.MeshLambertMaterial({ color: 0xd9cfe0 }),
  pylon: new THREE.MeshLambertMaterial({ color: 0xf4ece6 }),
  danfo: new THREE.MeshLambertMaterial({ map: danfoTex }),
  danfoTop: new THREE.MeshLambertMaterial({ color: COL.sun }),
  tyre: new THREE.MeshLambertMaterial({ color: 0x1d1626 }),
  kekeBody: new THREE.MeshLambertMaterial({ color: 0x3aa655 }),
  kekeRoof: new THREE.MeshLambertMaterial({ color: COL.sun }),
  palmLeaf: new THREE.MeshLambertMaterial({ color: 0x2f9e6a, side: THREE.DoubleSide }),
  trunk: new THREE.MeshLambertMaterial({ color: 0x7a4a2c }),
};
const G = {
  sphere: new THREE.SphereGeometry(1, 20, 14),
  lowSphere: new THREE.SphereGeometry(1, 10, 8),
  box: new THREE.BoxGeometry(1, 1, 1),
  shadow: new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
};
function mesh(geo, mat, sx = 1, sy = sx, sz = sx) { const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); return m; }

/* ---------- lights ---------- */
scene.add(new THREE.HemisphereLight(0xffe2c4, 0x2c6f7a, 1.6));
const key = new THREE.DirectionalLight(0xfff0dc, 1.7);
key.position.set(-4, 10, 8);
scene.add(key, key.target);
// Low sunset light from ahead, so Pearl's face is lit whenever she turns to the camera.
const sunLight = new THREE.DirectionalLight(0xffc89a, 1.5);
scene.add(sunLight, sunLight.target);

/* ---------- Pearl ---------- */
// Built facing local +z; `inner` is turned 180 degrees so she faces down the bridge (-z).
function makePearl() {
  const root = new THREE.Group(), inner = new THREE.Group(), hips = new THREE.Group(), torso = new THREE.Group(), head = new THREE.Group();
  inner.rotation.y = Math.PI;
  root.add(inner); inner.add(hips); hips.add(torso);

  const dress = new THREE.Mesh(new THREE.CylinderGeometry(.2, .34, .5, 18), M.dress);
  dress.position.y = .22; torso.add(dress);
  const collar = mesh(G.sphere, M.skin, .14); collar.position.y = .5; torso.add(collar);

  const limb = (len, r) => { const g = new THREE.CapsuleGeometry(r, len, 4, 10); g.translate(0, -len / 2 - r / 2, 0); return g; };
  const armGeo = limb(.24, .07), legGeo = limb(.24, .08);
  const arms = [-1, 1].map(s => { const a = new THREE.Group(); a.position.set(s * .2, .44, 0); const m = new THREE.Mesh(armGeo, M.skin); a.add(m); torso.add(a); return a; });
  const legs = [-1, 1].map(s => {
    const l = new THREE.Group(); l.position.set(s * .1, 0, 0);
    l.add(new THREE.Mesh(legGeo, M.skin));
    const shoe = mesh(G.lowSphere, M.shoe, .09, .07, .12); shoe.position.set(0, -.36, .03); l.add(shoe);
    hips.add(l); return l;
  });

  head.position.y = .82; torso.add(head);
  const skull = mesh(G.sphere, M.skin, .36); head.add(skull);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(.375, 24, 12, 0, Math.PI * 2, 0, Math.PI * .42), M.hair);
  cap.rotation.x = -.35; head.add(cap);
  for (const s of [-1, 1]) { const bun = mesh(G.sphere, M.hair, .17); bun.position.set(s * .3, .26, -.05); head.add(bun); }
  // Bow on the top right, visible from behind and in front.
  const bow = new THREE.Group(); bow.position.set(.17, .33, -.06); bow.rotation.set(-.5, 0, -.45); head.add(bow);
  for (const s of [-1, 1]) {
    const w = mesh(G.sphere, M.blush, .13, .09, .06); w.position.x = s * .11; w.rotation.z = s * .35; bow.add(w);
  }
  bow.add(mesh(G.sphere, M.bowKnot, .055));

  const face = new THREE.Group(); head.add(face);
  for (const s of [-1, 1]) {
    const eye = mesh(G.sphere, M.eye, .045); eye.position.set(s * .13, .02, .335); face.add(eye);
    const hi = mesh(G.sphere, M.white, .014); hi.position.set(s * .13 + .015, .04, .375); face.add(hi);
    const ch = mesh(G.sphere, M.cheek, .07, .05, .02); ch.position.set(s * .22, -.09, .29); ch.lookAt(s * .6, -.25, .8); face.add(ch);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(.08, .016, 6, 14, Math.PI), M.eye);
  smile.rotation.z = Math.PI; smile.position.set(0, -.07, .335); face.add(smile);

  // Photo face: a curved patch on the front of the head, shown when Daddy has added a photo.
  const photoMat = new THREE.MeshLambertMaterial({ transparent: true });
  const W = 1.35;
  const photo = new THREE.Mesh(new THREE.SphereGeometry(.366, 24, 16, Math.PI / 2 - W / 2, W, Math.PI / 2 - W / 2 + .08, W), photoMat);
  photo.visible = false; head.add(photo);

  const shadow = mesh(G.shadow, M.shadow, .38); shadow.position.y = .015; root.add(shadow);

  return { root, inner, hips, torso, head, arms, legs, face, photo, photoMat, shadow };
}
const P = makePearl();
scene.add(P.root);

function loadPhoto() {
  const url = store.get('pw_face', null);
  if (!url) return;
  const im = new Image();
  im.onload = () => {
    const t = tex(256, 256, (c, w, h) => {
      c.save(); c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 4, 0, 7); c.clip();
      c.drawImage(im, 0, 0, w, h); c.restore();
    });
    P.photoMat.map = t; P.photoMat.needsUpdate = true;
    P.photo.visible = true; P.face.visible = false;
  };
  im.src = url;
}
loadPhoto();

// Poses: 0 crawl, 1 toddle, 2 run. `turn` spins her round to face the chase camera,
// `wave` lifts her right hand to wave, `idle` stands her still.
function posePearl(ph, stage, air, turn, wave, idle, t) {
  const sw = Math.sin(ph), cw = Math.cos(ph);
  let hipY, lean, headX, armX = [0, 0], armZ = [0, 0], legX = [0, 0], bob = 0, roll = 0;
  if (stage === 0 && !air) {
    hipY = .3; lean = 1.25; headX = -1.05;
    armX = [-lean + sw * .45, -lean - sw * .45]; legX = [1.25 - sw * .35, 1.25 + sw * .35];
    armZ = [-.12, .12]; bob = Math.abs(cw) * .03;
  } else if (stage === 1 && !air) {
    hipY = .42; lean = .08; headX = -.05;
    legX = [sw * .4, -sw * .4]; armX = [-.3, -.3]; armZ = [-1.0 + cw * .15, 1.0 + cw * .15];
    roll = sw * .1; bob = Math.abs(cw) * .05;
    if (idle) { legX = [0, 0]; roll = Math.sin(t * 2.2) * .06; bob = 0; armZ = [-.25 - Math.sin(t * 2.2) * .08, .25]; }
  } else {
    hipY = .42; lean = air ? .15 : .28; headX = -.2;
    legX = air ? [-.9, .5] : [sw * .85, -sw * .85]; armX = air ? [-2.4, -2.4] : [-sw * .9, sw * .9];
    armZ = air ? [-.35, .35] : [-.15, .15]; bob = air ? 0 : Math.abs(cw) * .08;
  }
  if (wave > 0) {
    lean = lerp(lean, .05, wave); headX = lerp(headX, -.1, wave); hipY = lerp(hipY, .42, wave);
    armX[1] = lerp(armX[1], 0, wave); armZ[1] = lerp(armZ[1], 2.6 + Math.sin(t * 14) * .35, wave);
    if (!air && !idle) { legX = [lerp(legX[0], sw * .3, wave), lerp(legX[1], -sw * .3, wave)]; }
  }
  P.hips.position.y = hipY + bob;
  P.torso.rotation.set(lean, 0, roll);
  P.head.rotation.x = headX;
  P.arms.forEach((a, i) => a.rotation.set(armX[i], 0, armZ[i]));
  P.legs.forEach((l, i) => l.rotation.set(legX[i], 0, 0));
  P.inner.rotation.y = Math.PI * (1 - turn);
}

/* ---------- the bridge and the world ---------- */
const deckGeo = new THREE.BoxGeometry(DECK_W, .5, SEG);
const deckMats = [M.barrier, M.barrier, new THREE.MeshLambertMaterial({ map: deckTex }), M.barrier, M.barrier, M.barrier];
const segments = [];
for (let i = 0; i < 9; i++) {
  const g = new THREE.Group();
  const d = new THREE.Mesh(deckGeo, deckMats); d.position.y = -.25; g.add(d);
  for (const s of [-1, 1]) {
    const bar = mesh(G.box, M.barrier, .25, .35, SEG); bar.position.set(s * 2.75, .17, 0); g.add(bar);
    const rail = mesh(G.box, M.rail, .12, .1, SEG); rail.position.set(s * 6.4, .9, 0); g.add(rail);
    for (let z = -SEG / 2; z < SEG / 2; z += 2.5) { const post = mesh(G.box, M.rail, .1, .9, .1); post.position.set(s * 6.4, .45, z); g.add(post); }
  }
  g.position.z = -i * SEG;
  scene.add(g); segments.push(g);
}

// Cable-stayed pylon arching over the bridge, with the Nigerian flag on top.
const flags = [];
function makePylon() {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const leg = mesh(G.box, M.pylon, .7, 15, .9); leg.position.set(s * 6.9, 7.5, 0); g.add(leg);
  }
  const beam = mesh(G.box, M.pylon, 14.5, .9, 1); beam.position.y = 15; g.add(beam);
  const pole = mesh(G.cyl, M.rail, .05, 3, .05); pole.position.y = 16.9; g.add(pole);
  const fGeo = new THREE.PlaneGeometry(2, 1, 12, 1); fGeo.translate(1, 0, 0);
  const flag = new THREE.Mesh(fGeo, new THREE.MeshLambertMaterial({ map: flagTex, side: THREE.DoubleSide }));
  flag.position.set(0, 17.9, 0); flag.rotation.y = -Math.PI / 2 - .5; g.add(flag);
  flags.push({ geo: fGeo, base: Float32Array.from(fGeo.attributes.position.array) });
  const pts = [];
  for (const s of [-1, 1]) for (const dz of [-22, -15, -9, -4, 4, 9, 15, 22]) pts.push(s * 6.9, 14, 0, s * 6.4, 1, dz);
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: 0xfff8f0 })));
  scene.add(g); return g;
}
const PYLON_GAP = 110;
const pylons = [0, 1].map(i => { const p = makePylon(); p.position.z = -60 - i * PYLON_GAP; return p; });

const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: 0x1a9a9a }));
water.rotation.x = -Math.PI / 2; water.position.y = -2.2; scene.add(water);
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(26, 40), new THREE.MeshBasicMaterial({ color: 0xfff1c9, fog: false }));
scene.add(sunDisc);

// Skyline on both shores, recycled as Pearl moves.
const BCOLS = [0xf0a48a, 0xe58f7e, 0xf6c3a0, 0xd98a8a, 0xf2b5a0, 0xc9a0b8];
const buildings = [];
for (let i = 0; i < 44; i++) {
  const s = i % 2 ? 1 : -1, h = rand(8, 34), w = rand(5, 10);
  const mat = new THREE.MeshLambertMaterial({ color: BCOLS[i % BCOLS.length], map: windowTex });
  const b = new THREE.Mesh(G.box, mat); b.scale.set(w, h, w);
  b.userData.s = s;
  b.position.set(s * rand(38, 75), h / 2 - 2.2, -i * 9 + rand(-3, 3));
  scene.add(b); buildings.push(b);
}
// A few palms on little sandbanks between the bridge and the shore.
const palms = [];
function makePalm() {
  const g = new THREE.Group();
  const sand = mesh(G.lowSphere, new THREE.MeshLambertMaterial({ color: 0xf2c79a }), 3, .6, 2.2); sand.position.y = -2.2; g.add(sand);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.18, .28, 6, 8), M.trunk); trunk.position.y = 1; trunk.rotation.z = .12; g.add(trunk);
  const leafGeo = new THREE.PlaneGeometry(3, .7); leafGeo.translate(1.5, 0, 0);
  for (let k = 0; k < 7; k++) { const l = new THREE.Mesh(leafGeo, M.palmLeaf); l.position.set(.35, 4, 0); l.rotation.set(0, k / 7 * Math.PI * 2, -.45); g.add(l); }
  scene.add(g); return g;
}
for (let i = 0; i < 6; i++) { const p = makePalm(); const s = i % 2 ? 1 : -1; p.userData.s = s; p.position.set(s * rand(13, 22), 0, -i * 30 - 10); palms.push(p); }

// Danfo buses and keke on the outer roads.
function makeDanfo() {
  const g = new THREE.Group();
  const mats = [M.danfo, M.danfo, M.danfoTop, M.tyre, M.danfoTop, M.danfoTop];
  const body = new THREE.Mesh(G.box, mats); body.scale.set(1.5, 1.3, 3.6); body.position.y = .95; g.add(body);
  const top = mesh(G.box, M.danfoTop, 1.5, .12, 3.4); top.position.y = 1.66; g.add(top);
  for (const x of [-.75, .75]) for (const z of [-1.15, 1.15]) {
    const w = new THREE.Mesh(G.cyl, M.tyre); w.scale.set(.32, .2, .32); w.rotation.z = Math.PI / 2; w.position.set(x, .32, z); g.add(w);
  }
  scene.add(g); return g;
}
function makeKeke() {
  const g = new THREE.Group();
  const body = mesh(G.sphere, M.kekeBody, .6, .55, .95); body.position.y = .75; g.add(body);
  const roof = mesh(G.box, M.kekeRoof, 1.1, .1, 1.7); roof.position.y = 1.55; g.add(roof);
  for (const x of [-.5, .5]) { const p = mesh(G.box, M.tyre, .06, .7, .06); p.position.set(x, 1.2, .6); g.add(p); }
  for (const [x, z] of [[-.5, .5], [.5, .5], [0, -.75]]) {
    const w = new THREE.Mesh(G.cyl, M.tyre); w.scale.set(.25, .14, .25); w.rotation.z = Math.PI / 2; w.position.set(x, .25, z); g.add(w);
  }
  scene.add(g); return g;
}
const vehicles = [
  { m: makeDanfo(), x: -4.5, v: 13 }, { m: makeKeke(), x: 4.5, v: 11 },
  { m: makeDanfo(), x: 4.5, v: 15 }, { m: makeKeke(), x: -4.5, v: 9 },
];
vehicles.forEach((o, i) => { o.m.position.set(o.x, 0, -20 - i * 25); o.m.rotation.y = Math.PI; });

/* ---------- obstacles and pickups ---------- */
const items = [];
function addItem(kind, lane, z, y = 0) {
  let m;
  if (kind === 'block') {
    const i = Math.floor(Math.random() * 6);
    m = new THREE.Mesh(G.box, [0, 1, 2, 3, 4, 5].map(k => blockMats[(i + k) % 6]));
    m.scale.setScalar(.75); m.position.y = .375; m.rotation.y = rand(-.3, .3);
  } else if (kind === 'ball') {
    m = mesh(G.sphere, M.ball, .38); m.position.y = .38;
  } else if (kind === 'pearl') {
    m = mesh(G.sphere, M.pearl, .17); m.position.y = .55 + y;
  } else {
    m = new THREE.Group();
    const b = mesh(G.cyl, M.bottle, .14, .42, .14); b.position.y = .21; m.add(b);
    const milk = mesh(G.cyl, M.milk, .12, .3, .12); milk.position.y = .16; m.add(milk);
    const capM = mesh(G.cyl, M.blush, .15, .08, .15); capM.position.y = .46; m.add(capM);
    const teat = mesh(G.sphere, M.bowKnot, .07, .1, .07); teat.position.y = .55; m.add(teat);
    m.position.y = .3;
  }
  const holder = new THREE.Group(); holder.add(m);
  holder.position.set(LANES[lane], 0, z);
  if (kind === 'block' || kind === 'ball') { const sh = mesh(G.shadow, M.shadow, kind === 'ball' ? .38 : .5); sh.position.y = .015; holder.add(sh); }
  scene.add(holder);
  items.push({ kind, lane, z, m, holder, baseY: m.position.y, gone: false, fly: 0 });
}
function clearItems() { for (const it of items) scene.remove(it.holder); items.length = 0; }

/* ---------- confetti ---------- */
const confGeo = new THREE.PlaneGeometry(.12, .08);
const confMats = [COL.coral, COL.sun, COL.blush, 0x4cc9f0, COL.pearl, COL.lagoon].map(c => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
const confetti = [];
for (let i = 0; i < 90; i++) { const m = new THREE.Mesh(confGeo, confMats[i % 6]); m.visible = false; scene.add(m); confetti.push({ m, life: 0, v: new THREE.Vector3(), spin: new THREE.Vector3() }); }
function burst(pos, n) {
  let k = 0;
  for (const c of confetti) {
    if (c.life > 0) continue;
    c.life = rand(1, 1.8); c.m.visible = true; c.m.position.copy(pos);
    c.v.set(rand(-3, 3), rand(3, 7), rand(-3, 1)); c.spin.set(rand(-9, 9), rand(-9, 9), rand(-9, 9));
    if (++k >= n) break;
  }
}

/* ---------- sound ---------- */
let AC = null, muted = store.get('pw_mute', false);
function tone(f, d, type, v, delay) {
  if (muted) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(v || .12, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + d);
    o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0 + d + .02);
  } catch (e) {}
}
const sfx = {
  pearl() { tone(988, .09, 'sine', .1); tone(1480, .12, 'sine', .08, .06); },
  jump() { tone(420, .12, 'triangle', .08); },
  hit() { tone(180, .25, 'triangle', .18); },
  yay() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .18, 'square', .05, i * .09)); },
  heart() { tone(660, .1, 'sine', .1); tone(880, .15, 'sine', .1, .08); },
  swish() { tone(560, .08, 'sine', .06); },
};
function setSound() {
  const b = $('soundBtn'); b.setAttribute('aria-pressed', String(!muted));
  b.setAttribute('aria-label', muted ? 'Sound off' : 'Sound on'); b.style.opacity = muted ? .45 : 1;
}

/* ---------- game state ---------- */
const S = { mode: 'menu', z: 0, dist: 0, speed: 2, stage: 0, lane: 1, x: 0, y: 0, vy: 0, jumps: 0, ph: 0, t: 0,
  hearts: 3, pearls: 0, inv: 0, ms: 0, nextSpawn: 0, wave: 0, turn: 0, waveT: 0, cam: 0, paused: false };
let bank = store.get('pw_bank', 0), best = store.get('pw_best', 0);

let bannerTimer = 0;
function banner(t) { const b = $('banner'); b.textContent = t; b.classList.remove('off'); bannerTimer = 2.6; }
function hud() {
  $('hearts').textContent = '♥'.repeat(S.hearts) + '♡'.repeat(Math.max(0, 3 - S.hearts));
  $('hearts').setAttribute('aria-label', S.hearts + ' hearts');
  $('score').textContent = `${S.pearls} pearls · ${Math.floor(S.dist)} m`;
}

function start() {
  clearItems();
  Object.assign(S, { mode: 'play', dist: 0, speed: STAGE_SPEED[0], stage: 0, lane: 1, y: 0, vy: 0, jumps: 0,
    hearts: 3, pearls: 0, inv: 0, ms: 0, nextSpawn: S.z - 24, wave: 0, waveT: 0 });
  S.startZ = S.z;
  $('menu').hidden = true; $('over').hidden = true; $('hud').hidden = false;
  hud(); banner('Crawl, Pearl, crawl!');
  const hint = $('hint'); hint.classList.remove('off'); setTimeout(() => hint.classList.add('off'), 4500);
}
function toMenu() {
  S.mode = 'menu'; clearItems();
  $('over').hidden = true; $('hud').hidden = true; $('menu').hidden = false; $('banner').classList.add('off');
}
function endGame() {
  S.mode = 'over';
  bank += S.pearls; store.set('pw_bank', bank);
  const m = Math.floor(S.dist); let rec = false;
  if (m > best) { best = m; store.set('pw_best', best); rec = true; }
  $('overEyebrow').textContent = rec ? 'New longest walk' : 'Walk complete';
  $('overTitle').textContent = S.pearls >= 30 ? 'Amazing, Pearl!' : 'Well done, Pearl!';
  $('overText').textContent = `Pearl went ${m} m across the bridge and picked up ${S.pearls} pearls. Piggy bank: ${bank} pearls.`;
  setTimeout(() => { if (S.mode === 'over') { $('hud').hidden = true; $('over').hidden = false; } }, 900);
}

function spawnRow(z) {
  // Never block all three lanes: one obstacle lane, pearls in another.
  const obstLane = Math.floor(Math.random() * 3);
  const roll = Math.random();
  if (roll < .78) addItem(Math.random() < .55 ? 'block' : 'ball', obstLane, z);
  let pl = (obstLane + 1 + Math.floor(Math.random() * 2)) % 3;
  if (Math.random() < .35 && roll < .78) {
    // An arc of pearls over the obstacle, to reward jumping.
    for (let k = -2; k <= 2; k++) addItem('pearl', obstLane, z + k * .9, 1.1 - k * k * .2);
  } else {
    for (let k = 0; k < 5; k++) addItem('pearl', pl, z - k * 1.4);
  }
  if (S.hearts < 3 && Math.random() < .12) addItem('bottle', (obstLane + 1) % 3 === pl ? (obstLane + 2) % 3 : (obstLane + 1) % 3, z - 3);
}

/* ---------- input ---------- */
let touch = null;
function moveLane(d) { const n = THREE.MathUtils.clamp(S.lane + d, 0, 2); if (n !== S.lane) { S.lane = n; sfx.swish(); } }
function jump() { if (S.jumps < 2) { S.vy = S.jumps ? 6.2 : 7.2; S.jumps++; sfx.jump(); } }
canvas.addEventListener('pointerdown', e => {
  if (S.mode !== 'play') return;
  touch = { x: e.clientX, y: e.clientY, t: performance.now(), used: false };
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
});
canvas.addEventListener('pointermove', e => {
  if (!touch || touch.used || S.mode !== 'play') return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
  if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) { moveLane(dx > 0 ? 1 : -1); touch.used = true; }
  else if (dy < -34 && Math.abs(dy) > Math.abs(dx)) { jump(); touch.used = true; }
});
const endTouch = () => { if (touch && !touch.used && S.mode === 'play' && performance.now() - touch.t < 450) jump(); touch = null; };
canvas.addEventListener('pointerup', endTouch);
canvas.addEventListener('pointercancel', () => { touch = null; });
addEventListener('keydown', e => {
  if (S.mode !== 'play') return;
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a') { e.preventDefault(); moveLane(-1); }
  if (k === 'ArrowRight' || k === 'd') { e.preventDefault(); moveLane(1); }
  if ((k === ' ' || k === 'ArrowUp' || k === 'w') && !e.repeat) { e.preventDefault(); jump(); }
});
document.addEventListener('visibilitychange', () => { S.paused = document.hidden; });
$('playBtn').onclick = start; $('againBtn').onclick = start;
$('menuBtn').onclick = toMenu; $('homeBtn').onclick = () => { if (S.mode === 'play') endGame(); toMenu(); };
$('soundBtn').onclick = () => { muted = !muted; store.set('pw_mute', muted); setSound(); };

/* ---------- update ---------- */
const tmpV = new THREE.Vector3(), camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function update(dt) {
  S.t += dt;
  const playing = S.mode === 'play';
  if (playing) {
    S.speed = damp(S.speed, STAGE_SPEED[S.stage] + (S.stage === 2 ? Math.min(3, S.dist / 900) : 0), 1.5, dt);
  } else {
    S.speed = damp(S.speed, 0, 3, dt);
  }
  S.z -= S.speed * dt;
  if (playing) { S.dist = S.startZ - S.z; if (Math.floor(S.dist) !== S.shownDist) { S.shownDist = Math.floor(S.dist); hud(); } }

  // Pearl: lanes, jumping, animation
  S.x = damp(S.x, playing || S.mode === 'over' ? LANES[S.lane] : 0, 12, dt);
  S.vy -= 20 * dt; S.y += S.vy * dt;
  if (S.y <= 0) { S.y = 0; S.vy = 0; S.jumps = 0; }
  const air = S.y > .02;
  const stage = playing ? S.stage : 1, idle = !playing && S.speed < .6;
  S.ph += dt * (stage === 0 ? 1.6 : stage === 1 ? 1.3 : 1.15) * Math.max(S.speed, 1);
  if (S.waveT > 0) S.waveT -= dt;
  S.turn = damp(S.turn, S.waveT > 0 ? 1 : 0, 6, dt);
  S.wave = damp(S.wave, S.waveT > 0 || !playing ? 1 : 0, 6, dt);
  posePearl(S.ph, stage, air, S.turn, S.wave, idle, S.t);
  P.root.position.set(S.x, S.y, S.z);
  P.root.rotation.z = (LANES[S.lane] - S.x) * -.12;
  P.shadow.position.y = .015 - S.y; P.shadow.scale.setScalar(Math.max(.15, .38 - S.y * .12));
  if (S.inv > 0) { S.inv -= dt; P.inner.visible = Math.floor(S.inv * 12) % 2 === 0; } else P.inner.visible = true;

  if (playing) {
    // Milestones
    const next = RUN_MS[S.ms];
    if (next && S.dist >= next.m) {
      S.ms++; banner(next.t); sfx.yay(); burst(tmpV.set(S.x, 1.2, S.z - 1), 60);
      if (next.stage != null) S.stage = next.stage;
      S.waveT = 1.8;
      // Clear the way while she turns round to wave at Daddy.
      for (const it of items) if (!it.gone && (it.kind === 'block' || it.kind === 'ball') && it.z < S.z && it.z > S.z - S.speed * 3) { it.gone = true; it.fly = 1; }
    }
    // Spawning
    while (S.nextSpawn > S.z - 70) { spawnRow(S.nextSpawn); S.nextSpawn -= rand(9, 14) + S.speed * .4; }
  }

  // Items: collisions and cleanup
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.kind === 'pearl') { it.m.position.y = it.baseY + Math.sin(S.t * 4 + it.z) * .06; it.m.rotation.y += dt * 2; }
    if (it.kind === 'bottle') it.m.rotation.y += dt * 2.5;
    if (it.fly > 0) {
      it.fly -= dt * 1.4; it.holder.position.y += dt * 9; it.holder.position.x += dt * (it.lane - 1 || 1) * 5;
      it.m.rotation.x += dt * 8; it.holder.scale.setScalar(Math.max(.01, it.fly));
      if (it.fly <= 0) { scene.remove(it.holder); items.splice(i, 1); }
      continue;
    }
    if (it.z > S.z + 8) { scene.remove(it.holder); items.splice(i, 1); continue; }
    if (!playing || it.gone) continue;
    const dz = Math.abs(it.z - S.z), dx = Math.abs(LANES[it.lane] - S.x);
    if (it.kind === 'pearl') {
      if (dz < .6 && dx < .6 && Math.abs(it.m.position.y - (S.y + .6)) < .7) {
        it.gone = true; scene.remove(it.holder); items.splice(i, 1);
        S.pearls++; sfx.pearl(); burst(tmpV.set(LANES[it.lane], it.m.position.y, it.z), 4); hud();
      }
    } else if (it.kind === 'bottle') {
      if (dz < .6 && dx < .6 && S.y < .8) {
        scene.remove(it.holder); items.splice(i, 1);
        S.hearts = Math.min(3, S.hearts + 1); sfx.heart(); banner('Milk time! +1 heart'); hud();
      }
    } else if (dz < .55 && dx < .62 && S.y < (it.kind === 'block' ? .72 : .66) && S.inv <= 0) {
      it.gone = true; it.fly = 1; S.hearts--; S.inv = 1.4; sfx.hit(); hud();
      if (S.hearts <= 0) endGame(); else banner(S.hearts === 1 ? 'Careful, Pearl! One heart left' : 'Oopsie! Up you get');
    }
  }

  // World recycling around Pearl
  for (const g of segments) if (g.position.z > S.z + SEG * 1.5) g.position.z -= SEG * segments.length;
  for (const p of pylons) if (p.position.z > S.z + 30) p.position.z -= PYLON_GAP * pylons.length;
  for (const b of buildings) if (b.position.z > S.z + 40) { b.position.z -= 44 * 9; b.position.x = b.userData.s * rand(38, 75); }
  for (const p of palms) if (p.position.z > S.z + 25) p.position.z -= 6 * 30;
  for (const v of vehicles) {
    v.m.position.z -= v.v * dt * (S.mode === 'over' ? .4 : 1);
    if (v.m.position.z < S.z - 160) v.m.position.z = S.z + rand(15, 40);
    if (v.m.position.z > S.z + 40) v.m.position.z = S.z - rand(60, 150);
  }
  water.position.z = S.z - 150; sunDisc.position.set(0, 26, S.z - 330);
  key.position.set(S.x - 4, 10, S.z + 8); key.target.position.set(S.x, 0, S.z);
  sunLight.position.set(S.x + 2, 4, S.z - 10); sunLight.target.position.set(S.x, .8, S.z);
  for (const f of flags) {
    const a = f.geo.attributes.position;
    for (let i = 0; i < a.count; i++) { const x = f.base[i * 3]; a.setZ(i, Math.sin(x * 2.4 - S.t * 6) * .16 * x / 2); }
    a.needsUpdate = true;
  }

  // Confetti
  for (const c of confetti) {
    if (c.life <= 0) continue;
    c.life -= dt; c.v.y -= 9 * dt; c.m.position.addScaledVector(c.v, dt);
    c.m.rotation.x += c.spin.x * dt; c.m.rotation.y += c.spin.y * dt; c.m.rotation.z += c.spin.z * dt;
    if (c.life <= 0) c.m.visible = false;
  }

  // Camera: in front of Pearl on the menu and end screen so we see her face, behind her while playing.
  S.cam = damp(S.cam, playing ? 1 : 0, playing ? 2.2 : 1.6, dt);
  // Menu and end cards cover the bottom in portrait and the right side in landscape,
  // so frame Pearl in the space that is left.
  const wide = camera.aspect > 1.2;
  const front = camPos.set(S.x - .8, 1.25, S.z - 3.4);
  const behind = tmpV.set(S.x * .55, 3.1, S.z + 5.4);
  const e = S.cam * S.cam * (3 - 2 * S.cam);
  camera.position.lerpVectors(front, behind, e);
  camera.position.x += Math.sin(e * Math.PI) * 2.5;
  camLook.set(lerp(S.x - (wide ? 1.3 : 0), S.x * .35, e), lerp(wide ? .75 : -.2, .7, e) + S.y * .3 * e, lerp(S.z, S.z - 7, e));
  camera.lookAt(camLook);

  if (bannerTimer > 0) { bannerTimer -= dt; if (bannerTimer <= 0) $('banner').classList.add('off'); }
}

/* ---------- loop, with a simple quality step-down for slower phones ---------- */
let last = performance.now(), slow = 0, checkT = 0;
function frame(now) {
  const raw = (now - last) / 1000, dt = Math.min(.05, raw); last = now;
  if (!S.paused) update(reduced && S.mode === 'menu' ? dt * .3 : dt);
  renderer.render(scene, camera);
  checkT += raw; if (raw > 1 / 40) slow++;
  if (checkT > 2) {
    if (slow > 50 && pixelRatio > 1) { pixelRatio = Math.max(1, pixelRatio - .5); renderer.setPixelRatio(pixelRatio); resize(); }
    checkT = 0; slow = 0;
  }
  requestAnimationFrame(frame);
}
resize(); setSound(); hud();
if (document.fonts && document.fonts.load) {
  document.fonts.load('400 84px "Bagel Fat One"').then(() => blockMats.forEach((m, i) => { m.map = blockTex('ABCDEF'[i], BLOCK_COLS[i]); m.needsUpdate = true; })).catch(() => {});
}
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('../sw.js', { scope: '../' }).catch(() => {});
// Test hook: lets automated checks fast-forward the game.
if (location.search.includes('debug')) window.__pw = { S, update, items };
requestAnimationFrame(frame);
