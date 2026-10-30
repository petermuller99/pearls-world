// Pearl Hunt: Pearl the little mermaid swims toward -z through the lagoon.
// Touch where you want her to go: she glides to that spot in the water in front of her.
import { THREE, M, G, mesh, tex, gradientTex, rand, lerp, damp, posePearl, setMermaid, textSprite, COL } from './common.js';
import { sfx } from './audio.js';
import { makeMum, makePowerItem, animatePowerItem, POWERS } from './chase.js';

const MILESTONES = [{ m: 10, t: 'Shiny!' }, { m: 25, t: 'Pearl collector!' }, { m: 50, t: 'Queen of the lagoon!' }, { m: 100, t: 'Ocean legend!' }, { m: 200, t: 'Richest baby in Lagos!' }];
const X_MIN = -2.4, X_MAX = 2.4, Y_MIN = .6, Y_MAX = 4.2, HOME_Y = 1.8;
const SEG = 20;
// Difficulty: a new level every 25 seconds. She swims faster, jellyfish come more often
// and start drifting sideways, and oysters stay open for less time.
const LEVEL_EVERY = 25, MAX_LEVEL = 12, MAX_SPEED = 11;
const GREETINGS = ['Hi Pearl!', 'Hello Pearl!', 'Bawo ni, Pearl!', 'Kedu, Pearl!', 'Sannu, Pearl!'];

