// Number Drop: Pearl's toy blocks tumble from the sky over the family's Lagos rooftop.
// Each block has a number; every bubble from Pearl's blaster takes 1 off, and at 0 the
// block pops into confetti and pearls. Blocks land softly on the market canopy above her
// and pile up. The game ends gently when the pile reaches the top: "Tidy up time!".
// Easy shows dice dots (1 to 6) so Pearl can count them; Hard shows sums like 3+4.
import { THREE, M, G, mesh, tex, gradientTex, rand, lerp, damp, posePearl, setMermaid, textSprite, COL, store, getOutfit } from './common.js';
import { sfx, audio } from './audio.js';
import { makeMumFigure } from './chase.js';
import { makeDaddyFigure } from './daddy.js';

const N = 6, CW = 1.15, B = 1.05;             // columns, column width, block size
const colX = c => (c - (N - 1) / 2) * CW;
const FLOOR = 2.35;                             // top of the canopy the blocks land on
const ROWS = 8, TOP = FLOOR + ROWS * B;         // pile this high and it's tidy up time
const SPAWN_Y = TOP + 6;                       // above the top of the view; they tumble in fast
const X_LIM = colX(N - 1) + .2;
const POPS_PER_LEVEL = 12, MAX_LEVEL = 15;
const COLS = ['#ff6b4a', '#0f8a8f', '#ff5c8a', '#6b4fc9', '#3aa655', '#2f6fd6'];
const DAD_LINES = ['Pop am, Pearl!', 'Na you be the champion!', 'Count am well!', 'Daddy is proud of you!', 'Ehen! Big block don go!'];
const DOTS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };

