// First Steps: Pearl crawls, toddles and runs toward -z along the Lekki-Ikoyi Link Bridge.
import { THREE, M, G, mesh, tex, gradientTex, rand, lerp, damp, posePearl, setMermaid, store, COL } from './common.js';
import { sfx } from './audio.js';
import { makeMum, makePowerItem, animatePowerItem, POWERS } from './chase.js';

const LANES = [-1.5, 0, 1.5];
const MILESTONES = [
  { m: 60, t: 'First smile!' }, { m: 180, t: 'First word: "Dada"!' }, { m: 340, t: 'First tooth!' },
  { m: 520, t: 'First steps!', stage: 1 }, { m: 800, t: 'Walking like a pro!' }, { m: 1100, t: 'Off she runs!', stage: 2 },
  { m: 1500, t: 'Happy 1st birthday, Pearl!' }, { m: 2100, t: 'Big girl now!' }, { m: 3000, t: 'Unstoppable Pearl!' }];
const STAGE_SPEED = [5, 7, 9.5];
// Difficulty: a new level every 200 m. Speed keeps creeping up with distance on top of
// the crawl/toddle/run base, toys come closer together, and new tricks unlock.
const LEVEL_EVERY = 200, MAX_LEVEL = 12, MAX_SPEED = 17;
const DECK_W = 13, SEG = 20, PYLON_GAP = 110;