export function createHunt({ scene, P, confetti, S, hurt, boost, banner, hud, mumSay, camera, levelUp, powers }) {
  const world = new THREE.Group(); world.visible = false; scene.add(world);
  const sky = gradientTex([[0, '#5fd8cc'], [.5, '#178ea0'], [1, '#0b3c5d']]);
  const fog = new THREE.Fog(0x1a8fa0, 6, 44);

  /* ---------- lights ---------- */
  world.add(new THREE.HemisphereLight(0xc8fbff, 0x0b3c5d, 1.7));
  const top = new THREE.DirectionalLight(0xe6fffb, 1.2);
  const front = new THREE.DirectionalLight(0xbfefff, 1.0);
  world.add(top, top.target, front, front.target);

  /* ---------- sea floor and decoration ---------- */
  const sandTex = tex(256, 256, (c, w, h) => {
    c.fillStyle = '#e8c99a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#d6b27f'; c.lineWidth = 4;
    for (let y = 10; y < h; y += 26) { c.beginPath(); for (let x = 0; x <= w; x += 8) c.lineTo(x, y + Math.sin(x / 20 + y) * 5); c.stroke(); }
  }, true);
  sandTex.repeat.set(3, 2);
  const floorMat = new THREE.MeshLambertMaterial({ map: sandTex });
  const floors = [];
  for (let i = 0; i < 7; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(40, SEG), floorMat);
    f.rotation.x = -Math.PI / 2; f.position.z = -i * SEG; world.add(f); floors.push(f);
  }

  const D = {
    weed: new THREE.MeshLambertMaterial({ color: 0x2f9e6a }),
    weed2: new THREE.MeshLambertMaterial({ color: 0x5cc77a }),
    rock: new THREE.MeshLambertMaterial({ color: 0x5c6f8a }),
    corals: [COL.coral, COL.blush, COL.sun, 0x9b7bff, 0xff9f6b].map(c => new THREE.MeshLambertMaterial({ color: c })),
    shell: new THREE.MeshLambertMaterial({ color: 0x8d7aa8, side: THREE.DoubleSide }),
    shellIn: new THREE.MeshLambertMaterial({ color: 0xf6dce8, side: THREE.DoubleSide }),
    heart: new THREE.MeshLambertMaterial({ color: COL.blush, emissive: 0x80203a, emissiveIntensity: .4 }),
    heartBubble: new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: .3, depthWrite: false }),
    jelly: new THREE.MeshLambertMaterial({ color: 0xff8fc0, transparent: true, opacity: .8, emissive: 0x7a2050, emissiveIntensity: .3 }),
    tentacle: new THREE.MeshLambertMaterial({ color: 0xffb3d4, transparent: true, opacity: .75 }),
    bubble: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .5 }),
    fish: [COL.sun, COL.coral, 0x4cc9f0, 0x9b7bff, COL.blush].map(c => new THREE.MeshLambertMaterial({ color: c })),
    stripe: new THREE.MeshLambertMaterial({ color: COL.pearl }),
  };
  const rayTex = tex(32, 256, (c, w, h) => {
    // Fades toward the bottom and toward both sides, so the rays have no hard edges.
    for (let x = 0; x < w; x++) {
      const k = Math.sin(Math.PI * (x + .5) / w);
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, `rgba(255,255,255,${.3 * k})`); g.addColorStop(.5, `rgba(255,255,255,${.1 * k})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(x, 0, 1, h);
    }
  });
  const rayMat = new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

  const decor = [];
  const capsule = new THREE.CapsuleGeometry(.09, .5, 3, 8);
  function makeWeed() {
    const g = new THREE.Group(), segs = [];
    let parent = g;
    const n = 3 + Math.floor(Math.random() * 3), mat = Math.random() < .5 ? D.weed : D.weed2;
    for (let i = 0; i < n; i++) { const s = new THREE.Group(); s.position.y = i ? .55 : 0; const m = new THREE.Mesh(capsule, mat); m.position.y = .3; s.add(m); parent.add(s); segs.push(s); parent = s; }
    g.userData.segs = segs; return g;
  }
  function makeCoral() {
    const g = new THREE.Group(), mat = D.corals[Math.floor(Math.random() * D.corals.length)];
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Group(); b.rotation.set(rand(-.7, .7), rand(0, 6), rand(-.7, .7));
      const len = rand(.5, 1.1);
      const st = mesh(G.cyl, mat, .07, len, .07); st.position.y = len / 2; b.add(st);
      const tip = mesh(G.lowSphere, mat, .12); tip.position.y = len; b.add(tip);
      g.add(b);
    }
    return g;
  }
  function makeRock() { const r = mesh(G.lowSphere, D.rock, rand(.5, 1.2), rand(.3, .7), rand(.5, 1.1)); r.rotation.y = rand(0, 6); return r; }
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? .1 : .26; i ? starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: .05, bevelEnabled: false }).rotateX(-Math.PI / 2);
  function makeStar() { return new THREE.Mesh(starGeo, D.corals[Math.random() < .5 ? 2 : 0]); }
  function makeRay() { const r = new THREE.Mesh(new THREE.PlaneGeometry(rand(1.2, 2.6), 16), rayMat); r.rotation.z = .35; return r; }

  // [maker, count, x range from centre, y]
  const DECOR = [[makeWeed, 18, [2.9, 9], 0], [makeWeed, 6, [0, 2.5], 0, .5], [makeCoral, 12, [2.6, 8], 0], [makeCoral, 5, [0, 2.4], 0, .55],
    [makeRock, 10, [3, 10], 0], [makeStar, 10, [0, 6], .02], [makeRay, 7, [0, 6], 8]];
  const DECOR_SPAN = 140;
  for (const [make, n, [a, b], y, scale] of DECOR) {
    for (let i = 0; i < n; i++) {
      const o = make(); o.userData.range = [a, b];
      if (scale) o.scale.setScalar(scale);
      o.position.set((Math.random() < .5 ? -1 : 1) * rand(a, b), y, -rand(0, DECOR_SPAN));
      o.userData.ph = rand(0, 6);
      world.add(o); decor.push(o);
    }
  }

  const bubbles = [];
  for (let i = 0; i < 36; i++) { const b = mesh(G.lowSphere, D.bubble, rand(.03, .08)); world.add(b); bubbles.push(b); b.userData.v = rand(.6, 1.4); }
  function resetBubble(b, nearPearl) {
    if (nearPearl) b.position.set(st.x + rand(-.2, .2), st.y + .5, st.z + rand(-.3, .3));
    else b.position.set(rand(-7, 7), rand(0, 1), st.z - rand(0, 30));
  }

  /* ---------- pearls, oysters, jellyfish, fish ---------- */
  const items = [];
  function addPearl(x, y, z) {
    const m = mesh(G.sphere, M.pearl, .17); m.position.set(x, y, z); world.add(m);
    items.push({ kind: 'pearl', m, x, y, z });
  }
  function addOyster(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const half = new THREE.SphereGeometry(.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const bottom = new THREE.Mesh(half, D.shell); bottom.scale.set(1, .35, 1); bottom.rotation.x = Math.PI; bottom.position.y = .17; g.add(bottom);
    const hinge = new THREE.Group(); hinge.position.set(0, .17, -.45); g.add(hinge);
    const lid = new THREE.Mesh(half, D.shell); lid.scale.set(1, .35, 1); lid.position.z = .45; hinge.add(lid);
    const inside = mesh(G.sphere, D.shellIn, .42, .05, .42); inside.position.y = .18; g.add(inside);
    const gem = mesh(G.sphere, M.pearl, .2); gem.position.set(0, .3, .05); g.add(gem);
    const sh = mesh(G.shadow, M.shadow, .55); sh.position.y = .01; g.add(sh);
    world.add(g);
    items.push({ kind: 'oyster', m: g, hinge, gem, x, y: .35, z, ph: rand(0, 6), got: false, pop: 0 });
  }
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, -.18); heartShape.bezierCurveTo(-.05, -.1, -.24, 0, -.2, .1); heartShape.bezierCurveTo(-.16, .22, -.02, .2, 0, .1);
  heartShape.bezierCurveTo(.02, .2, .16, .22, .2, .1); heartShape.bezierCurveTo(.24, 0, .05, -.1, 0, -.18);
  const heartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: .08, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 2 }).center();
  function addHeart(x, y, z) {
    // A pink heart inside a bubble: +1 heart, only offered when she has lost one.
    const g = new THREE.Group(); g.position.set(x, y, z);
    g.add(new THREE.Mesh(heartGeo, D.heart));
    g.add(mesh(G.sphere, D.heartBubble, .32));
    world.add(g);
    items.push({ kind: 'heart', m: g, x, y, z });
  }
  function addJelly(x, y, z) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.42, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), D.jelly); dome.scale.y = .85; g.add(dome);
    const rim = mesh(G.sphere, D.jelly, .42, .08, .42); g.add(rim);
    // A friendly face, looking toward Pearl and the camera (+z).
    for (const s of [-1, 1]) { const e = mesh(G.sphere, M.eye, .04); e.position.set(s * .12, .15, .34); g.add(e); }
    const smile = new THREE.Mesh(new THREE.TorusGeometry(.06, .013, 6, 12, Math.PI), M.eye); smile.rotation.z = Math.PI; smile.position.set(0, .08, .37); g.add(smile);
    const tents = [];
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2, t = new THREE.Group(); t.position.set(Math.cos(a) * .25, -.02, Math.sin(a) * .25);
      const m = mesh(G.cyl, D.tentacle, .025, .55, .025); m.position.y = -.28; t.add(m); g.add(t); tents.push(t);
    }
    world.add(g);
    const vx = st.level >= 4 && Math.random() < Math.min(.7, (st.level - 3) * .15) ? (Math.random() < .5 ? -1 : 1) * rand(.6, 1.1) : 0;
    items.push({ kind: 'jelly', m: g, tents, x, y, y0: y, z, ph: rand(0, 6), fly: 0, vx });
  }
  function addFish(z, talk) {
    const g = new THREE.Group(), mat = D.fish[Math.floor(Math.random() * D.fish.length)];
    const body = mesh(G.sphere, mat, .38, .26, .14); g.add(body);
    const stripe = mesh(G.sphere, D.stripe, .06, .25, .145); stripe.position.x = .05; g.add(stripe);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(.18, .3, 3), mat); tail.rotation.z = Math.PI / 2; tail.scale.z = .3; tail.position.x = -.45; g.add(tail);
    for (const s of [-1, 1]) { const e = mesh(G.sphere, M.eye, .04); e.position.set(.22, .06, s * .12); g.add(e); }
    const dir = Math.random() < .5 ? 1 : -1, y = rand(1, 4);
    g.position.set(-dir * 7, y, z); g.rotation.y = dir > 0 ? 0 : Math.PI;
    world.add(g);
    const it = { kind: 'fish', m: g, tail, dir, v: rand(1.2, 2.2), z, y, ph: rand(0, 6), talk, said: false };
    items.push(it);
  }
  /* ---------- the cheeky attackers ---------- */
  const A = {
    puffer: new THREE.MeshLambertMaterial({ color: 0xffd23c }),
    spike: new THREE.MeshLambertMaterial({ color: 0xff9f2a }),
    octo: new THREE.MeshLambertMaterial({ color: 0x8a4fd1 }),
    octoSpot: new THREE.MeshLambertMaterial({ color: 0xb98af0 }),
    ink: new THREE.MeshLambertMaterial({ color: 0x2a1640 }),
  };
  const spikeGeo = new THREE.ConeGeometry(.05, .16, 5);
  function grumpyFace(g, z, sx, y = .06) {
    for (const s of [-1, 1]) {
      const w = mesh(G.sphere, M.white, .07 * sx); w.position.set(s * .12 * sx, y, z); g.add(w);
      const e = mesh(G.sphere, M.eye, .035 * sx); e.position.set(s * .12 * sx, y, z + .05 * sx); g.add(e);
      const b = mesh(G.box, M.eye, .1 * sx, .02 * sx, .01); b.position.set(s * .12 * sx, y + .1 * sx, z + .03); b.rotation.z = s * -.45; g.add(b);
    }
  }
  // Pufferfish dart at Pearl and puff up when they get close.
  function addPuffer(x, y, z) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const body = new THREE.Group(); g.add(body);
    body.add(mesh(G.sphere, A.puffer, .3));
    for (let i = 0; i < 18; i++) {
      const a = i * 2.4, up = Math.acos(1 - 2 * (i + .5) / 18);
      const d = new THREE.Vector3(Math.sin(up) * Math.cos(a), Math.cos(up), Math.sin(up) * Math.sin(a));
      const sp = new THREE.Mesh(spikeGeo, A.spike); sp.position.copy(d).multiplyScalar(.31); sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); body.add(sp);
    }
    grumpyFace(body, .25, 1);
    const mouth = mesh(G.sphere, M.eye, .05, .03, .02); mouth.position.set(0, -.1, .29); body.add(mouth);
    world.add(g);
    items.push({ kind: 'puffer', m: g, body, x, y, z, fly: 0, puff: 0 });
  }
  // Octopuses hang back and squirt ink blobs at her.
  function addOcto(x, y, z) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const head = mesh(G.sphere, A.octo, .36, .42, .36); head.position.y = .15; g.add(head);
    for (const [sx, sy] of [[.18, .4], [-.2, .3], [.05, .5]]) { const sp = mesh(G.sphere, A.octoSpot, .06); sp.position.set(sx, sy, .25); g.add(sp); }
    grumpyFace(g, .32, 1.1, .05);
    const tents = [];
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2, t = new THREE.Group(); t.position.set(Math.cos(a) * .22, -.15, Math.sin(a) * .22);
      const m = mesh(G.sphere, A.octo, .07, .32, .07); m.position.y = -.28; t.add(m); g.add(t); tents.push(t);
    }
    world.add(g);
    items.push({ kind: 'octo', m: g, tents, x, y, z, fly: 0, shootT: rand(.4, 1.2) });
  }
  function addInk(from, to) {
    const m = mesh(G.sphere, A.ink, .17); m.position.copy(from); world.add(m);
    const v = to.clone().sub(from).normalize().multiplyScalar(9);
    items.push({ kind: 'ink', m, v, x: from.x, y: from.y, z: from.z, life: 3 });
    sfx.ink();
  }
  function addPower(kind, x, y, z) {
    const m = makePowerItem(kind); m.position.set(x, y, z); world.add(m);
    items.push({ kind, m, x, y, z });
  }
  let inkTimer = 0;
  function inkSplat() {
    const el = document.getElementById('ink'); el.classList.add('on');
    clearTimeout(inkTimer); inkTimer = setTimeout(() => el.classList.remove('on'), 1300);
  }

  function removeItem(i) { const it = items[i]; world.remove(it.m); if (it.bubble) world.remove(it.bubble); items.splice(i, 1); }
  function clearItems() { while (items.length) removeItem(items.length - 1); }

  function spawn(z) {
    const r = Math.random();
    const px = rand(X_MIN + .4, X_MAX - .4), py = rand(Y_MIN + .3, Y_MAX - .5);
    if (r < .55) {
      // A trail of pearls that drifts across the water.
      const dx = rand(-.25, .25), dy = rand(-.15, .15);
      for (let k = 0; k < 6; k++) addPearl(THREE.MathUtils.clamp(px + dx * k, X_MIN, X_MAX), THREE.MathUtils.clamp(py + dy * k, Y_MIN, Y_MAX), z - k * 1.2);
    } else if (r < .78) {
      // A ring to swim through.
      const cx = THREE.MathUtils.clamp(px, X_MIN + .9, X_MAX - .9), cy = THREE.MathUtils.clamp(py, Y_MIN + .9, Y_MAX - .9);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; addPearl(cx + Math.cos(a) * .85, cy + Math.sin(a) * .85, z); }
    }
    const lv = st.level;
    if (Math.random() < .4) addOyster(rand(X_MIN + .3, X_MAX - .3), z - 5);
    if (Math.random() < Math.min(.95, (.35 + lv * .07) * S.diff.attack)) addJelly(rand(X_MIN, X_MAX), rand(Y_MIN + .3, Y_MAX - .3), z - rand(3, 8));
    if (lv >= 3 && Math.random() < Math.min(.6, (lv - 2) * .1) * S.diff.attack) addJelly(rand(X_MIN, X_MAX), rand(Y_MIN + .3, Y_MAX - .3), z - rand(5, 9));
    if (S.gap < 7 && Math.random() < .15) addHeart(rand(X_MIN + .3, X_MAX - .3), rand(Y_MIN + .3, Y_MAX - .3), z - rand(2, 6));
    if (Math.random() < .3) addFish(z - rand(4, 10), Math.random() < .5);
    // Attackers: pufferfish from the start, octopuses from level 2, more as levels rise.
    if (Math.random() < Math.min(.45, .14 + lv * .03) * S.diff.attack) addPuffer(rand(X_MIN, X_MAX), rand(Y_MIN + .3, Y_MAX - .3), z - rand(8, 12));
    if (lv >= 2 && Math.random() < Math.min(.3, (lv - 1) * .06) * S.diff.attack) addOcto(rand(X_MIN + .4, X_MAX - .4), rand(Y_MIN + .6, Y_MAX - .4), z - rand(10, 14));
    // Power-ups. An early one is always fireballs so Pearl learns to throw them.
    st.rows++;
    const pw = st.rows === 3 ? 'fire' : Math.random() < .12 ? POWERS[Math.floor(Math.random() * POWERS.length)] : null;
    if (pw) addPower(pw, rand(X_MIN + .4, X_MAX - .4), rand(Y_MIN + .4, Y_MAX - .5), z - rand(3, 6));
  }

  /* ---------- state and input ---------- */
  const st = { rows: 0, level: 1, x: 0, y: HOME_Y, z: 0, vx: 0, vy: 0, speed: 0, ph: 0, ms: 0, nextSpawn: 0, wave: 0, turn: 0, waveT: 0, time: 0, tx: null, ty: null, bubbleT: 0 };
  const keys = {};
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
  const mum = makeMum(world, {
    onSay: mumSay,
    mermaid: true,
    lines: ['Pearl, come back!', 'Not too deep o!', 'Wait for Mummy!', 'Pearl! Slow down!'],
    closeLines: ['Almost got you!', 'Come here, my fishy!', 'I see you o!'],
  });
  const HITTABLE = { jelly: 1, puffer: 1, octo: 1, ink: 1 };
  function knockOut(i) {
    const it = items[i];
    confetti.burst(tmpV.copy(it.m.position), 16, 2);
    if (it.kind === 'ink') { removeItem(i); return; }
    it.fly = 1;
    if (it.kind !== 'jelly') { S.pearls += 2; banner(it.kind === 'puffer' ? 'Pop! Bye, pufferfish! +2' : 'Bye, octopus! +2'); hud(); }
  }
  function aim(e) {
    const r = e.target.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    plane.constant = -st.z;
    if (ray.ray.intersectPlane(plane, hit)) {
      // Aim a little above the finger so Pearl stays visible under it.
      st.tx = THREE.MathUtils.clamp(hit.x, X_MIN, X_MAX);
      st.ty = THREE.MathUtils.clamp(hit.y + .35, Y_MIN, Y_MAX);
    }
  }

  return {
    id: 'dive',
    items,
    startBanner: 'Find the pearls!',
    hint: 'Touch where you want Pearl to swim.',
    world, st,
    enter() {
      world.visible = true; scene.background = sky; scene.fog = fog;
      setMermaid(P, true);
      P.root.rotation.set(0, 0, 0);
    },
    exit() { world.visible = false; clearItems(); setMermaid(P, false); P.root.rotation.set(0, 0, 0); },
    start() {
      clearItems();
      Object.assign(st, { x: 0, y: HOME_Y, vx: 0, vy: 0, speed: 4, ms: 0, nextSpawn: st.z - 14, wave: 0, turn: 0, waveT: 0, time: 0, tx: null, ty: null, level: 1, rows: 0 });
      mum.reset(st.x, st.y, st.z);
      sfx.splash();
    },
    scoreText() { return `${S.pearls} pearls · Level ${st.level}`; },
    finish(bank) {
      if (S.caught) return {
        eyebrow: 'Mummy caught you!',
        title: 'Hug time, Pearl!',
        text: `Mummy caught Pearl in the lagoon after she found ${S.pearls} pearls. Piggy bank: ${bank} pearls.`,
      };
      return {
        eyebrow: 'Dive complete',
        title: S.pearls >= 30 ? 'Amazing, Pearl!' : 'Well done, Pearl!',
        text: `Pearl found ${S.pearls} pearls in the lagoon. Piggy bank: ${bank} pearls.`,
      };
    },
    update(dt) {
      const playing = S.mode === 'play';
      if (playing) {
        st.time += dt;
        const lv = Math.min(MAX_LEVEL, 1 + Math.floor(st.time / (LEVEL_EVERY * S.diff.level)));
        if (lv > st.level) { st.level = lv; levelUp(lv); hud(); }
      }
      st.speed = playing ? damp(st.speed, Math.min(MAX_SPEED * S.diff.max, (4 + (st.level - 1) * .65) * S.diff.speed) * (S.stumble > 0 ? .35 : 1), S.stumble > 0 ? 6 : 1.5, dt) : damp(st.speed, 0, 3, dt);
      st.z -= st.speed * dt;

      // Steering: glide toward the touch point, or move with the arrow keys.
      const ox = st.x, oy = st.y;
      if (playing) {
        if (st.tx != null) { st.x = damp(st.x, st.tx, 4, dt); st.y = damp(st.y, st.ty, 4, dt); }
        const kx = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0), ky = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);
        st.x += kx * 3.5 * dt; st.y += ky * 3.5 * dt;
      } else {
        st.x = damp(st.x, 0, 2, dt); st.y = damp(st.y, HOME_Y, 2, dt);
      }
      st.x = THREE.MathUtils.clamp(st.x, X_MIN, X_MAX); st.y = THREE.MathUtils.clamp(st.y, Y_MIN, Y_MAX);
      st.vx = damp(st.vx, (st.x - ox) / Math.max(dt, .001), 8, dt); st.vy = damp(st.vy, (st.y - oy) / Math.max(dt, .001), 8, dt);

      const idle = !playing && st.speed < .6;
      st.ph += dt * (idle ? 2 : 3 + st.speed * .6 + Math.hypot(st.vx, st.vy) * .5);
      if (st.waveT > 0) st.waveT -= dt;
      st.turn = damp(st.turn, st.waveT > 0 ? 1 : 0, 6, dt);
      st.wave = damp(st.wave, st.waveT > 0 || !playing ? 1 : 0, 6, dt);
      posePearl(P, { ph: st.ph, swim: true, idle: idle || st.turn > .5, turn: st.turn, wave: st.wave, t: S.t });
      P.root.position.set(st.x, st.y, st.z);
      P.root.rotation.set(playing ? THREE.MathUtils.clamp(st.vy * .12, -.4, .4) * (1 - st.turn) : 0, 0, playing ? THREE.MathUtils.clamp(-st.vx * .1, -.35, .35) : 0);
      P.shadow.position.y = .02 - st.y; P.shadow.scale.setScalar(Math.max(.2, .55 - st.y * .07));
      mum.update(dt, { px: st.x, py: st.y, pz: st.z, gap: S.gap, mode: S.mode, caught: S.caught, t: S.t, speed: st.speed });

      if (playing) {
        const next = MILESTONES[st.ms];
        if (next && S.pearls >= next.m) {
          st.ms++; banner(next.t); sfx.milestone(); confetti.burst(tmpV.set(st.x, st.y + .8, st.z - 1), 60, 2);
          st.waveT = 1.8;
          // Shoo the jellyfish ahead away while she turns to wave.
          for (const it of items) if (HITTABLE[it.kind] && it.kind !== 'ink' && !it.fly && it.m.position.z < st.z && it.m.position.z > st.z - st.speed * 3 - 6) it.fly = 1;
        }
        while (st.nextSpawn > st.z - 45) { spawn(st.nextSpawn); st.nextSpawn -= Math.max(4.5, rand(7, 11) - st.level * .4); }
        st.bubbleT -= dt;
        if (st.bubbleT <= 0) { st.bubbleT = rand(.2, .5); const b = bubbles[Math.floor(Math.random() * bubbles.length)]; resetBubble(b, true); if (Math.random() < .12) sfx.bubble(); }
      }

      const cx = st.x, cy = st.y + .15;
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (it.z > st.z + 6 && it.kind !== 'fish') { removeItem(i); continue; }
        if (it.kind === 'pearl') {
          it.m.rotation.y += dt * 2; it.m.position.y = it.y + Math.sin(S.t * 2 + it.z) * .05;
          // The magnet pulls in every pearl a little way ahead.
          const pulled = S.magnetT > 0 && it.z < st.z + .5 && it.z > st.z - 7;
          if (playing && (pulled || (Math.abs(it.z - st.z) < .5 && Math.hypot(it.x - cx, it.m.position.y - cy) < .55))) {
            removeItem(i); S.pearls++; sfx.pearl(); confetti.burst(tmpV.set(it.x, it.y, it.z), 4, 2); hud();
          }
        } else if (it.kind === 'oyster') {
          const open = it.got ? 1 : THREE.MathUtils.clamp(Math.sin(S.t * 1.8 + it.ph) * 1.6 + Math.max(-.2, .6 - st.level * .07), 0, 1);
          it.hinge.rotation.x = -open * 1.05;
          if (it.got) {
            it.pop += dt; it.gem.position.y = .3 + it.pop * 2.5; it.gem.scale.setScalar(.2 * Math.max(0, 1 - it.pop));
            if (it.bubble) { it.bubble.position.y += dt * 1.2; it.bubble.material.opacity = Math.max(0, 1 - it.pop * .6); }
          } else if (playing && open > .6 && Math.abs(it.z - st.z) < .9 && Math.hypot(it.x - cx, it.y - cy) < 1.1) {
            it.got = true; S.pearls += 3; sfx.oyster(); hud();
            confetti.burst(tmpV.set(it.x, .6, it.z), 14, 2);
            it.bubble = textSprite('+3', { color: '#ff6b4a' }); it.bubble.position.set(it.x, 1, it.z); world.add(it.bubble);
          }
        } else if (it.kind === 'heart') {
          it.m.rotation.y += dt * 2; it.m.position.y = it.y + Math.sin(S.t * 2 + it.z) * .1;
          if (playing && Math.abs(it.z - st.z) < .6 && Math.hypot(it.x - cx, it.m.position.y - cy) < .6) {
            removeItem(i); sfx.heart(); boost(2.5, 'A heart from the sea! Swim, Pearl!');
            confetti.burst(tmpV.set(it.x, it.y, it.z), 16, 2);
          }
        } else if (it.kind === 'jelly') {
          it.tents.forEach((t, k) => { t.rotation.x = Math.sin(S.t * 3 + k + it.ph) * .3; t.rotation.z = Math.cos(S.t * 2.6 + k) * .25; });
          if (it.fly > 0) {
            it.fly -= dt; it.m.position.y += dt * 4; it.m.position.x += dt * (it.x > st.x ? 3 : -3); it.m.rotation.z += dt * 5;
            it.m.scale.setScalar(Math.max(.01, it.fly));
            if (it.fly <= 0) removeItem(i);
            continue;
          }
          it.m.position.y = it.y0 + Math.sin(S.t * 1.5 + it.ph) * .5;
          if (it.vx && !it.fly) { it.m.position.x += it.vx * dt; if (it.m.position.x < X_MIN || it.m.position.x > X_MAX) it.vx = -it.vx; }
          it.m.scale.y = 1 + Math.sin(S.t * 3 + it.ph) * .08;
          if (playing && S.inv <= 0 && Math.abs(it.z - st.z) < .55 && Math.hypot(it.m.position.x - cx, it.m.position.y - .1 - cy) < .62) {
            it.fly = 1; hurt(S.gap < 4 ? 'Boop! Mummy is right behind you' : 'Boop! Silly jellyfish', sfx.jelly, 2);
          }
        } else if (POWERS.includes(it.kind)) {
          animatePowerItem(it.m, S.t, dt); it.m.position.y = it.y + Math.sin(S.t * 2 + it.z) * .1;
          if (playing && Math.abs(it.z - st.z) < .7 && Math.hypot(it.x - cx, it.m.position.y - cy) < .75) { removeItem(i); powers.grant(it.kind); }
        } else if (it.kind === 'puffer' || it.kind === 'octo') {
          if (it.fly > 0) {
            it.fly -= dt * 1.3; it.m.position.y += dt * 4; it.m.rotation.z += dt * 8; it.m.scale.setScalar(Math.max(.01, it.fly));
            if (it.fly <= 0) removeItem(i);
            continue;
          }
          const d = st.z - it.m.position.z;
          if (it.kind === 'puffer') {
            it.body.rotation.y = Math.sin(S.t * 3 + it.z) * .3;
            if (playing && d > 0 && d < 13) {
              // Dart toward Pearl and puff up when close.
              if (!it.homing) { it.homing = true; sfx.puffer(); }
              it.m.position.x = damp(it.m.position.x, st.x, .9, dt); it.m.position.y = damp(it.m.position.y, st.y + .15, .9, dt);
              it.m.position.z += (1.5 + st.level * .15) * dt;
              it.puff = damp(it.puff, d < 5 ? 1 : 0, 4, dt);
            }
            it.body.scale.setScalar(1 + it.puff * .45);
          } else {
            it.tents.forEach((t, k) => { t.rotation.x = Math.sin(S.t * 3 + k) * .35; t.rotation.z = Math.cos(S.t * 2.5 + k) * .3; });
            it.m.position.y = it.y + Math.sin(S.t * 1.3 + it.z) * .25;
            if (playing && d > 4 && d < 22) {
              it.shootT -= dt;
              if (it.shootT <= 0) { it.shootT = Math.max(.9, 2.2 - st.level * .1); addInk(tmpV.copy(it.m.position), tmpV2.set(st.x, st.y + .15, st.z - st.speed * .6)); }
            }
          }
          const r = it.kind === 'puffer' ? .45 + it.puff * .2 : .6;
          if (playing && S.inv <= 0 && Math.abs(it.m.position.z - st.z) < .6 && Math.hypot(it.m.position.x - cx, it.m.position.y - cy) < r + .2) {
            it.fly = 1;
            hurt(it.kind === 'puffer' ? 'Ouch! Spiky pufferfish' : 'Bonk! Grumpy octopus', it.kind === 'puffer' ? sfx.puffer : sfx.jelly, 2.5);
          }
        } else if (it.kind === 'ink') {
          it.m.position.addScaledVector(it.v, dt); it.life -= dt;
          it.m.scale.setScalar(.17 * (1 + Math.sin(S.t * 20) * .1));
          if (playing && S.inv <= 0 && it.m.position.distanceTo(tmpV.set(cx, cy, st.z)) < .5) {
            removeItem(i); inkSplat(); hurt('Splat! Inky octopus!', sfx.ink, 2); continue;
          }
          if (it.life <= 0) removeItem(i);
        } else if (it.kind === 'fish') {
          it.m.position.x += it.dir * it.v * dt;
          it.m.position.y = it.y + Math.sin(S.t * 2 + it.ph) * .15;
          it.tail.rotation.y = Math.sin(S.t * 10 + it.ph) * .5;
          if (it.talk && !it.said && it.z - st.z > -9 && it.z < st.z && Math.abs(it.m.position.x) < 4) {
            it.said = true; sfx.fish();
            it.bubble = textSprite(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]); it.bubble.scale.multiplyScalar(1.4); world.add(it.bubble); it.sayT = 2.5;
          }
          if (it.bubble) { it.bubble.position.set(it.m.position.x, it.m.position.y + .55, it.z); it.sayT -= dt; if (it.sayT <= 0) { world.remove(it.bubble); it.bubble = null; } }
          if (Math.abs(it.m.position.x) > 9 || it.z > st.z + 6) removeItem(i);
        }
      }

      for (const f of floors) if (f.position.z > st.z + SEG * 1.5) f.position.z -= SEG * floors.length;
      for (const o of decor) {
        if (o.position.z > st.z + 8) { const [a, b] = o.userData.range; o.position.z -= DECOR_SPAN; o.position.x = (Math.random() < .5 ? -1 : 1) * rand(a, b); }
        if (o.userData.segs) o.userData.segs.forEach((s, k) => { s.rotation.z = Math.sin(S.t * 1.4 + o.userData.ph + k * .7) * .18; s.rotation.x = Math.cos(S.t * 1.1 + o.userData.ph + k) * .1; });
      }
      for (const b of bubbles) {
        b.position.y += b.userData.v * dt; b.position.x += Math.sin(S.t * 3 + b.userData.v * 10) * dt * .2;
        if (b.position.y > 7 || b.position.z > st.z + 6) resetBubble(b, false);
      }
      if (S.mode !== 'play') document.getElementById('ink').classList.remove('on');
      top.position.set(st.x, 12, st.z - 4); top.target.position.set(st.x, 0, st.z - 6);
      front.position.set(st.x + 1, st.y + 2, st.z - 8); front.target.position.set(st.x, st.y, st.z);
    },
    fire() { return powers.fire(tmpV.set(st.x, st.y + .2, st.z - .6), new THREE.Vector3(0, 0, -(st.speed + 18))); },
    // A fireball knocks out the first attacker, jellyfish or ink blob it touches.
    fireHit(pos) {
      if (st.z - pos.z > 40) return true;
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (!HITTABLE[it.kind] || it.fly > 0 || it.m.position.distanceTo(pos) > .85) continue;
        knockOut(i); return true;
      }
      return false;
    },
    bubbleY: .25,
    placeCamera(cam, e, wide, frontV, behindV, look) {
      frontV.set(st.x - .8, st.y + .3, st.z - 3.8);
      behindV.set(st.x * .6, st.y * .5 + 2.7, st.z + 5);
      cam.position.lerpVectors(frontV, behindV, e);
      cam.position.x += Math.sin(e * Math.PI) * 2.5;
      look.set(lerp(st.x - (wide ? 1.3 : 0), st.x * .45, e), lerp(st.y + (wide ? .3 : -.55), st.y * .6 + .2, e), lerp(st.z, st.z - 6, e));
      cam.lookAt(look);
    },
    pointerDown(e) { aim(e); },
    pointerMove(e) { if (e.buttons || e.pointerType === 'touch') aim(e); },
    pointerUp() { st.tx = null; st.ty = null; },
    keyDown(e) {
      if (e.key.startsWith('Arrow')) { e.preventDefault(); keys[e.key] = true; }
      if ((e.key === 'f' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); this.fire(); }
    },
    keyUp(e) { keys[e.key] = false; },
  };
}