export function createBlocks({ scene, P, confetti, S, banner, hud, say, camera, levelUp, endGame }) {
  const world = new THREE.Group(); world.visible = false; scene.add(world);
  const sky = gradientTex([[0, '#5fb8e8'], [.6, '#9fd8ee'], [1, '#ffe3b0']]);
  const fog = new THREE.Fog(0xcfe8f0, 30, 110);

  /* ---------- lights ---------- */
  world.add(new THREE.HemisphereLight(0xfff4e0, 0x6a8aa0, 1.7));
  const sun = new THREE.DirectionalLight(0xfff0dc, 1.6);
  sun.position.set(4, 14, 9); sun.target.position.set(0, 0, 0);
  world.add(sun, sun.target);

  /* ---------- the rooftop, canopy and Lagos behind ---------- */
  const W = {
    slab: new THREE.MeshLambertMaterial({ color: 0xd9cdb8 }), wall: new THREE.MeshLambertMaterial({ color: 0xf2e6d0 }),
    tank: new THREE.MeshLambertMaterial({ color: 0x2a2433 }), pole: new THREE.MeshLambertMaterial({ color: 0x8a6a4a }),
    tower: [0xe8ecf2, 0xcfe0ea, 0xf2d8c0, 0xd9cfe0].map(c => new THREE.MeshLambertMaterial({ color: c })),
    glass: new THREE.MeshLambertMaterial({ color: 0x7fb8d8, emissive: 0x1a3a50 }),
    lagoon: new THREE.MeshLambertMaterial({ color: 0x2f9aa0 }),
    palm: new THREE.MeshLambertMaterial({ color: 0x2f9e6a, side: THREE.DoubleSide }), trunk: new THREE.MeshLambertMaterial({ color: 0x7a4a2c }),
    line: new THREE.MeshBasicMaterial({ color: 0xff5c8a, transparent: true, opacity: .55 }),
  };
  const slab = mesh(G.box, W.slab, 11, .4, 4); slab.position.set(0, -.2, .3); slab.receiveShadow = true; world.add(slab);
  const parapet = mesh(G.box, W.wall, 11, .5, .2); parapet.position.set(0, .25, 2.2); world.add(parapet);
  // A black water tank, a satellite dish and a washing line: every Lagos roof has them.
  const tank = mesh(G.cyl, W.tank, .6, 1.2, .6); tank.position.set(-4.6, .6, -1); world.add(tank);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3), new THREE.MeshLambertMaterial({ color: 0xfff8f0, side: THREE.DoubleSide }));
  dish.position.set(4.7, 1, -1); dish.rotation.set(-.9, .4, 0); world.add(dish);
  const canopyTex = getOutfit('coral').clone(); canopyTex.needsUpdate = true; canopyTex.repeat.set(4, 1);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(N * CW + .5, .14, 1.4), new THREE.MeshLambertMaterial({ map: canopyTex }));
  canopy.position.set(0, FLOOR - .07, 0); world.add(canopy);
  for (const sx of [-1, 1]) { const p = mesh(G.cyl, W.pole, .06, FLOOR, .06); p.position.set(sx * (N * CW / 2 + .15), FLOOR / 2, 0); world.add(p); }
  // A dashed line at the top: the pile may not reach it.
  const topLine = new THREE.Group(); world.add(topLine);
  for (let i = 0; i < 14; i++) { const d = mesh(G.box, W.line, .32, .06, .06); d.position.set(-N * CW / 2 + .2 + i * .5, TOP, .55); topLine.add(d); }
  // Lagos skyline: Eko Atlantic glass towers and the lagoon.
  const lagoon = mesh(G.box, W.lagoon, 200, .2, 60); lagoon.position.set(0, -6, -45); world.add(lagoon);
  for (let i = 0; i < 26; i++) {
    const h = rand(6, 26), w = rand(2, 4), glass = Math.random() < .4;
    const t = mesh(G.box, glass ? W.glass : W.tower[i % 4], w, h, w); t.position.set(rand(-45, 45), -6 + h / 2, -rand(28, 60)); world.add(t);
  }
  for (const [x, z] of [[-7, -4], [7.5, -5], [-9, -9], [9, -10]]) {
    const g = new THREE.Group(); g.position.set(x, -.2, z);
    const tr = mesh(G.cyl, W.trunk, .14, 5, .14); tr.position.y = 2.5; tr.rotation.z = .08; g.add(tr);
    for (let k = 0; k < 6; k++) { const l = mesh(G.sphere, W.palm, 1.3, .06, .35); l.position.set(Math.cos(k) * .9, 5, Math.sin(k) * .9); l.rotation.y = -k; l.rotation.z = -.4; g.add(l); }
    world.add(g);
  }

  /* ---------- Mummy and Daddy watching from the roof ---------- */
  const mumF = makeMumFigure(), dadF = makeDaddyFigure();
  world.add(mumF.root, dadF.root);
  const fam = { mum: { F: mumF, x: -3.85, cheer: 0 }, dad: { F: dadF, x: 3.85, cheer: 0 } };

  /* ---------- Pearl's bubble blaster ---------- */
  const blaster = new THREE.Group();
  {
    const body = mesh(G.cyl, new THREE.MeshLambertMaterial({ color: COL.blush }), .07, .32, .07); body.position.y = -.42; blaster.add(body);
    const tank2 = mesh(G.sphere, new THREE.MeshLambertMaterial({ color: 0x9fe8ff, transparent: true, opacity: .7 }), .09); tank2.position.set(0, -.36, .07); blaster.add(tank2);
    const tip = new THREE.Object3D(); tip.position.y = -.62; blaster.add(tip); blaster.userData.tip = tip;
  }

  /* ---------- block faces, drawn once and reused ---------- */
  const faceCache = {}, sideCache = {};
  function faceMat(color, label, kind) {
    const k = `${color}|${label}|${kind}`;
    if (faceCache[k]) return faceCache[k];
    const t = tex(128, 128, (c, w, h) => {
      c.fillStyle = color; c.fillRect(0, 0, w, h);
      if (kind === 'jollof') { for (let i = 0; i < 120; i++) { c.fillStyle = i % 3 ? '#fff3dc' : '#c93a14'; c.fillRect(rand(8, w - 8), rand(8, h - 8), 5, 2); } }
      if (kind === 'bread') { c.fillStyle = 'rgba(255,255,255,.35)'; for (let x = 18; x < w; x += 26) c.fillRect(x, 10, 6, h - 20); }
      c.strokeStyle = '#24163d'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10);
      c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(14, 14, w - 28, 10);
      c.fillStyle = '#fff8f0'; c.strokeStyle = '#24163d'; c.lineJoin = 'round';
      if (typeof label === 'number' && label <= 6 && kind === 'dots') {
        for (const [dx, dy] of DOTS[label]) { c.beginPath(); c.arc(w / 2 + dx * 30, h / 2 + dy * 30, 12, 0, 7); c.lineWidth = 5; c.stroke(); c.fill(); }
      } else {
        const txt = String(label), size = txt.length > 3 ? 40 : txt.length > 2 ? 52 : txt.length > 1 ? 66 : 80;
        c.font = `400 ${size}px "Bagel Fat One", "Arial Rounded MT Bold", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = 12; c.strokeText(txt, w / 2, h / 2 + 5); c.fillText(txt, w / 2, h / 2 + 5);
      }
      if (kind === 'jollof' || kind === 'bread' || kind === 'gold') {
        c.font = '900 15px Nunito, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#24163d';
        c.fillText(kind === 'jollof' ? 'JOLLOF' : kind === 'bread' ? 'AGEGE' : 'GOLD', w / 2, h - 18);
      }
    });
    return (faceCache[k] = new THREE.MeshLambertMaterial({ map: t, emissive: kind === 'gold' ? 0x4a3000 : 0x000000 }));
  }
  function sideMat(color) { return sideCache[color] || (sideCache[color] = new THREE.MeshLambertMaterial({ color })); }
  // Fonts may finish loading after the first faces are drawn: redraw them.
  if (document.fonts && document.fonts.load) document.fonts.load('400 60px "Bagel Fat One"').then(() => { for (const k in faceCache) delete faceCache[k]; for (const b of blocks) setFace(b); }).catch(() => {});

  /* ---------- blocks ---------- */
  const blocks = [], shots = [];
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  function label(b) { return b.sum && b.n === b.max ? b.sum : b.n; }
  function setFace(b) {
    const f = faceMat(b.color, label(b), b.kind === 'toy' && S.diff.label === 'Easy' ? 'dots' : b.kind);
    // Box faces: +x, -x, top, bottom, front (+z, toward the camera), back.
    const s = sideMat(b.color);
    b.m.material = [s, s, s, s, f, s];
  }
  function numberFor(lv) {
    if (S.diff.label === 'Easy') return { n: Math.ceil(rand(0, Math.min(6, 2 + lv))) };
    const hi = Math.min(45, 4 + lv * 3);
    const n = Math.max(1, Math.round(rand(1, hi) * (Math.random() < .3 ? .4 : 1)));
    if (S.diff.label === 'Hard' && n >= 3) { const a = Math.ceil(rand(0, n - 1)); return { n, sum: `${a}+${n - a}` }; }
    return { n };
  }
  function addBlock(opts = {}) {
    const lv = st.level, r = Math.random();
    let kind = opts.kind || 'toy', w = 1, h = 1;
    if (!opts.kind) {
      if (lv >= 2 && r < .06) kind = 'gold';
      else if (lv >= 3 && r < .14) kind = 'jollof';
      else if (lv >= 4 && r < .24) kind = 'bread';
    }
    if (kind === 'bread') w = 2;
    if (kind === 'mega') { w = 2; h = 2; }
    const free = [];
    for (let c = 0; c <= N - w; c++) if (restY({ c, w, h, y: SPAWN_Y }) + h * B / 2 < TOP + 1) free.push(c);
    const c = opts.c ?? (free.length ? free[Math.floor(Math.random() * free.length)] : Math.floor(rand(0, N - w + 1)));
    const num = kind === 'mega' ? { n: Math.round((25 + lv * 4) * (S.diff.label === 'Easy' ? .4 : 1)) } : numberFor(lv);
    const color = kind === 'gold' ? '#ffc93c' : kind === 'jollof' ? '#e8501f' : kind === 'bread' ? '#d9a35a' : kind === 'mega' ? '#24163d' : COLS[Math.floor(Math.random() * COLS.length)];
    const m = new THREE.Mesh(boxGeo); m.scale.set(w * CW - (CW - B), h * B, B); m.castShadow = true;
    const b = { kind, c, w, h, n: num.n, max: num.n, sum: num.sum, color, m, y: SPAWN_Y, landed: false, drop: false, hit: 0, wob: rand(0, 6) };
    m.position.set(colX(c) + (w - 1) * CW / 2, SPAWN_Y, 0);
    setFace(b); world.add(m); blocks.push(b);
    return b;
  }
  // Where a falling block would come to rest: on the canopy or on the blocks below it.
  function restY(b) {
    let base = FLOOR;
    for (const o of blocks) {
      if (o === b || o.y > b.y || o.c + o.w <= b.c || o.c >= b.c + b.w) continue;
      base = Math.max(base, o.y + o.h * B / 2);
    }
    return base + b.h * B / 2;
  }
  function popBlock(b, quiet) {
    const i = blocks.indexOf(b); if (i < 0) return;
    blocks.splice(i, 1); world.remove(b.m);
    const at = tmpV.set(b.m.position.x, b.m.position.y, .4);
    confetti.burst(at, b.kind === 'mega' ? 70 : 22);
    st.popped++; st.big = Math.max(st.big, b.max);
    let gain = Math.ceil(b.max / 3) + (b.kind === 'gold' ? 15 : 0) + (b.kind === 'mega' ? 20 : 0);
    // Quick pops chain together for a bonus.
    st.chain = st.chainT > 0 ? st.chain + 1 : 1; st.chainT = 1.6;
    if (st.chain >= 3) gain += st.chain - 1;
    S.pearls += gain;
    const pop = textSprite(`+${gain}`, { color: b.kind === 'gold' ? '#c9962e' : '#ff6b4a' }); pop.position.copy(at); pop.position.y += .4; world.add(pop); floaters.push({ s: pop, life: .9 });
    if (!quiet) {
      sfx.zPop(); if (st.chain >= 2) sfx.combo(st.chain);
      if (S.diff.label === 'Easy') speak(b.max);
      if (b.kind === 'gold') banner(`Gold block! +${gain} pearls`);
      else if (b.kind === 'mega') { banner(`Mega block popped! +${gain}`); cheer('dad', 'Mega block don fall! Up Pearl!'); }
      else if (st.chain === 3 || st.chain === 6) banner(`Chain x${st.chain}! +${gain}`);
      if (b.max >= 15 || st.chain === 5) cheer('dad', DAD_LINES[Math.floor(Math.random() * DAD_LINES.length)]);
    }
    // Jollof pot: clears every block in its row too.
    if (b.kind === 'jollof') {
      banner('Jollof pot! The whole row is gone!'); sfx.milestone();
      for (const o of [...blocks]) if (Math.abs(o.y - b.y) < B * .6) popBlock(o, true);
    }
    if (st.popped % POPS_PER_LEVEL === 0 && st.level < MAX_LEVEL) {
      st.level++;
      const extra = st.level === 2 ? ' Gold blocks!' : st.level === 3 ? ' Jollof pots!' : st.level === 4 ? ' Agege bread!' : '';
      levelUp(st.level, `Level ${st.level}! Bigger numbers!${extra}`);
      cheer('dad', DAD_LINES[Math.floor(Math.random() * DAD_LINES.length)]);
      if (st.level % 5 === 0) { addBlock({ kind: 'mega', c: 2 }); banner('Mega block coming!'); }
    }
    hud();
  }
  // Easy mode says the number out loud, so Pearl hears it as she counts the dots.
  function speak(n) {
    try {
      if (!window.speechSynthesis || !audio.sfxOn) return;
      const u = new SpeechSynthesisUtterance(String(n)); u.rate = .9; u.pitch = 1.3; u.volume = .8;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (_) {}
  }
  function cheer(who, text) { say(who, text); fam[who].cheer = 1.6; if (who === 'dad') sfx.cheer(); }

  const shotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2, 2.4) });
  const shotGlow = new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: .4, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 30; i++) { const g = new THREE.Group(); g.add(mesh(G.lowSphere, shotMat, .1)); g.add(mesh(G.lowSphere, shotGlow, .19)); g.visible = false; world.add(g); shots.push({ g, life: 0, c: 0, prev: 0 }); }
  const floaters = [];

  /* ---------- state and input ---------- */
  const st = { level: 1, x: 0, tx: 0, vx: 0, ph: 0, firing: false, fireT: 0, spawnT: 1, popped: 0, big: 0, chain: 0, chainT: 0, warnT: 0, shotN: 0, wave: 0 };
  const keys = {};
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  const tmpV = new THREE.Vector3(), tip = new THREE.Vector3();
  function aim(e) {
    const r = e.target.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) st.tx = THREE.MathUtils.clamp(hit.x, -X_LIM, X_LIM);
  }
  const nearestCol = x => THREE.MathUtils.clamp(Math.round(x / CW + (N - 1) / 2), 0, N - 1);
  function shoot() {
    const s = shots.find(s => s.life <= 0); if (!s) return;
    blaster.userData.tip.getWorldPosition(tip);
    // Bubbles always fly straight up the column she's standing under.
    s.c = nearestCol(st.x); s.life = 1.2; s.g.visible = true;
    s.g.position.set(colX(s.c), Math.max(1.2, tip.y), .1); s.prev = s.g.position.y;
    st.shotN++; s.dmg = S.up.bEvery && st.shotN % S.up.bEvery === 0 ? 2 : 1;
    if (st.shotN % 2) sfx.bubbleShot();
  }
  function clearAll() {
    for (const b of blocks) world.remove(b.m); blocks.length = 0;
    for (const s of shots) { s.life = 0; s.g.visible = false; }
    for (const f of floaters) world.remove(f.s); floaters.length = 0;
  }

  return {
    id: 'blocks',
    usesChase: false,
    noFireButton: true,
    items: blocks,
    startBanner: 'Pop the numbers!',
    get hint() { return S.diff.label === 'Easy' ? 'Count the dots! Drag to move, hold to shoot.' : S.diff.label === 'Hard' ? 'Work out the sums! Drag to move, hold to shoot.' : 'Drag to move. Hold your finger down to shoot.'; },
    world, st, shadowLight: sun, shadowSize: 9,
    enter() {
      world.visible = true; scene.background = sky; scene.fog = fog;
      setMermaid(P, false); P.root.rotation.set(0, 0, 0); P.shadow.visible = true;
      P.arms[1].add(blaster);
      // A little bigger here, so she is easy to see under the falling blocks.
      P.root.scale.setScalar(1.25);
    },
    exit() { world.visible = false; clearAll(); P.arms[1].remove(blaster); P.root.scale.setScalar(1); },
    start() {
      clearAll();
      Object.assign(st, { level: 1, x: 0, tx: 0, vx: 0, firing: false, fireT: 0, spawnT: 1, popped: 0, big: 0, chain: 0, chainT: 0, warnT: 0, shotN: 0 });
      for (let i = 0; i < 3; i++) { const b = addBlock(); b.c = i * 2 + 1; b.y = SPAWN_Y + i * 1.6; b.m.position.x = colX(b.c); }
      setTimeout(() => { if (S.mode === 'play') say('mum', 'Mind the pile, Pearl!'); }, 1200);
    },
    scoreText() { return `${S.pearls} pearls · Level ${st.level}`; },
    finish(bank) {
      const best = store.get('pw_bbest', 0), rec = st.popped > best; if (rec) store.set('pw_bbest', st.popped);
      return {
        eyebrow: rec && best ? 'New best!' : 'The toys piled up',
        title: 'Tidy up time, Pearl!',
        text: `Pearl popped ${st.popped} blocks and reached level ${st.level}. Biggest block: ${st.big}. Piggy bank: ${bank} pearls.`,
      };
    },
    update(dt) {
      const playing = S.mode === 'play';
      // Pearl walks along the roof under the canopy.
      if (playing) {
        const kx = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
        if (kx) st.tx = THREE.MathUtils.clamp(st.x + kx * 1.2, -X_LIM, X_LIM);
      } else st.tx = 0;
      const ox = st.x; st.x = damp(st.x, st.tx, 9, dt);
      st.vx = damp(st.vx, (st.x - ox) / Math.max(dt, .001), 10, dt);
      const moving = Math.abs(st.vx) > .4;
      st.ph += dt * (moving ? 10 : 2);
      st.wave = damp(st.wave, playing ? 0 : 1, 5, dt);
      posePearl(P, { ph: st.ph, stage: 1, idle: !moving, turn: .82, t: S.t, wave: st.wave });
      // Blaster arm held up, pointing at the sky (the arm hangs down, so ~180 degrees).
      if (playing) { P.arms[1].rotation.set(0, 0, 3.05 + (st.fireT > .06 ? .08 : 0)); P.torso.rotation.z = 0; }
      blaster.visible = playing || S.mode === 'over';
      P.root.position.set(st.x, 0, .55);
      P.root.rotation.y = THREE.MathUtils.clamp(-st.vx * .05, -.3, .3);

      // Mummy and Daddy stand at the sides while playing, and next to Pearl on the menu.
      for (const [k, f] of Object.entries(fam)) {
        const side = k === 'mum' ? -1 : 1;
        const tx = playing ? f.x : st.x + side * 1.05, tz = playing ? -.6 : .25;
        f.F.root.position.x = damp(f.F.root.position.x, tx, 3, dt); f.F.root.position.z = damp(f.F.root.position.z, tz, 3, dt);
        f.F.root.rotation.y = damp(f.F.root.rotation.y, playing ? -side * .5 : 0, 3, dt);
        f.cheer -= dt;
        posePearl(f.F, { ph: S.t * 2, stage: 1, idle: true, turn: 1, t: S.t + side, wave: f.cheer > 0 || S.mode === 'over' ? 1 : 0 });
        if (f.cheer > 0) f.F.root.position.y = Math.abs(Math.sin(S.t * 8)) * .12; else f.F.root.position.y = 0;
      }

      if (playing) {
        st.fireT -= dt;
        if ((st.firing || keys[' ']) && st.fireT <= 0) { st.fireT = .13 * S.up.bRate; shoot(); }
        st.spawnT -= dt;
        if (st.spawnT <= 0) { addBlock(); st.spawnT = Math.max(1.15, 2.7 - st.level * .12) / (.75 + S.diff.attack * .25); }
        if (st.chainT > 0) st.chainT -= dt;
      }

      // Falling and landing.
      let highest = FLOOR;
      const fall = (.6 + st.level * .055) * S.diff.speed * S.up.bSlow;
      for (const b of blocks) {
        const rest = restY(b);
        // New blocks drift down slowly; a block whose support was popped drops quickly.
        if (b.y > rest + .001) { if (b.landed) { b.landed = false; b.drop = true; } b.y = Math.max(rest, b.y - (b.drop || b.y > TOP + 1 ? 5 : fall) * dt); }
        else { b.y = rest; if (!b.landed) { b.landed = true; b.drop = false; if (playing) sfx.land(); } }
        b.hit -= dt;
        const k = b.hit > 0 ? 1.08 : 1;
        b.m.position.set(colX(b.c) + (b.w - 1) * CW / 2, b.y, 0);
        b.m.scale.set((b.w * CW - (CW - B)) * k, b.h * B * k, B * k);
        b.m.rotation.z = b.landed ? 0 : Math.sin(S.t * 3 + b.wob) * .06;
        if (b.landed) highest = Math.max(highest, b.y + b.h * B / 2);
      }
      // Warn as the pile gets high; tidy up time when it reaches the line.
      topLine.visible = highest > TOP - B * 2.5 && Math.floor(S.t * 4) % 2 === 0;
      if (playing) {
        st.warnT -= dt;
        if (highest > TOP - B * 2 && st.warnT <= 0) { st.warnT = 9; cheer('mum', 'Tidy up o, Pearl! Too many toys!'); sfx.mum(); }
        if (highest >= TOP - .02) { banner('Tidy up time, Pearl!'); endGame(); }
      }

      // Bubbles fly up their column and hit the lowest block in it.
      for (const s of shots) {
        if (s.life <= 0) continue;
        s.life -= dt; s.prev = s.g.position.y; s.g.position.y += 17 * dt;
        let target = null;
        for (const b of blocks) {
          if (s.c < b.c || s.c >= b.c + b.w) continue;
          const bottom = b.y - b.h * B / 2;
          if (s.g.position.y >= bottom && s.prev <= b.y + b.h * B / 2 && (!target || b.y < target.y)) target = b;
        }
        if (target) {
          s.life = 0; target.hit = .08; target.n -= s.dmg; sfx.zHit();
          if (target.n <= 0) popBlock(target); else setFace(target);
        }
        if (s.g.position.y > SPAWN_Y + 2) s.life = 0;
        if (s.life <= 0) s.g.visible = false;
      }
      for (let i = floaters.length - 1; i >= 0; i--) { const f = floaters[i]; f.life -= dt; f.s.position.y += dt * 1.2; f.s.material.opacity = Math.min(1, f.life * 2); if (f.life <= 0) { world.remove(f.s); floaters.splice(i, 1); } }
    },
    fire() {}, fireHit() { return false; },
    bubbleY: .55,
    // e: 0 = in front of Pearl on the menu (her face shows above the menu card), 1 = the whole board.
    placeCamera(cam, e, wide, frontV, behindV, look) {
      // Far enough back to fit the board's width (portrait) or its height (landscape).
      const tv = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), th = tv * cam.aspect;
      const d = Math.max(4.15 / th, (TOP + 1.8) / 2 / tv) + .6;
      // Keep the bottom of the view just below the roof, so Pearl sits near the bottom.
      const cy = Math.max((TOP + .4) / 2, -1.3 + (d - .6) * tv);
      frontV.set(st.x * .3 + (wide ? 1.6 : 0), 1.6, wide ? 6.2 : 6.4);
      behindV.set(0, cy, d);
      cam.position.lerpVectors(frontV, behindV, e);
      look.set(lerp(st.x * .3 + (wide ? 3 : 0), 0, e), lerp(wide ? 1 : -.9, cy, e), 0);
      cam.lookAt(look);
    },
    pointerDown(e) { aim(e); st.firing = true; },
    pointerMove(e) { if (e.buttons || e.pointerType === 'touch') aim(e); },
    pointerUp() { st.firing = false; },
    keyDown(e) { if (e.key.startsWith('Arrow') || e.key === ' ') { e.preventDefault(); keys[e.key] = true; } },
    keyUp(e) { keys[e.key] = false; },
  };
}