export function createRunner({ scene, P, confetti, S, hurt, boost, banner, hud, mumSay, levelUp, powers }) {
  const world = new THREE.Group(); world.visible = false; scene.add(world);
  const sky = gradientTex([[0, '#ff8f6b'], [.55, '#ffc58a'], [1, '#ffe3b0']]);
  const fog = new THREE.Fog(0xffd9a8, 40, 170);

  /* ---------- textures ---------- */
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
  const flagTex = tex(96, 48, (c, w, h) => {
    c.fillStyle = '#008751'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff'; c.fillRect(w / 3, 0, w / 3, h);
  });
  const BLOCK_COLS = ['#ff6b4a', '#0f8a8f', '#ff5c8a', '#ffc93c', '#6b4fc9', '#3aa655'];
  const blockTex = (letter, bg) => tex(128, 128, (c, w, h) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#24163d'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10);
    c.fillStyle = '#fff8f0'; c.font = '400 84px "Bagel Fat One", "Arial Rounded MT Bold", sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(letter, w / 2, h / 2 + 6);
  });
  const blockMats = 'ABCDEF'.split('').map((l, i) => new THREE.MeshLambertMaterial({ map: blockTex(l, BLOCK_COLS[i]) }));
  if (document.fonts && document.fonts.load) {
    document.fonts.load('400 84px "Bagel Fat One"').then(() => blockMats.forEach((m, i) => { m.map = blockTex('ABCDEF'[i], BLOCK_COLS[i]); m.needsUpdate = true; })).catch(() => {});
  }
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
  const R = {
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
    palmLeaf: new THREE.MeshLambertMaterial({ color: 0x2f9e6a, side: THREE.DoubleSide }),
    trunk: new THREE.MeshLambertMaterial({ color: 0x7a4a2c }),
    sand: new THREE.MeshLambertMaterial({ color: 0xf2c79a }),
    goat: new THREE.MeshLambertMaterial({ color: 0xf3ecdc }),
    goatPatch: new THREE.MeshLambertMaterial({ color: 0x8a5a3a }),
    horn: new THREE.MeshLambertMaterial({ color: 0xc9b48a }),
    crow: new THREE.MeshLambertMaterial({ color: 0x2a2433 }),
    beak: new THREE.MeshLambertMaterial({ color: 0xffb020 }),
  };

  /* ---------- lights ---------- */
  world.add(new THREE.HemisphereLight(0xffe2c4, 0x2c6f7a, 1.6));
  const key = new THREE.DirectionalLight(0xfff0dc, 1.7);
  // Low sunset light from ahead, so Pearl's face is lit whenever she turns to the camera.
  const sunLight = new THREE.DirectionalLight(0xffc89a, 1.5);
  world.add(key, key.target, sunLight, sunLight.target);

  /* ---------- the bridge ---------- */
  const deckGeo = new THREE.BoxGeometry(DECK_W, .5, SEG);
  const deckMats = [R.barrier, R.barrier, new THREE.MeshLambertMaterial({ map: deckTex }), R.barrier, R.barrier, R.barrier];
  const segments = [];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    const d = new THREE.Mesh(deckGeo, deckMats); d.position.y = -.25; g.add(d);
    for (const s of [-1, 1]) {
      const bar = mesh(G.box, R.barrier, .25, .35, SEG); bar.position.set(s * 2.75, .17, 0); g.add(bar);
      const rail = mesh(G.box, R.rail, .12, .1, SEG); rail.position.set(s * 6.4, .9, 0); g.add(rail);
      for (let z = -SEG / 2; z < SEG / 2; z += 2.5) { const post = mesh(G.box, R.rail, .1, .9, .1); post.position.set(s * 6.4, .45, z); g.add(post); }
    }
    g.position.z = -i * SEG;
    world.add(g); segments.push(g);
  }

  // Cable-stayed pylon arching over the bridge, with the Nigerian flag on top.
  const flags = [];
  function makePylon() {
    const g = new THREE.Group();
    for (const s of [-1, 1]) { const leg = mesh(G.box, R.pylon, .7, 15, .9); leg.position.set(s * 6.9, 7.5, 0); g.add(leg); }
    const beam = mesh(G.box, R.pylon, 14.5, .9, 1); beam.position.y = 15; g.add(beam);
    const pole = mesh(G.cyl, R.rail, .05, 3, .05); pole.position.y = 16.9; g.add(pole);
    const fGeo = new THREE.PlaneGeometry(2, 1, 12, 1); fGeo.translate(1, 0, 0);
    const flag = new THREE.Mesh(fGeo, new THREE.MeshLambertMaterial({ map: flagTex, side: THREE.DoubleSide }));
    flag.position.set(0, 17.9, 0); flag.rotation.y = -Math.PI / 2 - .5; g.add(flag);
    flags.push({ geo: fGeo, base: Float32Array.from(fGeo.attributes.position.array) });
    const pts = [];
    for (const s of [-1, 1]) for (const dz of [-22, -15, -9, -4, 4, 9, 15, 22]) pts.push(s * 6.9, 14, 0, s * 6.4, 1, dz);
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: 0xfff8f0 })));
    world.add(g); return g;
  }
  const pylons = [0, 1].map(i => { const p = makePylon(); p.position.z = -60 - i * PYLON_GAP; return p; });

  const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: 0x1a9a9a }));
  water.rotation.x = -Math.PI / 2; water.position.y = -2.2; world.add(water);
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(26, 40), new THREE.MeshBasicMaterial({ color: 0xfff1c9, fog: false }));
  world.add(sunDisc);

  const BCOLS = [0xf0a48a, 0xe58f7e, 0xf6c3a0, 0xd98a8a, 0xf2b5a0, 0xc9a0b8];
  const buildings = [];
  for (let i = 0; i < 44; i++) {
    const s = i % 2 ? 1 : -1, h = rand(8, 34), w = rand(5, 10);
    const b = new THREE.Mesh(G.box, new THREE.MeshLambertMaterial({ color: BCOLS[i % BCOLS.length], map: windowTex }));
    b.scale.set(w, h, w); b.userData.s = s;
    b.position.set(s * rand(38, 75), h / 2 - 2.2, -i * 9 + rand(-3, 3));
    world.add(b); buildings.push(b);
  }
  const palms = [];
  function makePalm() {
    const g = new THREE.Group();
    const sand = mesh(G.lowSphere, R.sand, 3, .6, 2.2); sand.position.y = -2.2; g.add(sand);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.18, .28, 6, 8), R.trunk); trunk.position.y = 1; trunk.rotation.z = .12; g.add(trunk);
    const leafGeo = new THREE.PlaneGeometry(3, .7); leafGeo.translate(1.5, 0, 0);
    for (let k = 0; k < 7; k++) { const l = new THREE.Mesh(leafGeo, R.palmLeaf); l.position.set(.35, 4, 0); l.rotation.set(0, k / 7 * Math.PI * 2, -.45); g.add(l); }
    world.add(g); return g;
  }
  for (let i = 0; i < 6; i++) { const p = makePalm(); const s = i % 2 ? 1 : -1; p.userData.s = s; p.position.set(s * rand(13, 22), 0, -i * 30 - 10); palms.push(p); }

  function makeDanfo() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(G.box, [R.danfo, R.danfo, R.danfoTop, R.tyre, R.danfoTop, R.danfoTop]); body.scale.set(1.5, 1.3, 3.6); body.position.y = .95; g.add(body);
    const top = mesh(G.box, R.danfoTop, 1.5, .12, 3.4); top.position.y = 1.66; g.add(top);
    for (const x of [-.75, .75]) for (const z of [-1.15, 1.15]) {
      const w = new THREE.Mesh(G.cyl, R.tyre); w.scale.set(.32, .2, .32); w.rotation.z = Math.PI / 2; w.position.set(x, .32, z); g.add(w);
    }
    world.add(g); return g;
  }
  function makeKeke() {
    const g = new THREE.Group();
    const body = mesh(G.sphere, R.kekeBody, .6, .55, .95); body.position.y = .75; g.add(body);
    const roof = mesh(G.box, R.danfoTop, 1.1, .1, 1.7); roof.position.y = 1.55; g.add(roof);
    for (const x of [-.5, .5]) { const p = mesh(G.box, R.tyre, .06, .7, .06); p.position.set(x, 1.2, .6); g.add(p); }
    for (const [x, z] of [[-.5, .5], [.5, .5], [0, -.75]]) {
      const w = new THREE.Mesh(G.cyl, R.tyre); w.scale.set(.25, .14, .25); w.rotation.z = Math.PI / 2; w.position.set(x, .25, z); g.add(w);
    }
    world.add(g); return g;
  }
  const vehicles = [
    { m: makeDanfo(), x: -4.5, v: 13, kind: 'danfo' }, { m: makeKeke(), x: 4.5, v: 11, kind: 'keke' },
    { m: makeDanfo(), x: 4.5, v: 15, kind: 'danfo' }, { m: makeKeke(), x: -4.5, v: 9, kind: 'keke' },
  ];
  vehicles.forEach((o, i) => { o.m.position.set(o.x, 0, -20 - i * 25); o.m.rotation.y = Math.PI; });

  /* ---------- the cheeky attackers ---------- */
  // Goats wander Lagos streets; these ones charge straight down Pearl's lane.
  function makeGoat() {
    const g = new THREE.Group();
    const body = mesh(G.sphere, R.goat, .3, .25, .44); body.position.y = .62; g.add(body);
    const patch = mesh(G.sphere, R.goatPatch, .2, .17, .24); patch.position.set(.13, .7, -.08); g.add(patch);
    const head = new THREE.Group(); head.position.set(0, .86, .42); g.add(head);
    head.add(mesh(G.sphere, R.goat, .16, .16, .21));
    const snout = mesh(G.sphere, R.goatPatch, .09, .08, .09); snout.position.set(0, -.06, .17); head.add(snout);
    for (const sx of [-1, 1]) {
      const eye = mesh(G.sphere, M.eye, .032); eye.position.set(sx * .085, .05, .15); head.add(eye);
      const brow = mesh(G.box, M.eye, .07, .014, .01); brow.position.set(sx * .085, .1, .16); brow.rotation.z = sx * -.45; head.add(brow);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(.035, .18, 6), R.horn); horn.position.set(sx * .07, .17, -.03); horn.rotation.x = -.6; head.add(horn);
      const ear = mesh(G.sphere, R.goat, .09, .035, .05); ear.position.set(sx * .17, .05, -.02); ear.rotation.z = sx * -.4; head.add(ear);
    }
    const beard = new THREE.Mesh(new THREE.ConeGeometry(.04, .12, 5), R.goat); beard.position.set(0, -.15, .12); beard.rotation.x = Math.PI; head.add(beard);
    const legs = [];
    for (const [lx, lz] of [[-.14, .25], [.14, .25], [-.14, -.25], [.14, -.25]]) {
      const l = new THREE.Group(); l.position.set(lx, .48, lz); const m = mesh(G.box, R.goatPatch, .07, .44, .07); m.position.y = -.22; l.add(m); g.add(l); legs.push(l);
    }
    g.userData.legs = legs;
    return g;
  }
  // Crows swoop down into her lane from above.
  function makeCrow() {
    const g = new THREE.Group();
    g.add(mesh(G.sphere, R.crow, .18, .16, .3));
    const head = mesh(G.sphere, R.crow, .13); head.position.set(0, .1, .26); g.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(.05, .16, 6), R.beak); beak.rotation.x = Math.PI / 2; beak.position.set(0, .08, .42); g.add(beak);
    for (const sx of [-1, 1]) {
      const w = mesh(G.sphere, M.white, .035); w.position.set(sx * .07, .15, .35); g.add(w);
      const e = mesh(G.sphere, M.eye, .018); e.position.set(sx * .07, .15, .38); g.add(e);
      const brow = mesh(G.box, M.eye, .06, .014, .01); brow.position.set(sx * .07, .2, .37); brow.rotation.z = sx * -.5; g.add(brow);
    }
    const wings = [-1, 1].map(sx => { const p = new THREE.Group(); p.position.set(sx * .12, .06, 0); const w = mesh(G.sphere, R.crow, .3, .03, .16); w.position.x = sx * .26; p.add(w); g.add(p); return p; });
    const tail = new THREE.Mesh(new THREE.ConeGeometry(.1, .22, 4), R.crow); tail.rotation.x = -Math.PI / 2; tail.position.z = -.32; tail.scale.y = .4; g.add(tail);
    g.userData.wings = wings;
    return g;
  }

  /* ---------- obstacles and pickups ---------- */
  const items = [];
  function addItem(kind, lane, z, y = 0) {
    let m;
    if (kind === 'block') {
      const i = Math.floor(Math.random() * 6);
      m = new THREE.Mesh(G.box, [0, 1, 2, 3, 4, 5].map(k => blockMats[(i + k) % 6]));
      m.scale.setScalar(.75); m.position.y = .375; m.rotation.y = rand(-.3, .3);
    } else if (kind === 'ball') {
      m = mesh(G.sphere, R.ball, .38); m.position.y = .38;
    } else if (kind === 'pearl') {
      m = mesh(G.sphere, M.pearl, .17); m.position.y = .55 + y;
    } else if (kind === 'goat') {
      m = makeGoat();
    } else if (kind === 'crow') {
      m = makeCrow(); m.position.y = 2.6;
    } else if (POWERS.includes(kind)) {
      m = makePowerItem(kind); m.position.y = .75;
    } else {
      m = new THREE.Group();
      const b = mesh(G.cyl, R.bottle, .14, .42, .14); b.position.y = .21; m.add(b);
      const milk = mesh(G.cyl, R.milk, .12, .3, .12); milk.position.y = .16; m.add(milk);
      const capM = mesh(G.cyl, M.blush, .15, .08, .15); capM.position.y = .46; m.add(capM);
      const teat = mesh(G.sphere, M.bowKnot, .07, .1, .07); teat.position.y = .55; m.add(teat);
      m.position.y = .3;
    }
    const holder = new THREE.Group(); holder.add(m);
    holder.position.set(LANES[lane], 0, z);
    if (kind === 'block' || kind === 'ball' || kind === 'goat' || kind === 'crow') { const sh = mesh(G.shadow, M.shadow, kind === 'ball' ? .38 : .5); sh.position.y = .015; holder.add(sh); }
    world.add(holder);
    const it = { kind, lane, z, m, holder, baseY: m.position.y, gone: false, fly: 0, vz: 0 };
    items.push(it); return it;
  }
  function clearItems() { for (const it of items) world.remove(it.holder); items.length = 0; }

  function spawnRow(z) {
    // Never block all three lanes: at most two lanes get toys, pearls go in a free one.
    const lv = st.level;
    const obstLane = Math.floor(Math.random() * 3);
    const roll = Math.random(), hasObst = roll < Math.min(.95, .72 + lv * .03);
    let pl = (obstLane + 1 + Math.floor(Math.random() * 2)) % 3;
    if (hasObst) {
      if (lv >= 4 && Math.random() < Math.min(.4, (lv - 3) * .08)) {
        // A beach ball rolling toward Pearl, from further away.
        const b = addItem('ball', obstLane, z - 12); b.vz = rand(2, 3.2) + lv * .15;
      } else addItem(Math.random() < .55 ? 'block' : 'ball', obstLane, z);
      if (lv >= 3 && Math.random() < Math.min(.45, (lv - 2) * .07)) {
        const second = 3 - obstLane - pl;
        addItem('block', second, z);
      }
    }
    if (Math.random() < .35 && hasObst) {
      // An arc of pearls over the obstacle, to reward jumping.
      for (let k = -2; k <= 2; k++) addItem('pearl', obstLane, z + k * .9, 1.1 - k * k * .2);
    } else {
      for (let k = 0; k < 5; k++) addItem('pearl', pl, z - k * 1.4);
    }
    const free = 3 - obstLane - pl;
    if (S.gap < 7 && Math.random() < .12) addItem('bottle', free, z - 3);
    // Attackers: goats from the start, crows from level 2, more of both as levels rise.
    if (Math.random() < Math.min(.4, .1 + lv * .03) * S.diff.attack) { const g = addItem('goat', Math.random() < .5 ? obstLane : free, z - 16); g.vz = rand(3.5, 5) + lv * .25; }
    if (lv >= 2 && Math.random() < Math.min(.3, (lv - 1) * .05) * S.diff.attack) addItem('crow', pl, z - 12).vz = rand(2, 3);
    // Power-ups. The first few rows always offer fireballs so Pearl learns to throw them.
    st.rows++;
    if (st.rows === 4) addItem('fire', pl, z - 7);
    else if (Math.random() < .11) addItem(POWERS[Math.floor(Math.random() * POWERS.length)], pl, z - 7);
  }

  /* ---------- state ---------- */
  const R0 = { rows: 0, level: 1, hornT: 0, z: 0, speed: 0, stage: 0, lane: 1, x: 0, y: 0, vy: 0, jumps: 0, ph: 0, ms: 0, nextSpawn: 0, wave: 0, turn: 0, waveT: 0, startZ: 0, dist: 0 };
  const st = { ...R0 };
  let touch = null;
  const tmpV = new THREE.Vector3();
  const mum = makeMum(world, {
    onSay: mumSay,
    lines: ['Pearl, come back!', 'Careful o!', 'Wait for Mummy!', 'Slow down, my baby!', 'Pearl! Ah ah!'],
    closeLines: ['Almost got you!', 'Come here, you!', 'I see you o!'],
  });
  const ENEMY = { goat: 1, crow: 1 }, SOLID = { block: 1, ball: 1, goat: 1, crow: 1 };
  function knockOut(it) {
    it.gone = true; it.fly = 1;
    confetti.burst(tmpV.set(LANES[it.lane], it.kind === 'crow' ? it.m.position.y : .6, it.z), 16);
    if (ENEMY[it.kind]) { S.pearls += 2; banner(it.kind === 'goat' ? 'Bye bye, goat! +2' : 'Shoo, crow! +2'); hud(); }
  }

  function moveLane(d) { const n = THREE.MathUtils.clamp(st.lane + d, 0, 2); if (n !== st.lane) { st.lane = n; sfx.swish(); } }
  function jump() { if (st.jumps < 2) { st.vy = st.jumps ? 6.2 : 7.2; (st.jumps ? sfx.doubleJump : sfx.jump)(); st.jumps++; } }

  return {
    id: 'run',
    items,
    startBanner: 'Crawl, Pearl, crawl!',
    hint: 'Swipe to change lanes. Tap to jump.',
    world, st,
    enter() {
      world.visible = true; scene.background = sky; scene.fog = fog;
      setMermaid(P, false);
    },
    exit() { world.visible = false; clearItems(); },
    start() {
      clearItems();
      Object.assign(st, { speed: STAGE_SPEED[0], stage: 0, lane: 1, y: 0, vy: 0, jumps: 0, ms: 0, nextSpawn: st.z - 24, wave: 0, turn: 0, waveT: 0, startZ: st.z, dist: 0, level: 1, hornT: 0, rows: 0 });
      mum.reset(st.x, 0, st.z);
    },
    scoreText() { return `${S.pearls} pearls · ${Math.floor(st.dist)} m · Level ${st.level || 1}`; },
    finish(bank) {
      const m = Math.floor(st.dist), best = store.get('pw_best', 0);
      const rec = m > best; if (rec) store.set('pw_best', m);
      if (S.caught) return {
        eyebrow: rec ? 'New longest walk' : 'Mummy caught you!',
        title: 'Hug time, Pearl!',
        text: `Pearl ran ${m} m across the bridge before Mummy caught her, and picked up ${S.pearls} pearls. Piggy bank: ${bank} pearls.`,
      };
      return {
        eyebrow: rec ? 'New longest walk' : 'Walk complete',
        title: S.pearls >= 30 ? 'Amazing, Pearl!' : 'Well done, Pearl!',
        text: `Pearl went ${m} m across the bridge and picked up ${S.pearls} pearls. Piggy bank: ${bank} pearls.`,
      };
    },
    update(dt) {
      const playing = S.mode === 'play';
      // A bump trips her up for a moment, which lets Mummy catch up.
      const D = S.diff;
      st.speed = playing ? damp(st.speed, Math.min(MAX_SPEED * D.max, (STAGE_SPEED[st.stage] + st.dist * .0035) * D.speed) * (S.stumble > 0 ? .35 : 1), S.stumble > 0 ? 6 : 1.5, dt) : damp(st.speed, 0, 3, dt);
      st.z -= st.speed * dt;
      if (playing) {
        st.dist = st.startZ - st.z;
        if (Math.floor(st.dist) !== st.shownDist) { st.shownDist = Math.floor(st.dist); hud(); }
        const lv = Math.min(MAX_LEVEL, 1 + Math.floor(st.dist / (LEVEL_EVERY * S.diff.level)));
        if (lv > st.level) { st.level = lv; levelUp(lv); hud(); }
      }

      st.x = damp(st.x, playing || S.mode === 'over' ? LANES[st.lane] : 0, 12, dt);
      st.vy -= 20 * dt; st.y += st.vy * dt;
      if (st.y <= 0) { if (st.vy < -3 && playing) sfx.land(); st.y = 0; st.vy = 0; st.jumps = 0; }
      const air = st.y > .02;
      const stage = playing ? st.stage : 1, idle = !playing && st.speed < .6;
      st.ph += dt * (stage === 0 ? 1.6 : stage === 1 ? 1.3 : 1.15) * Math.max(st.speed, 1);
      if (st.waveT > 0) st.waveT -= dt;
      st.turn = damp(st.turn, st.waveT > 0 ? 1 : 0, 6, dt);
      st.wave = damp(st.wave, st.waveT > 0 || !playing ? 1 : 0, 6, dt);
      posePearl(P, { ph: st.ph, stage, air, turn: st.turn, wave: st.wave, idle, t: S.t });
      P.root.position.set(st.x, st.y, st.z);
      P.root.rotation.set(0, 0, (LANES[st.lane] - st.x) * -.12);
      P.shadow.position.y = .015 - st.y; P.shadow.scale.setScalar(Math.max(.15, .38 - st.y * .12));
      mum.update(dt, { px: st.x, py: 0, pz: st.z, gap: S.gap, mode: S.mode, caught: S.caught, t: S.t, speed: st.speed });

      if (playing) {
        const next = MILESTONES[st.ms];
        if (next && st.dist >= next.m) {
          st.ms++; banner(next.t); sfx.milestone(); confetti.burst(tmpV.set(st.x, 1.2, st.z - 1), 60);
          if (next.stage != null) st.stage = next.stage;
          st.waveT = 1.8;
          // Clear the way while she turns round to wave at Daddy.
          for (const it of items) if (!it.gone && SOLID[it.kind] && it.z < st.z && it.z > st.z - st.speed * 3 - 6) { it.gone = true; it.fly = 1; }
        }
        while (st.nextSpawn > st.z - 70) { spawnRow(st.nextSpawn); st.nextSpawn -= Math.max(6, rand(9, 14) - st.level * .5) + st.speed * .35; }
      }

      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (it.kind === 'pearl') { it.m.position.y = it.baseY + Math.sin(S.t * 4 + it.z) * .06; it.m.rotation.y += dt * 2; }
        if (it.kind === 'bottle') it.m.rotation.y += dt * 2.5;
        if (it.vz && !it.fly) {
          it.z += it.vz * dt; it.holder.position.z = it.z;
          if (it.kind === 'ball') it.m.rotation.x += it.vz * dt / .38;
        }
        if (it.kind === 'goat' && !it.fly) {
          it.m.userData.legs.forEach((l, k) => { l.rotation.x = Math.sin(S.t * 16 + k * Math.PI / 2) * .6; });
          it.m.position.y = Math.abs(Math.sin(S.t * 16)) * .06;
          if (playing && !it.bleat && st.z - it.z < 16) { it.bleat = true; sfx.goat(); }
        }
        if (it.kind === 'crow' && !it.fly) {
          it.m.userData.wings.forEach((w, k) => { w.rotation.z = Math.sin(S.t * 18) * .7 * (k ? -1 : 1); });
          const d = st.z - it.z;
          // Swoop down to Pearl's height as she gets close.
          it.m.position.y = d < 9 ? lerp(.75, 2.6, THREE.MathUtils.clamp((d - 1) / 8, 0, 1)) : 2.6 + Math.sin(S.t * 3) * .1;
          if (playing && !it.cawed && d < 10) { it.cawed = true; sfx.crow(); }
        }
        if (it.m.userData.spin) animatePowerItem(it.m, S.t, dt);
        if (it.fly > 0) {
          it.fly -= dt * 1.4; it.holder.position.y += dt * 9; it.holder.position.x += dt * (it.lane - 1 || 1) * 5;
          it.m.rotation.x += dt * 8; it.holder.scale.setScalar(Math.max(.01, it.fly));
          if (it.fly <= 0) { world.remove(it.holder); items.splice(i, 1); }
          continue;
        }
        if (it.z > st.z + 8) { world.remove(it.holder); items.splice(i, 1); continue; }
        if (!playing || it.gone) continue;
        const dz = Math.abs(it.z - st.z), dx = Math.abs(LANES[it.lane] - st.x);
        if (it.kind === 'pearl') {
          // The magnet pulls in pearls from every lane a little way ahead.
          const pulled = S.magnetT > 0 && it.z < st.z + .5 && it.z > st.z - 7;
          if (pulled || (dz < .6 && dx < .6 && Math.abs(it.m.position.y - (st.y + .6)) < .7)) {
            world.remove(it.holder); items.splice(i, 1);
            S.pearls++; sfx.pearl(); confetti.burst(tmpV.set(LANES[it.lane], it.m.position.y, it.z), 4); hud();
          }
        } else if (it.kind === 'bottle') {
          if (dz < .6 && dx < .6 && st.y < .8) {
            world.remove(it.holder); items.splice(i, 1);
            sfx.bottle(); boost(2.5, 'Milk power! Run, Pearl!');
          }
        } else if (POWERS.includes(it.kind)) {
          if (dz < .7 && dx < .7) { world.remove(it.holder); items.splice(i, 1); powers.grant(it.kind); }
        } else if (it.kind === 'crow') {
          if (dz < .6 && dx < .6 && Math.abs(it.m.position.y - (st.y + .7)) < .6 && S.inv <= 0) { it.gone = true; it.fly = 1; hurt('Cheeky crow! Mummy is coming', sfx.crow, 2.5); }
        } else if (dz < .55 && dx < .62 && st.y < (it.kind === 'block' ? .72 : it.kind === 'goat' ? .85 : .66) && S.inv <= 0) {
          it.gone = true; it.fly = 1;
          if (it.kind === 'goat') hurt('Naughty goat! Mummy is catching up', sfx.goat, 3);
          else hurt(S.gap < 4 ? 'Oopsie! Mummy is right behind you' : 'Oopsie! Up you get', sfx.hit, 2);
        }
      }

      for (const g of segments) if (g.position.z > st.z + SEG * 1.5) g.position.z -= SEG * segments.length;
      for (const p of pylons) if (p.position.z > st.z + 30) p.position.z -= PYLON_GAP * pylons.length;
      for (const b of buildings) if (b.position.z > st.z + 40) { b.position.z -= 44 * 9; b.position.x = b.userData.s * rand(38, 75); }
      for (const p of palms) if (p.position.z > st.z + 25) p.position.z -= 6 * 30;
      st.hornT -= dt;
      for (const v of vehicles) {
        const before = v.m.position.z - st.z;
        v.m.position.z -= v.v * dt * (S.mode === 'over' ? .4 : 1);
        // Danfos honk and keke beep as they pass Pearl. Lagos!
        if (playing && before > 0 && v.m.position.z - st.z <= 0 && st.hornT <= 0 && Math.random() < .7) { (v.kind === 'keke' ? sfx.keke : sfx.danfo)(); st.hornT = 2.5; }
        if (v.m.position.z < st.z - 160) v.m.position.z = st.z + rand(15, 40);
        if (v.m.position.z > st.z + 40) v.m.position.z = st.z - rand(60, 150);
      }
      water.position.z = st.z - 150; sunDisc.position.set(0, 26, st.z - 330);
      key.position.set(st.x - 4, 10, st.z + 8); key.target.position.set(st.x, 0, st.z);
      sunLight.position.set(st.x + 2, 4, st.z - 10); sunLight.target.position.set(st.x, .8, st.z);
      for (const f of flags) {
        const a = f.geo.attributes.position;
        for (let i = 0; i < a.count; i++) { const x = f.base[i * 3]; a.setZ(i, Math.sin(x * 2.4 - S.t * 6) * .16 * x / 2); }
        a.needsUpdate = true;
      }
    },
    fire() { return powers.fire(tmpV.set(st.x, st.y + .65, st.z - .6), new THREE.Vector3(0, 0, -(st.speed + 22))); },
    // A fireball knocks out the first toy or attacker it reaches in its lane.
    fireHit(pos) {
      if (st.z - pos.z > 45) return true;
      for (const it of items) {
        if (it.gone || !SOLID[it.kind] || Math.abs(LANES[it.lane] - pos.x) > .7 || Math.abs(it.z - pos.z) > .9) continue;
        if (it.kind === 'crow' && Math.abs(it.m.position.y - pos.y) > 1) continue;
        knockOut(it); return true;
      }
      return false;
    },
    bubbleY: .6,
    // e: 0 = in front of Pearl (menu, end card), 1 = chasing behind her.
    placeCamera(camera, e, wide, front, behind, look) {
      front.set(st.x - .8, 1.25, st.z - 3.4);
      behind.set(st.x * .55, 3.1, st.z + 5.4);
      camera.position.lerpVectors(front, behind, e);
      camera.position.x += Math.sin(e * Math.PI) * 2.5;
      look.set(lerp(st.x - (wide ? 1.3 : 0), st.x * .35, e), lerp(wide ? .75 : -.2, .7, e) + st.y * .3 * e, lerp(st.z, st.z - 7, e));
      camera.lookAt(look);
    },
    pointerDown(e) { touch = { x: e.clientX, y: e.clientY, t: performance.now(), used: false }; },
    pointerMove(e) {
      if (!touch || touch.used) return;
      const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
      if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) { moveLane(dx > 0 ? 1 : -1); touch.used = true; }
      else if (dy < -34 && Math.abs(dy) > Math.abs(dx)) { jump(); touch.used = true; }
    },
    pointerUp() { if (touch && !touch.used && performance.now() - touch.t < 450) jump(); touch = null; },
    keyDown(e) {
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'a') { e.preventDefault(); moveLane(-1); }
      if (k === 'ArrowRight' || k === 'd') { e.preventDefault(); moveLane(1); }
      if ((k === ' ' || k === 'ArrowUp' || k === 'w') && !e.repeat) { e.preventDefault(); jump(); }
      if ((k === 'f' || k === 'Enter') && !e.repeat) { e.preventDefault(); this.fire(); }
    },
    keyUp() {},
  };
}
