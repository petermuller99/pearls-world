// Danfo to the Moon: Pearl flies the family danfo, fitted with rocket boosters, from the
// Lagos sky up into space (toward -z). Touch and hold to steer and shoot pearl bubbles.
// Mummy follows in her keke rocket because it's bedtime; Daddy flies alongside on a jetpack.
import { THREE, M, G, mesh, tex, gradientTex, rand, lerp, damp, posePearl, setMermaid, textSprite, COL, outlined, store } from './common.js';
import { sfx } from './audio.js';
import { makeMumFigure, makePowerItem, animatePowerItem, POWERS } from './chase.js';
import { createDaddy } from './daddy.js';

const X_MIN = -3, X_MAX = 3, Y_MIN = 1, Y_MAX = 5.2, HOME_Y = 2.6;
// A new level every 22 seconds. Every two levels Pearl reaches a new place.
const LEVEL_EVERY = 22, MAX_LEVEL = 12, MAX_SPEED = 15;
const STAGES = [
  { name: 'Lagos Sky', banner: 'Blast off over Lagos!', sky: [[0, '#ff8f6b'], [.55, '#ffc58a'], [1, '#ffe3b0']], fog: 0xffd9a8 },
  { name: 'Orbit', banner: 'Orbit! Wave to Nigeria!', sky: [[0, '#04051a'], [.6, '#101848'], [1, '#22306e']], fog: 0x101848 },
  { name: 'The Moon', banner: 'The Moon! Hello, Moon!', sky: [[0, '#05041a'], [.7, '#1b1640'], [1, '#3a2f5a']], fog: 0x1b1640 },
  { name: 'Planet Jollof', banner: 'Planet Jollof! Smells nice o!', sky: [[0, '#16040e'], [.6, '#4a1230'], [1, '#8a2a2a']], fog: 0x4a1230 },
];
const stageOf = lv => lv >= 7 ? 3 : lv >= 5 ? 2 : lv >= 3 ? 1 : 0;
const MILESTONES = [{ m: 10, t: 'Blast off, Pearl!' }, { m: 25, t: 'Pearl the astronaut!' }, { m: 50, t: 'Star collector!' }, { m: 100, t: 'Queen of the galaxy!' }, { m: 200, t: 'Richest baby in space!' }];
const BOSSES = {
  ufo: { name: 'Big Bubble Goat UFO', says: 'Meeeh! This sky is mine!' },
  meteor: { name: 'Generator Meteor', says: 'NEPA took light, even in space!' },
};
const ALIEN_SAYS = ['Take me to your Oga!', 'Hello, earth baby!', 'Is that jollof I smell?'];

export function createSpace({ scene, P, confetti, S, hurt, boost, shoo, banner, hud, mumSay, say, camera, levelUp, powers }) {
  const world = new THREE.Group(); world.visible = false; scene.add(world);
  const skies = STAGES.map(s => gradientTex(s.sky));
  const fog = new THREE.Fog(STAGES[0].fog, 40, 190);

  /* ---------- lights ---------- */
  world.add(new THREE.HemisphereLight(0xfff0e0, 0x3a3060, 1.8));
  const key = new THREE.DirectionalLight(0xfff0dc, 1.5);
  const front = new THREE.DirectionalLight(0xffd8b0, .9);
  world.add(key, key.target, front, front.target);

  /* ---------- the danfo rocket ---------- */
  const R = {
    yellow: new THREE.MeshLambertMaterial({ color: COL.sun }),
    ink: new THREE.MeshLambertMaterial({ color: 0x24163d }),
    grey: new THREE.MeshLambertMaterial({ color: 0xc9c2d6 }),
    red: new THREE.MeshLambertMaterial({ color: 0xe8333a }),
    tyre: new THREE.MeshLambertMaterial({ color: 0x1d1626 }),
    glass: new THREE.MeshLambertMaterial({ color: 0x2c3e6b, emissive: 0x101830 }),
    flame: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.5, .4), transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }),
    core: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.8, 2) }),
    keke: new THREE.MeshLambertMaterial({ color: 0x3aa655 }),
  };
  const sideTex = tex(256, 128, (c, w, h) => {
    c.fillStyle = '#ffc93c'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#24163d'; c.fillRect(0, 84, w, 10); c.fillRect(0, 100, w, 5);
    c.fillStyle = '#3c3350'; for (let x = 18; x < w - 30; x += 46) c.fillRect(x, 16, 36, 40);
  });
  const backTex = tex(128, 128, (c, w, h) => {
    c.fillStyle = '#ffc93c'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#24163d'; c.fillRect(0, 84, w, 10);
    c.fillStyle = '#e8333a'; c.fillRect(8, 60, 18, 14); c.fillRect(w - 26, 60, 18, 14);
    // A Lagos number plate.
    c.fillStyle = '#fff8f0'; c.fillRect(30, 100, 68, 22); c.strokeStyle = '#24163d'; c.lineWidth = 2; c.strokeRect(30, 100, 68, 22);
    c.fillStyle = '#2f6fd6'; c.font = '900 13px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText('PEARL 01', 64, 116);
    c.fillStyle = '#24163d'; c.font = '900 9px Nunito, sans-serif'; c.fillText('LAGOS', 64, 98);
  });
  const topTex = tex(64, 128, (c, w, h) => { c.fillStyle = '#ffc93c'; c.fillRect(0, 0, w, h); c.fillStyle = '#24163d'; c.fillRect(14, 40, 36, 52); });
  const frontTex = tex(128, 128, (c, w, h) => { c.fillStyle = '#ffc93c'; c.fillRect(0, 0, w, h); c.fillStyle = '#2c3e6b'; c.fillRect(10, 10, w - 20, 58); c.fillStyle = '#fff8f0'; c.beginPath(); c.arc(22, 92, 10, 0, 7); c.arc(w - 22, 92, 10, 0, 7); c.fill(); });
  const mat = t => new THREE.MeshLambertMaterial({ map: t });
  const sideMat = mat(sideTex);
  const flagTex = tex(96, 48, (c, w, h) => { c.fillStyle = '#008751'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.fillRect(w / 3, 0, w / 3, h); });
  const flags = [];
  function makeFlag(parent, x, y, z) {
    const pole = mesh(G.cyl, R.grey, .025, .7, .025); pole.position.set(x, y + .35, z); parent.add(pole);
    const fg = new THREE.PlaneGeometry(.5, .28, 8, 1); fg.translate(.25, 0, 0);
    const f = new THREE.Mesh(fg, new THREE.MeshLambertMaterial({ map: flagTex, side: THREE.DoubleSide }));
    f.position.set(x, y + .58, z); f.rotation.y = Math.PI / 2; parent.add(f);
    flags.push({ m: f, base: Float32Array.from(fg.attributes.position.array) });
  }
  function makeFlame(parent, x, y, z, s = 1) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const outer = new THREE.Mesh(new THREE.ConeGeometry(.15 * s, .6 * s, 10), R.flame); outer.rotation.x = Math.PI / 2; outer.position.z = .3 * s; g.add(outer);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(.07 * s, .3 * s, 8), R.core); inner.rotation.x = Math.PI / 2; inner.position.z = .15 * s; g.add(inner);
    parent.add(g); return g;
  }
  const danfo = new THREE.Group(); world.add(danfo);
  const flames = [];
  {
    // Box faces: +x, -x, top, bottom, back (+z, toward the camera), front (-z).
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, .7, 1.8), [sideMat, sideMat, mat(topTex), R.ink, mat(backTex), mat(frontTex)]);
    body.position.y = .35; danfo.add(body);
    for (const sx of [-1, 1]) {
      const boost = mesh(G.cyl, R.grey, .17, .8, .17); boost.rotation.x = Math.PI / 2; boost.position.set(sx * .46, .18, .62); danfo.add(boost);
      const ring = mesh(G.cyl, R.red, .19, .08, .19); ring.rotation.x = Math.PI / 2; ring.position.set(sx * .46, .18, 1.02); danfo.add(ring);
      flames.push(makeFlame(danfo, sx * .46, .18, 1.05));
      const wing = mesh(G.box, R.red, .45, .05, .7); wing.position.set(sx * .7, .3, .25); wing.rotation.z = sx * -.15; danfo.add(wing);
      for (const z of [-.6, .55]) { const w = mesh(G.cyl, R.tyre, .14, .08, .14); w.rotation.z = Math.PI / 2; w.position.set(sx * .53, 0, z); danfo.add(w); }
    }
    makeFlag(danfo, -.38, .7, .78);
  }
  const shadowOff = new THREE.Vector3();

  /* ---------- Mummy's keke rocket ---------- */
  const mumF = makeMumFigure(); mumF.shadow.visible = false;
  const keke = new THREE.Group(); world.add(keke);
  {
    const body = mesh(G.box, R.keke, .9, .55, 1.3); body.position.y = .28; keke.add(body);
    const roof = mesh(G.box, R.yellow, .95, .08, 1.1); roof.position.y = 1.95; keke.add(roof);
    for (const [x, z] of [[-.42, -.5], [.42, -.5], [-.42, .5], [.42, .5]]) { const p = mesh(G.cyl, R.ink, .03, 1.4, .03); p.position.set(x, 1.25, z); keke.add(p); }
    const nose = mesh(G.sphere, R.keke, .45, .3, .35); nose.position.set(0, .35, -.7); keke.add(nose);
    const wheel = mesh(G.cyl, R.tyre, .16, .1, .16); wheel.rotation.z = Math.PI / 2; wheel.position.set(0, 0, -.75); keke.add(wheel);
    const boostK = mesh(G.cyl, R.grey, .16, .6, .16); boostK.rotation.x = Math.PI / 2; boostK.position.set(0, .2, .75); keke.add(boostK);
    flames.push(makeFlame(keke, 0, .2, 1.05, 1.1));
    mumF.root.position.set(0, .1, .1); keke.add(mumF.root);
  }
  const mum = { x: 0, y: HOME_Y, talkT: 4 };

  /* ---------- scenery: clouds, Lagos below, stars, planets ---------- */
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xfff8f0 });
  const clouds = [];
  for (let i = 0; i < 16; i++) {
    const g = new THREE.Group();
    for (let k = 0; k < 4; k++) { const b = mesh(G.lowSphere, cloudMat, rand(1.2, 2.2), rand(.8, 1.3), rand(1, 1.8)); b.position.set(k * 1.6 - 2.4, rand(-.3, .3), rand(-.5, .5)); g.add(b); }
    g.position.set((Math.random() < .5 ? -1 : 1) * rand(5, 20), rand(-6, 9), -rand(0, 200)); world.add(g); clouds.push(g);
  }
  // Lagos from above: the lagoon, land with neat rows of roofs and roads, and a long bridge.
  const groundTex = tex(512, 512, (c, w, h) => {
    c.fillStyle = '#3a9fa4'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e3cfa8'; c.fillRect(0, 0, w * .42, h); c.fillRect(w * .62, h * .1, w * .38, h * .9);
    const roofs = ['#c9775a', '#b9b2a8', '#e8e0d2', '#a85a44'];
    for (const [x0, x1] of [[8, w * .42 - 8], [w * .62 + 8, w - 8]]) for (let y = 8; y < h - 8; y += 14) for (let x = x0; x < x1; x += 12) if ((x * 7 + y * 3) % 5) { c.fillStyle = roofs[(x + y) % 4]; c.fillRect(x, y, 8, 9); }
    c.fillStyle = '#f4ead6'; for (let y = 50; y < h; y += 90) { c.fillRect(0, y, w * .42, 5); c.fillRect(w * .62, y + 40, w * .38, 5); }
    c.fillStyle = '#fff8f0'; c.fillRect(w * .42, h * .55, w * .2, 6);
  }, true);
  groundTex.repeat.set(3, 3);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshLambertMaterial({ map: groundTex }));
  ground.rotation.x = -Math.PI / 2; ground.userData.noShadow = true; world.add(ground);

  const STAR_N = 700, starPos = new Float32Array(STAR_N * 3);
  for (let i = 0; i < STAR_N; i++) { starPos[i * 3] = rand(-90, 90); starPos[i * 3 + 1] = rand(-50, 70); starPos[i * 3 + 2] = -rand(0, 300); }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xfff8f0, size: .6, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const stars = new THREE.Points(starGeo, starMat); stars.frustumCulled = false; world.add(stars);
  // Speed streaks rushing past.
  const streakMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35, depthWrite: false });
  const streaks = [];
  for (let i = 0; i < 30; i++) { const s = mesh(G.box, streakMat, .03, .03, 3); s.position.set(rand(-9, 9), rand(-3, 9), -rand(0, 80)); world.add(s); streaks.push(s); }

  function planet(r, draw, extra) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), new THREE.MeshLambertMaterial({ map: tex(512, 256, draw), fog: false }));
    g.add(m); if (extra) extra(g); g.visible = false; world.add(g); g.userData.spin = m; return g;
  }
  const earth = planet(70, (c, w, h) => {
    c.fillStyle = '#1f6fd0'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#3aa655'; for (let i = 0; i < 14; i++) { c.beginPath(); c.ellipse(rand(0, w), rand(30, h - 30), rand(20, 60), rand(15, 45), rand(0, 3), 0, 7); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 30; i++) { c.beginPath(); c.ellipse(rand(0, w), rand(0, h), rand(15, 50), rand(4, 10), 0, 0, 7); c.fill(); }
  });
  const moon = planet(45, (c, w, h) => {
    c.fillStyle = '#d8d2c8'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const r = rand(4, 22), x = rand(0, w), y = rand(0, h); c.fillStyle = '#bab2a6'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.fillStyle = '#e8e2d8'; c.beginPath(); c.arc(x - r * .2, y - r * .2, r * .6, 0, 7); c.fill(); }
  });
  const jollof = planet(40, (c, w, h) => {
    c.fillStyle = '#e8501f'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { c.fillStyle = ['#ff7a2a', '#c93a14', '#ffb070', '#7fbf3a'][i % 4]; c.fillRect(rand(0, w), rand(0, h), rand(3, 7), 2); }
  }, g => {
    const ringTex = tex(256, 32, (c, w, h) => { c.fillStyle = '#fff3dc'; c.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { c.fillStyle = i % 3 ? '#fffaf0' : '#e8d8b8'; c.fillRect(rand(0, w), rand(0, h), 4, 2); } }, true);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(64, 6, 2, 80), new THREE.MeshLambertMaterial({ map: ringTex, fog: false }));
    ring.rotation.x = Math.PI / 2 - .35; ring.scale.z = .25; g.add(ring);
  });
  const PLANETS = [[earth, 1, [-60, -85, -175]], [moon, 2, [55, -8, -210]], [jollof, 3, [-48, 12, -210]]];

  // NigComSat, Nigeria's own satellite, floating past in orbit.
  const sats = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    g.add(mesh(G.box, new THREE.MeshStandardMaterial({ color: 0xe0b040, metalness: .6, roughness: .4 }), .8, .8, .8));
    for (const sx of [-1, 1]) { const p = mesh(G.box, new THREE.MeshLambertMaterial({ color: 0x2f6fd6, emissive: 0x0a1a40 }), 1.8, .05, .7); p.position.x = sx * 1.4; g.add(p); }
    const dish = new THREE.Mesh(new THREE.SphereGeometry(.4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 3), new THREE.MeshLambertMaterial({ color: 0xfff8f0, side: THREE.DoubleSide })); dish.position.y = .55; g.add(dish);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(.6, .3), new THREE.MeshLambertMaterial({ map: flagTex, side: THREE.DoubleSide })); fl.position.set(0, 0, .41); g.add(fl);
    const label = textSprite('NigComSat', { size: 36 }); label.position.y = 1.2; g.add(label);
    g.position.set((i % 2 ? 1 : -1) * rand(6, 11), rand(0, 7), -rand(40, 200)); g.visible = false; world.add(g); sats.push(g);
  }

  /* ---------- pearls, power-ups, hearts ---------- */
  const items = [];
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, -.18); heartShape.bezierCurveTo(-.05, -.1, -.24, 0, -.2, .1); heartShape.bezierCurveTo(-.16, .22, -.02, .2, 0, .1);
  heartShape.bezierCurveTo(.02, .2, .16, .22, .2, .1); heartShape.bezierCurveTo(.24, 0, .05, -.1, 0, -.18);
  const heartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: .08, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 2 }).center();
  const heartMat = new THREE.MeshLambertMaterial({ color: COL.blush, emissive: 0x80203a, emissiveIntensity: .4 });
  const bubbleMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: .3, depthWrite: false });
  function addPearl(x, y, z) { const m = mesh(G.sphere, M.pearl, .17); m.position.set(x, y, z); world.add(m); items.push({ kind: 'pearl', m, x, y, z }); }
  function addHeart(x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); g.add(new THREE.Mesh(heartGeo, heartMat)); g.add(mesh(G.sphere, bubbleMat, .32)); world.add(g); items.push({ kind: 'heart', m: g, x, y, z }); }
  function addPower(kind, x, y, z) { const m = makePowerItem(kind); m.position.set(x, y, z); world.add(m); items.push({ kind, m, x, y, z }); return items[items.length - 1]; }

  /* ---------- the silly space attackers ---------- */
  const A = {
    goat: new THREE.MeshLambertMaterial({ color: 0xf3ecdc }), patch: new THREE.MeshLambertMaterial({ color: 0x8a5a3a }), horn: new THREE.MeshLambertMaterial({ color: 0xc9b48a }),
    helmet: new THREE.MeshLambertMaterial({ color: 0x9fe8ff, transparent: true, opacity: .28, depthWrite: false, emissive: 0x2a7aa0, emissiveIntensity: .3 }),
    crow: new THREE.MeshLambertMaterial({ color: 0x2a2433 }), beak: new THREE.MeshLambertMaterial({ color: 0xffb020 }), pack: new THREE.MeshLambertMaterial({ color: 0xe8333a }),
    alien: new THREE.MeshLambertMaterial({ color: 0x7fe08a, emissive: 0x1a5a20, emissiveIntensity: .4 }),
    rock: new THREE.MeshLambertMaterial({ color: 0x8a7464 }), rock2: new THREE.MeshLambertMaterial({ color: 0x6a5a50 }),
    slime: new THREE.MeshLambertMaterial({ color: 0xff8fc0, emissive: 0x7a2050, emissiveIntensity: .6 }),
    saucer: new THREE.MeshStandardMaterial({ color: 0xc9d2e0, metalness: .7, roughness: .3 }),
    lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2, .6) }), lamp2: new THREE.MeshBasicMaterial({ color: new THREE.Color(.6, 2.2, 2.4) }),
    gen: new THREE.MeshLambertMaterial({ color: 0xe8333a }), smoke: new THREE.MeshLambertMaterial({ color: 0x8a8494, transparent: true, opacity: .6, depthWrite: false }),
  };
  outlined(A.goat, A.patch, A.horn, A.crow, A.beak, A.pack, A.alien, A.gen);
  function face(g, z, s = 1, y = .05) {
    for (const sx of [-1, 1]) {
      const w = mesh(G.sphere, M.white, .07 * s); w.position.set(sx * .1 * s, y, z); g.add(w);
      const e = mesh(G.sphere, M.eye, .035 * s); e.position.set(sx * .1 * s, y, z + .05 * s); g.add(e);
    }
    const sm = new THREE.Mesh(new THREE.TorusGeometry(.06 * s, .013 * s, 6, 12, Math.PI), M.eye); sm.rotation.z = Math.PI; sm.position.set(0, y - .1 * s, z); g.add(sm);
  }
  function goatMesh(s = 1) {
    const g = new THREE.Group();
    g.add(mesh(G.sphere, A.goat, .3 * s, .26 * s, .34 * s));
    const head = new THREE.Group(); head.position.set(0, .18 * s, .26 * s); g.add(head);
    head.add(mesh(G.sphere, A.goat, .19 * s, .18 * s, .2 * s));
    const snout = mesh(G.sphere, A.patch, .1 * s, .08 * s, .08 * s); snout.position.set(0, -.07 * s, .16 * s); head.add(snout);
    for (const sx of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.ConeGeometry(.04 * s, .2 * s, 6), A.horn); h.position.set(sx * .1 * s, .19 * s, -.02 * s); h.rotation.set(-.4, 0, sx * -.3); head.add(h);
      const ear = mesh(G.sphere, A.goat, .1 * s, .035 * s, .05 * s); ear.position.set(sx * .2 * s, .04 * s, 0); ear.rotation.z = sx * -.4; head.add(ear);
    }
    face(head, .17 * s, s, .03 * s);
    const helmet = mesh(G.sphere, A.helmet, .62 * s); helmet.position.y = .08 * s; g.add(helmet);
    return g;
  }
  const enemies = [], shots = [], goo = [];
  function addEnemy(kind, x, y, z) {
    let g, hp = 1, r = .5;
    if (kind === 'sgoat') { g = goatMesh(); hp = 2; r = .6; }
    else if (kind === 'jcrow') {
      g = new THREE.Group(); g.add(mesh(G.sphere, A.crow, .2, .18, .3));
      const head = mesh(G.sphere, A.crow, .14); head.position.set(0, .1, .24); g.add(head);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(.05, .16, 6), A.beak); beak.rotation.x = Math.PI / 2; beak.position.set(0, .07, .4); g.add(beak);
      face(g, .36, .8, .14);
      g.userData.wings = [-1, 1].map(sx => { const p = new THREE.Group(); p.position.set(sx * .14, .06, 0); const w = mesh(G.sphere, A.crow, .34, .03, .17); w.position.x = sx * .3; p.add(w); g.add(p); return p; });
      const pack = mesh(G.box, A.pack, .22, .26, .14); pack.position.set(0, .05, -.24); g.add(pack);
      const fl = makeFlame(g, 0, -.05, -.24, .6); fl.rotation.x = Math.PI / 2; flames.push(fl);
      hp = 1; r = .5;
    } else if (kind === 'alien') {
      g = new THREE.Group();
      const dome = mesh(G.sphere, A.alien, .42, .36, .42); g.add(dome);
      for (const sx of [-1, 1]) {
        const st = mesh(G.cyl, A.alien, .03, .35, .03); st.position.set(sx * .15, .45, .05); st.rotation.z = sx * -.25; g.add(st);
        const eye = mesh(G.sphere, M.white, .1); eye.position.set(sx * .2, .62, .08); g.add(eye);
        const pupil = mesh(G.sphere, M.eye, .045); pupil.position.set(sx * .2, .62, .17); g.add(pupil);
      }
      const sm = new THREE.Mesh(new THREE.TorusGeometry(.1, .02, 6, 12, Math.PI), M.eye); sm.rotation.z = Math.PI; sm.position.set(0, .02, .4); g.add(sm);
      g.userData.tents = [0, 1, 2, 3].map(k => { const t = new THREE.Group(); const a = k / 4 * Math.PI * 2; t.position.set(Math.cos(a) * .22, -.25, Math.sin(a) * .22); const m = mesh(G.sphere, A.alien, .06, .2, .06); m.position.y = -.15; t.add(m); g.add(t); return t; });
      hp = 3; r = .6;
    } else {
      g = new THREE.Group();
      const geo = new THREE.IcosahedronGeometry(1, 1), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const k = rand(.8, 1.15); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
      geo.computeVertexNormals();
      const s = rand(.45, .75); g.add(mesh(geo, Math.random() < .5 ? A.rock : A.rock2, s));
      hp = 3; r = s + .1;
    }
    g.position.set(x, y, z); world.add(g);
    const e = { kind, m: g, x0: x, y0: y, hp, r, ph: rand(0, 6), fly: 0, hit: 0, vx: kind === 'jcrow' ? (x > 0 ? -1 : 1) * rand(2, 3.2) : 0, shootT: rand(.5, 1.5), said: false, spin: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)) };
    enemies.push(e); return e;
  }
  function addGoo(from, to, speed = 8) {
    const m = mesh(G.sphere, A.slime, .2); m.position.copy(from); world.add(m);
    goo.push({ m, v: to.clone().sub(from).normalize().multiplyScalar(speed), life: 4 });
    sfx.ink();
  }

  /* ---------- bosses ---------- */
  function makeBoss(type) {
    const g = new THREE.Group(), lamps = [];
    if (type === 'ufo') {
      const disc = mesh(G.sphere, A.saucer, 2.3, .45, 2.3); g.add(disc);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(2.2, .12, 8, 40), A.saucer); rim.rotation.x = Math.PI / 2; g.add(rim);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, l = mesh(G.lowSphere, i % 2 ? A.lamp : A.lamp2, .13); l.position.set(Math.cos(a) * 2.2, -.05, Math.sin(a) * 2.2); g.add(l); lamps.push(l); }
      const pilot = goatMesh(1.7); pilot.position.y = .55; g.add(pilot);
    } else {
      const geo = new THREE.IcosahedronGeometry(1.8, 1), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const k = rand(.85, 1.1); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
      geo.computeVertexNormals(); g.add(new THREE.Mesh(geo, A.rock));
      face(g, 1.65, 4, .1);
      const gen = mesh(G.box, A.gen, 1.3, .8, .9); gen.position.y = 1.9; g.add(gen);
      const panel = mesh(G.box, R.ink, .7, .4, .05); panel.position.set(0, 1.95, .46); g.add(panel);
      const pipe = mesh(G.cyl, R.grey, .1, .6, .1); pipe.position.set(.45, 2.5, -.2); g.add(pipe);
      g.userData.puffs = [0, 1, 2].map(k => { const s = mesh(G.lowSphere, A.smoke, .25); s.position.set(.45, 2.9 + k * .4, -.2); g.add(s); return s; });
    }
    world.add(g);
    return { type, m: g, lamps, hpMax: Math.round((38 + bossCount * 18) * (.7 + S.diff.attack * .3)), life: 0, t: 0, attackT: 2, hit: 0, leaving: 0, said: null, sayT: 0 };
  }
  let boss = null, bossCount = 0;
  function spawnBoss() {
    const type = bossCount % 2 ? 'meteor' : 'ufo';
    boss = makeBoss(type); boss.life = boss.hpMax; bossCount++;
    boss.m.position.set(st.x, st.y + 1, st.z - 45);
    sfx.roar(); banner(`Here comes the ${BOSSES[type].name}!`);
    boss.said = textSprite(BOSSES[type].says); boss.said.scale.multiplyScalar(1.6); boss.said.position.y = type === 'ufo' ? 2.2 : 3.6; boss.m.add(boss.said); boss.sayT = 3;
    hud();
  }
  function popBoss() {
    const b = boss; boss = null;
    confetti.burst(tmpV.copy(b.m.position), 90, 3); sfx.milestone(); sfx.zPop();
    S.pearls += 15; banner(`${BOSSES[b.type].name} popped! +15 pearls`);
    say('dad', b.type === 'ufo' ? 'UFO don japa! Na you be the champion!' : 'Meteor don quench! Up Pearl!'); sfx.cheer();
    S.gap = Math.min(10, S.gap + 1.5);
    world.remove(b.m); hud();
  }

  /* ---------- pearl bubble shots ---------- */
  const shotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.4, 2.8) });
  const shotGlow = new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 44; i++) {
    const g = new THREE.Group(); g.add(mesh(G.lowSphere, shotMat, .1)); g.add(mesh(G.lowSphere, shotGlow, .2));
    g.visible = false; world.add(g); shots.push({ g, life: 0, v: new THREE.Vector3() });
  }
  let side = 1;
  function shoot() {
    const s = shots.find(s => s.life <= 0); if (!s) return;
    side = -side;
    s.life = 1.1; s.g.visible = true;
    s.g.position.set(st.x + side * .3, st.y + .35, st.z - 1);
    s.v.set(0, 0, -(st.speed + 32));
    // Gentle aim help: lean the bubble toward the nearest attacker in front of her.
    let best = null, bd = 1e9;
    for (const e of enemies) {
      if (e.fly) continue;
      const d = st.z - e.m.position.z, lat = Math.hypot(e.m.position.x - st.x, e.m.position.y - st.y - .3);
      if (d > 2 && d < 30 && lat < 1.3 + d * .04 && lat + d * .1 < bd) { bd = lat + d * .1; best = e; }
    }
    if (best) { const T = (st.z - best.m.position.z) / -s.v.z; s.v.x = (best.m.position.x - s.g.position.x) / T; s.v.y = (best.m.position.y - s.g.position.y) / T; }
    if (Math.random() < .5) sfx.bubbleShot();
  }

  /* ---------- spawning ---------- */
  function spawn(z) {
    const lv = st.level, stage = stageOf(lv);
    const px = rand(X_MIN + .4, X_MAX - .4), py = rand(Y_MIN + .3, Y_MAX - .5), r = Math.random();
    if (r < .45) {
      const dx = rand(-.25, .25), dy = rand(-.15, .15);
      for (let k = 0; k < 4; k++) addPearl(THREE.MathUtils.clamp(px + dx * k, X_MIN, X_MAX), THREE.MathUtils.clamp(py + dy * k, Y_MIN, Y_MAX), z - k * 1.3);
    } else if (r < .6) {
      const cx = THREE.MathUtils.clamp(px, X_MIN + .9, X_MAX - .9), cy = THREE.MathUtils.clamp(py, Y_MIN + .9, Y_MAX - .9);
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; addPearl(cx + Math.cos(a) * .85, cy + Math.sin(a) * .85, z); }
    }
    // Hard is a little softer here than in the other games: there is a lot coming at you.
    // Keeps getting a little busier after the last level, so a great run still ends some time.
    const ramp = 1 + Math.max(0, st.time - LEVEL_EVERY * MAX_LEVEL) / 150;
    const busy = boss ? .45 : 1, at = Math.pow(S.diff.attack, .6) * busy * ramp;
    // A little line or zig-zag of space goats.
    if (Math.random() < Math.min(.7, .35 + lv * .04) * at) {
      const n = lv >= 6 && Math.random() < .5 ? 4 : lv >= 3 && Math.random() < .5 ? 3 : 1, x0 = rand(X_MIN + .5, X_MAX - .5), y0 = rand(Y_MIN + .5, Y_MAX - .5);
      for (let k = 0; k < n; k++) addEnemy('sgoat', THREE.MathUtils.clamp(x0 + (k - 1) * 1.3, X_MIN, X_MAX), y0, z - 10 - k * 2.5);
    }
    for (let k = lv >= 5 ? 2 : 1; k > 0; k--) if (Math.random() < Math.min(.5, .18 + lv * .04) * at) addEnemy('jcrow', (Math.random() < .5 ? -1 : 1) * 6, rand(Y_MIN + .5, Y_MAX - .3), z - rand(12, 18));
    if (lv >= 2 && Math.random() < Math.min(.4, (lv - 1) * .07) * at) addEnemy('alien', rand(X_MIN + .5, X_MAX - .5), rand(Y_MIN + .8, Y_MAX - .3), z - rand(14, 20));
    for (let k = lv >= 7 ? 2 : 1; k > 0; k--) if (stage >= 1 && Math.random() < Math.min(.6, .2 + lv * .04) * at) addEnemy('meteor', rand(X_MIN, X_MAX), rand(Y_MIN, Y_MAX), z - rand(8, 16));
    if (S.gap < 7 && Math.random() < .14) addHeart(rand(X_MIN + .3, X_MAX - .3), rand(Y_MIN + .3, Y_MAX - .3), z - rand(2, 6));
    st.rows++;
    const pw = st.rows === 3 ? 'fire' : Math.random() < .1 * S.up.luck ? POWERS[Math.floor(Math.random() * POWERS.length)] : null;
    if (pw) addPower(pw, rand(X_MIN + .4, X_MAX - .4), rand(Y_MIN + .4, Y_MAX - .5), z - rand(3, 6));
  }
  function removeItem(i) { world.remove(items[i].m); items.splice(i, 1); }
  function removeEnemy(i) { const e = enemies[i]; world.remove(e.m); if (e.bubble) world.remove(e.bubble); enemies.splice(i, 1); }
  function clearAll() {
    while (items.length) removeItem(items.length - 1);
    while (enemies.length) removeEnemy(enemies.length - 1);
    for (const g of goo) world.remove(g.m); goo.length = 0;
    for (const s of shots) { s.life = 0; s.g.visible = false; }
    if (boss) { world.remove(boss.m); boss = null; }
  }
  const SHOO_KIND = { sgoat: 1, jcrow: 1, alien: 1 };
  function knockOut(e) {
    if (e.fly) return;
    e.fly = 1; confetti.burst(tmpV.copy(e.m.position), 14, 2); sfx.zPop();
    if (SHOO_KIND[e.kind]) shoo(e.kind, { cap: 1, gap: .12, quiet: true });
    else { S.pearls++; hud(); }
  }

  /* ---------- state and input ---------- */
  const st = { rows: 0, level: 1, stage: 0, x: 0, y: HOME_Y, z: 0, vx: 0, vy: 0, speed: 0, ph: 0, ms: 0, nextSpawn: 0, wave: 0, turn: 0, waveT: 0, time: 0, tx: null, ty: null, firing: false, fireT: 0, alt: 0, nextBoss: 3 };
  const keys = {};
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
  const dad = createDaddy(world, {
    fly: true, say: t => say('dad', t), kinds: POWERS,
    give(kind, from) { const it = addPower(kind, st.x, st.y, st.z - 8 - st.speed * .6); it.toss = { t: 0, from }; it.m.position.copy(from); },
  });
  function aim(e) {
    const r = e.target.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    plane.constant = -st.z;
    // Steer to a spot a little above the finger, so the danfo stays visible.
    if (ray.ray.intersectPlane(plane, hit)) { st.tx = THREE.MathUtils.clamp(hit.x, X_MIN, X_MAX); st.ty = THREE.MathUtils.clamp(hit.y + .6, Y_MIN, Y_MAX); }
  }
  function setStage(i, announce) {
    st.stage = i;
    scene.background = skies[i]; fog.color.setHex(STAGES[i].fog);
    fog.near = i ? 60 : 40; fog.far = i ? 320 : 190;
    if (announce) { banner(STAGES[i].banner); sfx.levelUp(); }
  }

  return {
    id: 'space',
    items: enemies,
    pickups: items,
    startBanner: 'Blast off, Pearl!',
    hint: 'Touch and hold to fly and shoot.',
    world, st, shadowLight: key,
    get bossInfo() { return boss && !boss.leaving ? { name: BOSSES[boss.type].name, frac: Math.max(0, boss.life / boss.hpMax) } : null; },
    enter() {
      world.visible = true; scene.fog = fog; setStage(st.stage);
      setMermaid(P, false); P.shadow.visible = false; P.root.rotation.set(0, 0, 0);
    },
    exit() { world.visible = false; clearAll(); P.shadow.visible = true; P.root.rotation.set(0, 0, 0); },
    start() {
      clearAll();
      Object.assign(st, { x: 0, y: HOME_Y, vx: 0, vy: 0, speed: 6, ms: 0, nextSpawn: st.z - 18, wave: 0, turn: 0, waveT: 0, time: 0, tx: null, ty: null, level: 1, rows: 0, firing: false, fireT: 0, alt: 0, nextBoss: 3 });
      bossCount = 0; setStage(0);
      mum.x = st.x; mum.y = st.y; mum.talkT = rand(3, 5);
      dad.reset();
    },
    scoreText() { return `${S.pearls} pearls · Level ${st.level}`; },
    finish(bank) {
      const best = store.get('pw_space_best', 0), rec = st.level > best;
      if (rec) store.set('pw_space_best', st.level);
      if (S.caught) return {
        eyebrow: 'Mummy caught you!',
        title: 'Bedtime, Pearl!',
        text: `Mummy flew Pearl home from ${STAGES[st.stage].name} with ${S.pearls} pearls${rec && best ? ', her furthest trip yet' : ''}. Piggy bank: ${bank} pearls.`,
      };
      return { eyebrow: 'Back to Earth', title: 'What a trip, Pearl!', text: `Pearl reached ${STAGES[st.stage].name} with ${S.pearls} pearls. Piggy bank: ${bank} pearls.` };
    },
    update(dt) {
      const playing = S.mode === 'play';
      if (playing) {
        st.time += dt;
        const lv = Math.min(MAX_LEVEL, 1 + Math.floor(st.time / (LEVEL_EVERY * S.diff.level)));
        if (lv > st.level) {
          st.level = lv;
          const sg = stageOf(lv);
          if (sg !== st.stage) setStage(sg, true); else levelUp(lv);
          if (lv >= st.nextBoss && !boss) { st.nextBoss = lv + 2; spawnBoss(); }
          hud();
        }
      }
      st.speed = playing ? damp(st.speed, Math.min(MAX_SPEED * S.diff.max, (6.5 + (st.level - 1) * .7) * S.diff.speed) * (S.stumble > 0 ? .4 : 1), S.stumble > 0 ? 6 : 1.5, dt) : damp(st.speed, 0, 2, dt);
      st.z -= st.speed * dt;

      // Steering toward the finger (or arrow keys); shooting while the finger is down.
      const ox = st.x, oy = st.y;
      if (playing) {
        if (st.tx != null) { st.x = damp(st.x, st.tx, 5, dt); st.y = damp(st.y, st.ty, 5, dt); }
        const kx = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0), ky = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);
        st.x += kx * 4 * dt; st.y += ky * 4 * dt;
        st.fireT -= dt;
        if ((st.firing || keys[' ']) && st.fireT <= 0 && st.turn < .5) { st.fireT = .12; shoot(); }
      } else { st.x = damp(st.x, 0, 2, dt); st.y = damp(st.y, HOME_Y, 2, dt); }
      st.x = THREE.MathUtils.clamp(st.x, X_MIN, X_MAX); st.y = THREE.MathUtils.clamp(st.y, Y_MIN, Y_MAX);
      st.vx = damp(st.vx, (st.x - ox) / Math.max(dt, .001), 8, dt); st.vy = damp(st.vy, (st.y - oy) / Math.max(dt, .001), 8, dt);

      // The danfo leans into turns and bobs; Pearl rides in the roof hatch.
      const bob = Math.sin(S.t * 3) * .06;
      danfo.position.set(st.x, st.y - .55 + bob, st.z);
      danfo.rotation.set(playing ? THREE.MathUtils.clamp(st.vy * .08, -.3, .3) : 0, 0, playing ? THREE.MathUtils.clamp(-st.vx * .09, -.4, .4) : Math.sin(S.t * 1.2) * .04);
      if (st.waveT > 0) st.waveT -= dt;
      st.turn = damp(st.turn, st.waveT > 0 ? 1 : 0, 6, dt);
      st.wave = damp(st.wave, st.waveT > 0 || !playing ? 1 : 0, 6, dt);
      st.ph += dt * 3;
      posePearl(P, { ph: st.ph, stage: 1, idle: true, turn: st.turn, wave: st.wave, t: S.t, reach: playing ? .65 * (1 - st.wave) : 0, oops: S.stumble > 0 });
      P.root.position.copy(danfo.position).add(shadowOff.set(0, .22, .05).applyEuler(danfo.rotation));
      P.root.rotation.copy(danfo.rotation);
      for (const f of flames) { const k = .8 + Math.random() * .45 + (playing ? st.speed * .02 : 0); f.scale.set(1, 1, k); }
      for (const f of flags) {
        const p = f.m.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(f.base[i * 3] * 9 - S.t * 10) * .05 * f.base[i * 3] * 2);
        p.needsUpdate = true;
      }

      // Mummy's keke rocket: close behind when she's catching up, cuddling Pearl if she catches her.
      {
        let tx, ty, tz, reach = 0, wave = 0;
        if (S.mode === 'menu' || (S.mode === 'over' && !S.caught)) { tx = st.x + 1.5; ty = st.y - .3; tz = st.z + 1; wave = S.mode === 'over' ? 1 : 0; }
        else if (S.mode === 'over') { tx = st.x + .9; ty = st.y - .2; tz = st.z + .3; reach = 1; }
        else {
          const near = THREE.MathUtils.clamp((1.1 - S.gap) / 1.1, 0, 1);
          tx = st.x + (st.x > .5 ? 1.2 : -1.2) * (1 - near); ty = st.y - .7 * (1 - near); tz = st.z + 2 + S.gap * .7; reach = THREE.MathUtils.clamp((3 - S.gap) / 2, 0, 1);
        }
        mum.x = damp(mum.x, tx, 2.5, dt); mum.y = damp(mum.y, ty, 2.5, dt);
        keke.position.set(mum.x, mum.y - .9 + Math.sin(S.t * 2.6 + 1) * .08, playing ? tz : damp(keke.position.z, tz, 4, dt));
        keke.rotation.z = Math.sin(S.t * 1.7) * .05;
        posePearl(mumF, { ph: S.t * 2, stage: 1, idle: true, t: S.t, reach, wave });
        if (playing) {
          mum.talkT -= dt;
          if (mum.talkT <= 0) {
            const pool = S.gap < 3 ? ['Almost got you!', 'Bedtime, my star!', 'I see you o!'] : ['Pearl, it is bedtime!', 'Come back to Earth!', 'Wait for Mummy!', 'Not too far o!'];
            mumSay(pool[Math.floor(Math.random() * pool.length)]); mum.talkT = rand(5, 9); sfx.mum();
          }
        }
      }
      dad.update(dt, { px: st.x, py: st.y - .5, pz: st.z, speed: st.speed, gameMode: S.mode, caught: S.caught, time: S.t, diff: S.diff });

      if (playing) {
        const next = MILESTONES[st.ms];
        if (next && S.pearls >= next.m) {
          st.ms++; banner(next.t); sfx.milestone(); confetti.burst(tmpV.set(st.x, st.y + .8, st.z - 1), 60, 2);
          st.waveT = 1.8; dad.cheer(st.x, st.y - .4, st.z, 14 + st.speed * 1.5);
          for (const e of enemies) if (!e.fly && e.m.position.z < st.z && e.m.position.z > st.z - st.speed * 3 - 8) e.fly = 1;
        }
        // Rows come at a steady pace whatever the speed; higher levels fill each row more.
        while (st.nextSpawn > st.z - 55) { spawn(st.nextSpawn); st.nextSpawn -= Math.max(7, st.speed * rand(1.1, 1.5) * (1 - st.level * .025)); }
      }

      // Bubble shots
      for (const s of shots) {
        if (s.life <= 0) continue;
        s.life -= dt;
        let done = s.life <= 0;
        // Small steps so a fast bubble can't skip past an attacker between frames.
        const n = Math.ceil(s.v.length() * dt / .35);
        for (let k = 0; k < n && !done; k++) {
          s.g.position.addScaledVector(s.v, dt / n);
          for (const e of enemies) {
            if (done || e.fly || s.g.position.distanceTo(e.m.position) > e.r + .2) continue;
            done = true; e.hit = .12; sfx.zHit();
            if (--e.hp <= 0) knockOut(e);
          }
        }
        for (let i = goo.length - 1; i >= 0 && !done; i--) if (s.g.position.distanceTo(goo[i].m.position) < .35) { done = true; confetti.burst(tmpV.copy(goo[i].m.position), 6, 2); world.remove(goo[i].m); goo.splice(i, 1); }
        if (!done && boss && !boss.leaving && s.g.position.distanceTo(boss.m.position) < 2.2) {
          done = true; boss.life -= 1; boss.hit = .1; sfx.zHit(); hud();
          if (boss.life <= 0) popBoss();
        }
        if (done) { s.life = 0; s.g.visible = false; }
      }

      // Pickups
      const cx = st.x, cy = st.y + .25;
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (it.z > st.z + 6 && !it.toss) { removeItem(i); continue; }
        if (it.kind === 'pearl') {
          it.m.rotation.y += dt * 2; it.m.position.y = it.y + Math.sin(S.t * 2 + it.z) * .05;
          const pulled = S.magnetT > 0 && it.z < st.z + .5 && it.z > st.z - S.up.magnetReach;
          if (playing && (pulled || (Math.abs(it.z - st.z) < .7 && Math.hypot(it.x - cx, it.m.position.y - cy) < .75))) { removeItem(i); S.pearls++; sfx.pearl(); confetti.burst(tmpV.set(it.x, it.y, it.z), 4, 2); hud(); }
        } else if (it.kind === 'heart') {
          it.m.rotation.y += dt * 2; it.m.position.y = it.y + Math.sin(S.t * 2 + it.z) * .1;
          if (playing && Math.abs(it.z - st.z) < .7 && Math.hypot(it.x - cx, it.m.position.y - cy) < .75) { removeItem(i); sfx.heart(); boost(2.5, 'A star heart! Fly, Pearl!'); confetti.burst(tmpV.set(it.x, it.y, it.z), 16, 2); }
        } else {
          animatePowerItem(it.m, S.t, dt);
          if (it.toss) {
            const k = Math.min(1, (it.toss.t += dt / .7)), f = it.toss.from;
            it.m.position.set(lerp(f.x, it.x, k), lerp(f.y, it.y, k) + Math.sin(k * Math.PI) * 1.2, lerp(f.z, it.z, k));
            if (k >= 1) delete it.toss;
            continue;
          }
          it.m.position.y = it.y + Math.sin(S.t * 2 + it.z) * .1;
          if (playing && Math.abs(it.z - st.z) < .8 && Math.hypot(it.x - cx, it.m.position.y - cy) < .85) { removeItem(i); powers.grant(it.kind); }
        }
      }

      // Attackers
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i], p = e.m.position;
        if (e.fly > 0) {
          e.fly -= dt * 1.4; p.y += dt * 4; e.m.rotation.z += dt * 8; e.m.scale.setScalar(Math.max(.01, e.fly));
          if (e.fly <= 0) removeEnemy(i);
          continue;
        }
        if (p.z > st.z + 6) { removeEnemy(i); continue; }
        e.ph += dt; e.hit -= dt;
        e.m.scale.setScalar(e.hit > 0 ? 1.15 : 1);
        const d = st.z - p.z, rush = 1 + st.level * .08;
        if (e.kind === 'sgoat') { p.x = e.x0 + Math.sin(e.ph * 1.6) * 1.1; p.y = e.y0 + Math.sin(e.ph * 2.3) * .4; p.z += 1.5 * rush * dt; e.m.rotation.y = Math.sin(e.ph * 1.6) * .4; }
        else if (e.kind === 'jcrow') {
          p.x += e.vx * rush * dt; p.y = e.y0 + Math.sin(e.ph * 3) * .5; p.z += 2.5 * rush * dt;
          if (Math.abs(p.x) > 6.5) e.vx = -e.vx;
          e.m.rotation.y = e.vx > 0 ? -.6 : .6;
          e.m.userData.wings.forEach((w, k) => { w.rotation.z = (k ? -1 : 1) * Math.sin(S.t * 18) * .6; });
        } else if (e.kind === 'alien') {
          p.y = e.y0 + Math.sin(e.ph * 1.5) * .35;
          e.m.userData.tents.forEach((t, k) => { t.rotation.x = Math.sin(S.t * 4 + k) * .4; });
          if (playing && d > 5 && d < 24) {
            if (!e.said && d < 20 && Math.random() < .5) { e.said = true; e.bubble = textSprite(ALIEN_SAYS[Math.floor(Math.random() * ALIEN_SAYS.length)]); e.bubble.scale.multiplyScalar(1.3); world.add(e.bubble); e.sayT = 2.2; } else e.said = true;
            e.shootT -= dt;
            if (e.shootT <= 0 && st.level >= 2) { e.shootT = Math.max(1.2, 2.6 - st.level * .1); addGoo(tmpV.copy(p), tmpV2.set(st.x, st.y + .25, st.z - st.speed * .7)); }
          }
          if (e.bubble) { e.bubble.position.set(p.x, p.y + 1.1, p.z); e.sayT -= dt; if (e.sayT <= 0) { world.remove(e.bubble); e.bubble = null; } }
        } else { e.m.rotation.x += e.spin.x * dt; e.m.rotation.y += e.spin.y * dt; p.z += 3 * rush * dt; }
        if (playing && S.inv <= 0 && Math.abs(p.z - st.z) < .8 && Math.hypot(p.x - cx, p.y - cy) < e.r + .45) {
          e.fly = 1;
          const msg = { sgoat: 'Bonk! Cheeky space goat!', jcrow: 'Caw! Jetpack crow!', alien: 'Squish! Jelly alien!', meteor: 'Bump! Space rock!' }[e.kind];
          hurt(S.gap < 4 ? 'Mummy is right behind you!' : msg, e.kind === 'sgoat' ? sfx.goat : e.kind === 'jcrow' ? sfx.crow : sfx.hit, 2);
        }
      }
      for (let i = goo.length - 1; i >= 0; i--) {
        const g = goo[i];
        g.m.position.addScaledVector(g.v, dt); g.life -= dt; g.m.scale.setScalar(.2 * (1 + Math.sin(S.t * 20) * .1));
        if (playing && S.inv <= 0 && g.m.position.distanceTo(tmpV.set(cx, cy, st.z)) < .6) { world.remove(g.m); goo.splice(i, 1); hurt('Splat! Sticky alien slime!', sfx.ink, 1.5); continue; }
        if (g.life <= 0 || g.m.position.z > st.z + 6) { world.remove(g.m); goo.splice(i, 1); }
      }

      // The boss stays ahead of Pearl, swaying, and attacks; after 30 s it gives up and flies off.
      if (boss) {
        const b = boss; b.t += dt; b.hit -= dt;
        const p = b.m.position, ahead = 15;
        if (b.leaving) { p.y += dt * 8; p.z -= dt * 20; b.leaving -= dt; if (b.leaving <= 0) { world.remove(b.m); boss = null; hud(); } }
        else {
          p.x = damp(p.x, Math.sin(b.t * .8) * 2.4, 2, dt); p.y = damp(p.y, HOME_Y + .8 + Math.sin(b.t * 1.3) * 1, 2, dt);
          p.z = damp(p.z, st.z - ahead, 1.5, dt);
          b.m.scale.setScalar(b.hit > 0 ? 1.06 : 1);
          if (b.type === 'ufo') { b.m.rotation.y += dt * 1.5; b.lamps.forEach((l, k) => { l.visible = Math.floor(S.t * 6 + k) % 2 === 0; }); }
          else { b.m.rotation.z = Math.sin(b.t * 1.2) * .15; b.m.userData.puffs.forEach((s, k) => { const u = (S.t * .8 + k / 3) % 1; s.position.y = 2.8 + u * 1.4; s.scale.setScalar(.2 + u * .5); s.material.opacity = .6 * (1 - u); }); }
          if (playing) {
            b.attackT -= dt;
            if (b.attackT <= 0) {
              b.attackT = Math.max(1.1, 2 - st.level * .06);
              if (b.type === 'ufo') { addGoo(tmpV.copy(p).setY(p.y - .4), tmpV2.set(st.x, st.y + .25, st.z - st.speed * .5), 9); sfx.goat(); }
              else addEnemy('meteor', p.x + rand(-1, 1), p.y + rand(-.5, .5), p.z + 1.5);
            }
            if (b.t > 30) { b.leaving = 2; banner(`The ${BOSSES[b.type].name} flew away!`); }
          }
          if (b.said) { b.sayT -= dt; if (b.sayT <= 0) { b.m.remove(b.said); b.said = null; } }
        }
      }

      // Scenery follows Pearl through the sky and space.
      const sg = st.stage;
      for (const c of clouds) { c.visible = sg === 0; if (c.position.z > st.z + 15) { c.position.z -= 210; c.position.x = (Math.random() < .5 ? -1 : 1) * rand(5, 20); c.position.y = rand(-6, 9); } }
      ground.visible = sg === 0; ground.position.set(st.x * .3, -32, st.z - 120); groundTex.offset.y = st.z / 500 * 3;
      starMat.opacity = damp(starMat.opacity, sg === 0 ? .15 : 1, 1.5, dt);
      for (let i = 0; i < STAR_N; i++) if (starPos[i * 3 + 2] > st.z + 20) starPos[i * 3 + 2] -= 300;
      starGeo.attributes.position.needsUpdate = true;
      for (const s of streaks) { if (s.position.z > st.z + 8) { s.position.z -= 80; s.position.x = st.x + rand(-9, 9); s.position.y = st.y + rand(-5, 6); } }
      streakMat.opacity = playing ? Math.min(.45, st.speed * .03) : 0;
      for (const [pl, s, [x, y, z]] of PLANETS) { pl.visible = sg === s; pl.position.set(x, y, st.z + z); pl.userData.spin.rotation.y += dt * .03; }
      for (const s of sats) { s.visible = sg === 1; s.rotation.y += dt * .4; if (s.position.z > st.z + 15) { s.position.z = st.z - rand(150, 220); s.position.x = (Math.random() < .5 ? -1 : 1) * rand(6, 11); } }
      key.position.set(st.x + 3, st.y + 10, st.z + 4); key.target.position.set(st.x, st.y, st.z - 3);
      front.position.set(st.x + 1, st.y + 2, st.z - 8); front.target.position.set(st.x, st.y, st.z);
    },
    fire() { return powers.fire(tmpV.set(st.x, st.y + .4, st.z - 1), new THREE.Vector3(0, 0, -(st.speed + 20))); },
    // A fireball knocks out the first attacker it reaches, or hurts the boss a lot.
    fireHit(pos) {
      if (st.z - pos.z > 45) return true;
      for (const e of enemies) if (!e.fly && e.m.position.distanceTo(pos) < e.r + .45) { knockOut(e); return true; }
      if (boss && !boss.leaving && boss.m.position.distanceTo(pos) < 2.4) { boss.life -= 6; boss.hit = .15; hud(); if (boss.life <= 0) popBoss(); return true; }
      return false;
    },
    bubbleY: .45,
    placeCamera(cam, e, wide, frontV, behindV, look) {
      frontV.set(st.x - (wide ? .8 : .3), st.y + .5, st.z - (wide ? 6.4 : 5.6));
      behindV.set(st.x * .6, st.y * .55 + 2.6, st.z + 6.2);
      cam.position.lerpVectors(frontV, behindV, e);
      cam.position.x += Math.sin(e * Math.PI) * 2.5;
      look.set(lerp(st.x - (wide ? 2.4 : 0), st.x * .45, e), lerp(st.y + (wide ? .1 : -1), st.y * .6 + .5, e), lerp(st.z, st.z - 8, e));
      cam.lookAt(look);
    },
    pointerDown(e) { aim(e); st.firing = true; },
    pointerMove(e) { if (e.buttons || e.pointerType === 'touch') aim(e); },
    pointerUp() { st.tx = null; st.ty = null; st.firing = false; },
    keyDown(e) {
      if (e.key.startsWith('Arrow') || e.key === ' ') { e.preventDefault(); keys[e.key] = true; }
      if ((e.key === 'f' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); this.fire(); }
    },
    keyUp(e) { keys[e.key] = false; },
  };
}
