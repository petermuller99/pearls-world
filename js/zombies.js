// Zombie Defence: a first-person shooter on the porch of Pearl's family home in Lagos at dusk.
// Silly cartoon zombies shuffle through the gate wanting to eat Pearl; the family pops them
// into confetti. Drag to look around, tap or hold to shoot, switch between Pearl (bubble
// blaster), Mummy (slipper toss) and Daddy (fireball cannon). Whoever isn't being played
// keeps defending on their own. Between and during waves, plant Lagos defenders in the
// yard with naira (₦) earned from popping zombies, lane tower-defence style. Zombies come
// through the front gate and both side gates, and munch on defenders in their way.
import { THREE, M, G, mesh, tex, gradientTex, rand, lerp, damp, posePearl, setMermaid, textSprite, store, outlined } from './common.js';
import { sfx } from './audio.js';
import { makeMumFigure } from './chase.js';
import { makeDaddyFigure } from './daddy.js';

const PORCH_Z = -1.7, DOOR_Z = -2.9, GATE_Z = -14, SIDE_X = 14, SIDE_Z = -7;
const WHO = {
  pearl: { name: 'Pearl', weapon: 'Bubble blaster', x: 0, eye: 1.05, rate: .17, dmg: 1, speed: 28, shot: 'bubble' },
  mum: { name: 'Mummy', weapon: 'Slipper toss', x: -2.3, eye: 1.85, rate: .42, dmg: 3, speed: 24, shot: 'slipper' },
  dad: { name: 'Daddy', weapon: 'Fireball cannon', x: 2.3, eye: 2, rate: .8, dmg: 6, speed: 22, shot: 'fire', splash: 1.8 },
};
const TYPES = {
  walker: { hp: 4, speed: 1.15, scale: 1, dmg: 4, pearls: 1 },
  runner: { hp: 2, speed: 2.3, scale: .8, dmg: 3, pearls: 1 },
  big: { hp: 14, speed: .75, scale: 1.6, dmg: 9, pearls: 4 },
  okada: { hp: 6, speed: 3.2, scale: 1, dmg: 6, pearls: 3 },
  helmet: { hp: 9, speed: 1, scale: 1.05, dmg: 5, pearls: 2 },
};
const CASH = { walker: 10, runner: 8, big: 30, okada: 20, helmet: 15 };
// Defenders you plant in the yard with naira. `range` in metres, `rate` in seconds.
export const DEFS = {
  pepper: { icon: '🌶️', name: 'Pepper Shooter', cost: 125, hp: 12, range: 13, rate: 1.3, dmg: 1.5, shot: 'pepper', speed: 20 },
  mango: { icon: '🥭', name: 'Mango Lobber', cost: 175, hp: 12, range: 17, rate: 3, dmg: 3, shot: 'mango', speed: 13, splash: 2.2, arc: true },
  water: { icon: '💧', name: 'Pure Water Sprinkler', cost: 100, hp: 10, range: 4 },
  block: { icon: '🧱', name: 'Cement Block', cost: 50, hp: 45 },
  banger: { icon: '🧨', name: 'Banger', cost: 50, hp: 1, range: 1.2, blast: 3, dmg: 25 },
  stall: { icon: '🍲', name: 'Mama Put Stall', cost: 75, hp: 8, rate: 10, earn: 25 },
};
const SAYINGS = ['Yummy Pearl!', 'Pearl! Pearl!', 'Braaains... no, PEARLS!', 'Open the door o!', 'I smell jollof!'];

export function createZombies({ scene, P, confetti, S, banner, hud, levelUp, camera, endGame }) {
  const world = new THREE.Group(); world.visible = false; scene.add(world);
  const sky = gradientTex([[0, '#2a1d5c'], [.45, '#7a3f78'], [.75, '#ff8a5c'], [1, '#ffc58a']]);
  const fog = new THREE.Fog(0x7a4a78, 25, 95);

  /* ---------- lights: moonlight casts the shadows, warm porch light ---------- */
  world.add(new THREE.HemisphereLight(0xb8b0ff, 0x3a2a40, 1.25));
  const moonLight = new THREE.DirectionalLight(0xd8deff, 1.5);
  moonLight.position.set(-8, 18, -16); moonLight.target.position.set(0, 0, -6);
  world.add(moonLight, moonLight.target);
  const porchLight = new THREE.PointLight(0xffb060, 18, 14, 1.6); porchLight.position.set(0, 3.2, -1); world.add(porchLight);
  const lampLight = new THREE.PointLight(0xffd080, 14, 16, 1.6); lampLight.position.set(0, 5.2, -21); world.add(lampLight);

  /* ---------- materials ---------- */
  const glow = c => new THREE.MeshBasicMaterial({ color: c, fog: false });
  const Z = {
    ground: new THREE.MeshLambertMaterial({ map: tex(128, 128, (c, w, h) => { c.fillStyle = '#c9a77c'; c.fillRect(0, 0, w, h); c.fillStyle = '#b8966b'; for (let i = 0; i < 260; i++) c.fillRect(rand(0, w), rand(0, h), 3, 3); }, true) }),
    tiles: new THREE.MeshLambertMaterial({ map: tex(128, 128, (c, w, h) => { c.fillStyle = '#e8d8c0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c9b496'; c.lineWidth = 3; for (let i = 0; i <= w; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } }, true) }),
    road: new THREE.MeshLambertMaterial({ color: 0x3d3445 }),
    wall: new THREE.MeshLambertMaterial({ color: 0xf2e6d0 }),
    wallTop: new THREE.MeshLambertMaterial({ color: 0x3aa655 }),
    roof: new THREE.MeshLambertMaterial({ color: 0x9a3b2a }),
    door: new THREE.MeshLambertMaterial({ color: 0x7a4a2c }),
    metal: new THREE.MeshLambertMaterial({ color: 0x2a2433 }),
    window: glow(new THREE.Color(2.2, 1.6, .8)),
    lamp: glow(new THREE.Color(2.6, 2.1, 1.2)),
    moon: glow(new THREE.Color(2.2, 2.2, 2)),
    leaf: new THREE.MeshLambertMaterial({ color: 0x2f7a4a }),
    trunk: new THREE.MeshLambertMaterial({ color: 0x6b4226 }),
    mango: new THREE.MeshLambertMaterial({ color: 0xffb020 }),
    gen: new THREE.MeshLambertMaterial({ color: 0xe8333a }),
    chair: new THREE.MeshLambertMaterial({ color: 0x2f6fd6 }),
    zskin: new THREE.MeshLambertMaterial({ color: 0xa6e07a, emissive: 0x2a5a10, emissiveIntensity: .6 }),
    zskin2: new THREE.MeshLambertMaterial({ color: 0x8fdcb0, emissive: 0x1a4a30, emissiveIntensity: .6 }),
    zpants: new THREE.MeshLambertMaterial({ color: 0x4a4560 }),
    zhair: new THREE.MeshLambertMaterial({ color: 0x3a2e2a }),
    zmouth: new THREE.MeshBasicMaterial({ color: 0x5a1a2a }),
    hpBack: new THREE.MeshBasicMaterial({ color: 0x24163d, depthTest: false, transparent: true, opacity: .7 }),
    hpFill: new THREE.MeshBasicMaterial({ color: 0x7fe38a, depthTest: false }),
    bike: new THREE.MeshLambertMaterial({ color: 0xd8323a }),
    helmet: new THREE.MeshLambertMaterial({ color: 0xffc93c }),
    cement: new THREE.MeshLambertMaterial({ color: 0xb8b2aa }),
    pot: new THREE.MeshLambertMaterial({ color: 0x9a5a3a }),
    sachet: new THREE.MeshLambertMaterial({ color: 0xe8f6ff, transparent: true, opacity: .75 }),
    blue: new THREE.MeshLambertMaterial({ color: 0x2f6fd6 }),
    umbrella: new THREE.MeshLambertMaterial({ color: 0xff6b4a, side: THREE.DoubleSide }),
    grid: new THREE.MeshBasicMaterial({ transparent: true, opacity: .55, depthWrite: false }),
  };
  const shirts = ['#ff6b4a', '#ffc93c', '#0f8a8f', '#6b4fc9', '#ff5c8a'].map(col => new THREE.MeshLambertMaterial({ map: tex(64, 64, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 6; i++) c.fillRect(rand(0, w), rand(0, h), rand(4, 12), rand(3, 8));
    c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(0, h - 10, w, 4);
  }) }));
  outlined(Z.zskin, Z.zskin2, Z.zpants, Z.zhair, Z.bike, ...shirts);

  /* ---------- the compound, the house and the street ---------- */
  const ground = mesh(G.box, Z.ground, 90, .1, 90); ground.position.set(0, -.05, -25); ground.receiveShadow = true; ground.userData.noShadow = true; Z.ground.map.repeat.set(18, 18); world.add(ground);
  const porch = mesh(G.box, Z.tiles, 9, .2, 3.4); porch.position.set(0, .1, -1.3); porch.receiveShadow = true; porch.userData.noShadow = true; Z.tiles.map.repeat.set(4, 1.5); world.add(porch);
  const road = mesh(G.box, Z.road, 90, .02, 7); road.position.set(0, .02, -21); road.receiveShadow = true; road.userData.noShadow = true; world.add(road);
  // House: cream bungalow with a red roof, glowing windows and a wooden door, behind the porch.
  const house = new THREE.Group(); world.add(house);
  const body = mesh(G.box, Z.wall, 14, 4, 8); body.position.set(0, 2, 4.4); house.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(10.2, 3.2, 4), Z.roof); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, .62); roof.position.set(0, 5.6, 4.4); house.add(roof);
  const door = mesh(G.box, Z.door, 1.5, 2.6, .15); door.position.set(0, 1.3, .35); house.add(door);
  for (const x of [-4.5, 4.5]) { const w = mesh(G.box, Z.window, 2, 1.4, .1); w.position.set(x, 2.2, .36); house.add(w); const f = mesh(G.box, Z.metal, 2.2, .12, .14); f.position.set(x, 2.2, .37); house.add(f); }
  for (const x of [-4, 4]) { const p = mesh(G.cyl, Z.wall, .18, 3.4, .18); p.position.set(x, 1.7, -2.6); house.add(p); }
  const canopy = mesh(G.box, Z.roof, 9.4, .25, 3.6); canopy.position.set(0, 3.45, -1.2); house.add(canopy);
  const bulb = mesh(G.sphere, Z.lamp, .16); bulb.position.set(0, 3.2, -.2); house.add(bulb);
  // Compound wall: a gate in the front and a side gate on each side.
  const wallPiece = (w, d, x, z) => {
    const m = mesh(G.box, Z.wall, w, 2.2, d); m.position.set(x, 1.1, z); world.add(m);
    const t = mesh(G.box, Z.wallTop, w + .2, .2, d + .1); t.position.set(x, 2.25, z); world.add(t);
  };
  for (const s of [-1, 1]) {
    wallPiece(11.4, .4, s * 8.3, GATE_Z);
    wallPiece(.4, 5.5, s * SIDE_X, -11.25); wallPiece(.4, 7.5, s * SIDE_X, -1.75);
    for (const z of [-8.5, -5.5]) { const sp = mesh(G.box, Z.wall, .8, 2.8, .8); sp.position.set(s * SIDE_X, 1.4, z); world.add(sp); }
    const sl = mesh(G.sphere, Z.lamp, .2); sl.position.set(s * SIDE_X, 3, -8.5); world.add(sl);
    const pillar = mesh(G.box, Z.wall, .8, 2.8, .8); pillar.position.set(s * 2.6, 1.4, GATE_Z); world.add(pillar);
    const gate = mesh(G.box, Z.metal, 2.2, 2, .1); gate.position.set(s * 3.5, 1.1, GATE_Z - 1); gate.rotation.y = s * -1.1; world.add(gate);
    const lampG = mesh(G.sphere, Z.lamp, .22); lampG.position.set(s * 2.6, 3, GATE_Z); world.add(lampG);
  }
  // Mango tree, generator and plastic chairs in the yard.
  const tree = new THREE.Group(); tree.position.set(-7.5, 0, -7); world.add(tree);
  const trunk = mesh(G.cyl, Z.trunk, .35, 3.2, .35); trunk.position.y = 1.6; tree.add(trunk);
  for (const [x, y, z, r] of [[0, 4, 0, 2.2], [1.3, 3.6, .6, 1.5], [-1.2, 3.7, -.4, 1.6], [.2, 4.9, -.3, 1.4]]) { const l = mesh(G.lowSphere, Z.leaf, r); l.position.set(x, y, z); tree.add(l); }
  for (let i = 0; i < 7; i++) { const m = mesh(G.lowSphere, Z.mango, .17, .22, .17); m.position.set(rand(-1.6, 1.6), rand(2.8, 4), rand(.6, 1.6)); tree.add(m); }
  const gen = mesh(G.box, Z.gen, 1.2, .8, .8); gen.position.set(6.5, .4, -1.8); world.add(gen);
  for (const [x, z] of [[-6, -2.2], [-5.1, -2.5]]) {
    const c = new THREE.Group(); c.position.set(x, 0, z); world.add(c);
    const seat = mesh(G.box, Z.chair, .6, .08, .6); seat.position.y = .45; c.add(seat);
    const back = mesh(G.box, Z.chair, .6, .6, .08); back.position.set(0, .75, .28); c.add(back);
    for (const [lx, lz] of [[-.25, -.25], [.25, -.25], [-.25, .25], [.25, .25]]) { const l = mesh(G.box, Z.chair, .05, .45, .05); l.position.set(lx, .22, lz); c.add(l); }
  }
  // Street: lamps, a parked danfo, neighbours' houses with lit windows, palms.
  for (const x of [-14, 0, 14]) {
    const pole = mesh(G.cyl, Z.metal, .08, 5, .08); pole.position.set(x, 2.5, -24.5); world.add(pole);
    const arm = mesh(G.box, Z.metal, 1.2, .08, .08); arm.position.set(x + .6, 5, -24.5); world.add(arm);
    const b = mesh(G.sphere, Z.lamp, .25); b.position.set(x + 1.1, 4.9, -24.5); world.add(b);
  }
  const danfo = new THREE.Group(); danfo.position.set(-9, 0, -20); danfo.rotation.y = Math.PI / 2; world.add(danfo);
  const dBody = mesh(G.box, new THREE.MeshLambertMaterial({ color: 0xffc93c }), 1.6, 1.4, 3.8); dBody.position.y = 1; danfo.add(dBody);
  const dStripe = mesh(G.box, Z.metal, 1.62, .15, 3.82); dStripe.position.y = .7; danfo.add(dStripe);
  for (const x of [-.8, .8]) for (const z of [-1.2, 1.2]) { const w = new THREE.Mesh(G.cyl, Z.metal); w.scale.set(.33, .2, .33); w.rotation.z = Math.PI / 2; w.position.set(x, .33, z); danfo.add(w); }
  const HOUSE_COLS = [0x8a6a9a, 0x6a7aa0, 0x9a6a6a, 0x7a8a6a];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group(); g.position.set(-32 + i * 8 + rand(-1, 1), 0, -34 - rand(0, 6)); world.add(g);
    const h = rand(3.5, 7), b2 = mesh(G.box, new THREE.MeshLambertMaterial({ color: HOUSE_COLS[i % 4] }), 6.5, h, 5); b2.position.y = h / 2; g.add(b2);
    for (let k = 0; k < 2; k++) if (Math.random() < .7) { const w = mesh(G.box, Z.window, .9, .7, .1); w.position.set(-1.5 + k * 3, h * .6, 2.55); g.add(w); }
  }
  for (const [x, z] of [[11, -9], [-12, -28], [16, -30]]) {
    const p = new THREE.Group(); p.position.set(x, 0, z); world.add(p);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.18, .28, 7, 8), Z.trunk); t.position.y = 3.5; t.rotation.z = .08; p.add(t);
    const leafGeo = new THREE.PlaneGeometry(3, .7); leafGeo.translate(1.5, 0, 0);
    for (let k = 0; k < 7; k++) { const l = new THREE.Mesh(leafGeo, new THREE.MeshLambertMaterial({ color: 0x2a6a44, side: THREE.DoubleSide })); l.position.y = 7; l.rotation.set(0, k / 7 * Math.PI * 2, -.45); p.add(l); }
  }
  const moon = mesh(G.sphere, Z.moon, 4); moon.position.set(-30, 40, -90); moon.userData.noShadow = true; world.add(moon);
  const starGeo = new THREE.BufferGeometry(), starPts = [];
  for (let i = 0; i < 260; i++) { const a = rand(-1.3, 1.3), e = rand(.25, 1.2), r = 150; starPts.push(Math.sin(a) * Math.cos(e) * r, Math.sin(e) * r, -Math.cos(a) * Math.cos(e) * r); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPts, 3));
  world.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: .9, fog: false })));

  /* ---------- the family on the porch ---------- */
  const mumF = makeMumFigure(), dadF = makeDaddyFigure();
  world.add(mumF.root, dadF.root);
  const FIG = { pearl: P, mum: mumF, dad: dadF };

  /* ---------- zombies ---------- */
  // A light model (a dozen meshes) so a whole crowd stays smooth on phones.
  const capsule = (r, l) => { const g = new THREE.CapsuleGeometry(r, l, 4, 10); g.translate(0, -l / 2 - r / 2, 0); return g; };
  const ARM = capsule(.08, .42), LEG = capsule(.1, .38), BODY = new THREE.CapsuleGeometry(.3, .45, 4, 12);
  function makeZombie(type) {
    const T = TYPES[type], g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
    const skin = Math.random() < .5 ? Z.zskin : Z.zskin2, shirt = shirts[Math.floor(Math.random() * shirts.length)];
    const hips = new THREE.Group(); hips.position.y = .62; inner.add(hips);
    const torso = new THREE.Group(); hips.add(torso);
    const b = new THREE.Mesh(BODY, shirt); b.position.y = .32; torso.add(b);
    const head = new THREE.Group(); head.position.y = 1.02; torso.add(head);
    head.add(mesh(G.sphere, skin, .32));
    // Goofy mismatched eyes and a wide-open mouth.
    const [ea, eb] = [rand(.07, .1), rand(.05, .08)];
    for (const [sx, r] of [[-1, ea], [1, eb]]) {
      const w = mesh(G.sphere, M.white, r); w.position.set(sx * .12, .06, .27); head.add(w);
      const pu = mesh(G.sphere, M.eye, r * .45); pu.position.set(sx * .12 + rand(-.02, .02), .06 + rand(-.02, .02), .27 + r * .8); head.add(pu);
    }
    const mouth = mesh(G.sphere, Z.zmouth, .1, .07, .04); mouth.position.set(0, -.12, .28); head.add(mouth);
    for (let k = 0; k < 4; k++) { const h = mesh(G.lowSphere, Z.zhair, .1); h.position.set(rand(-.15, .15), .27, rand(-.15, .05)); head.add(h); }
    const arms = [-1, 1].map(sx => { const a = new THREE.Group(); a.position.set(sx * .3, .62, 0); a.add(new THREE.Mesh(ARM, skin)); torso.add(a); return a; });
    const legs = [-1, 1].map(sx => { const l = new THREE.Group(); l.position.set(sx * .13, 0, 0); l.add(new THREE.Mesh(LEG, Z.zpants)); hips.add(l); return l; });
    if (type === 'helmet') {
      // An okada rider's yellow helmet: extra toughness.
      const hel = new THREE.Mesh(new THREE.SphereGeometry(.35, 16, 8, 0, Math.PI * 2, 0, Math.PI * .5), Z.helmet); hel.position.y = .02; head.add(hel);
      const visor = mesh(G.box, Z.metal, .5, .06, .1); visor.position.set(0, .05, .3); head.add(visor);
    }
    let bike = null;
    if (type === 'okada') {
      // An okada: a little red motorbike.
      bike = new THREE.Group(); g.add(bike);
      const frame = mesh(G.box, Z.bike, .35, .4, 1.5); frame.position.y = .55; bike.add(frame);
      for (const z of [-.7, .7]) { const w = new THREE.Mesh(G.cyl, Z.metal); w.scale.set(.32, .14, .32); w.rotation.z = Math.PI / 2; w.position.set(0, .32, z); bike.add(w); }
      const bar = mesh(G.box, Z.metal, .7, .06, .06); bar.position.set(0, 1.05, .6); bike.add(bar);
      hips.position.set(0, .82, -.1);
    }
    const hp = new THREE.Group(); hp.position.y = 1.85; g.add(hp);
    const back = mesh(G.box, Z.hpBack, .7, .09, .01); back.renderOrder = 5; hp.add(back);
    const fill = mesh(G.box, Z.hpFill, .66, .06, .012); fill.renderOrder = 6; hp.add(fill);
    hp.visible = false;
    g.scale.setScalar(T.scale);
    world.add(g);
    return { type, T, g, inner, hips, torso, head, arms, legs, bike, hp, fill, hpMax: Math.ceil(T.hp * (1 + Math.max(0, st.wave - 1) * .32)), ph: rand(0, 6), pop: 0, hit: 0, bang: 0, say: null, sayT: 0 };
  }

  /* ---------- shots ---------- */
  const shotMats = {
    bubble: new THREE.MeshLambertMaterial({ color: 0x9fe8ff, transparent: true, opacity: .6, emissive: 0x2a8ab0 }),
    bubbleHi: new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2) }),
    slipper: new THREE.MeshLambertMaterial({ color: 0x2f9e6a }),
    strap: new THREE.MeshLambertMaterial({ color: 0xffc93c }),
    core: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, .6) }),
    glow: new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }),
    pepper: new THREE.MeshLambertMaterial({ color: 0xe8241a, emissive: 0x501008 }),
    stem: new THREE.MeshLambertMaterial({ color: 0x2f9e4a }),
    mango: new THREE.MeshLambertMaterial({ color: 0xffb020, emissive: 0x402000 }),
  };
  function makeShot(kind) {
    const g = new THREE.Group();
    if (kind === 'bubble') { g.add(mesh(G.lowSphere, shotMats.bubble, .14)); const h = mesh(G.lowSphere, shotMats.bubbleHi, .035); h.position.set(-.05, .05, .1); g.add(h); }
    else if (kind === 'slipper') { g.add(mesh(G.box, shotMats.slipper, .22, .05, .5)); const s = new THREE.Mesh(new THREE.TorusGeometry(.09, .025, 6, 12, Math.PI), shotMats.strap); s.rotation.x = -Math.PI / 2; s.position.z = -.08; g.add(s); }
    else if (kind === 'pepper') { const pp = mesh(G.lowSphere, shotMats.pepper, .09, .09, .2); g.add(pp); const st2 = mesh(G.cyl, shotMats.stem, .025, .08, .025); st2.rotation.x = Math.PI / 2; st2.position.z = .2; g.add(st2); }
    else if (kind === 'mango') { g.add(mesh(G.lowSphere, shotMats.mango, .16, .2, .16)); }
    else { g.add(mesh(G.lowSphere, shotMats.core, .16)); g.add(mesh(G.lowSphere, shotMats.glow, .3)); }
    g.traverse(o => { o.userData.noShadow = true; });
    world.add(g); return g;
  }
  const shots = [];
  // W is a shooter (WHO) or a defender (DEFS); mul scales damage (Power shots upgrade).
  function shoot(W, from, to, mul = 1) {
    const g = makeShot(W.shot);
    g.position.copy(from);
    let v;
    if (W.arc) {
      // Lob: a ballistic arc that lands on the target.
      const d = to.clone().sub(from), T = Math.max(.5, Math.hypot(d.x, d.z) / W.speed);
      v = new THREE.Vector3(d.x / T, d.y / T + 4.5 * T, d.z / T);
    } else {
      v = to.clone().sub(from).normalize().multiplyScalar(W.speed);
      if (W.shot === 'slipper') v.y += 2.2;
    }
    shots.push({ g, v, life: W.arc ? 4 : 2.2, W, mul });
    ({ bubble: sfx.bubbleShot, slipper: sfx.slipper, fire: sfx.cannon, pepper: sfx.bubbleShot, mango: sfx.slipper })[W.shot]();
  }

  /* ---------- first-person view: the blaster in your hand ---------- */
  const view = new THREE.Group(); view.visible = false; camera.add(view);
  const viewSkin = new THREE.MeshLambertMaterial({ color: 0x8f6038 });
  const VM = {
    pearl: (() => { const g = new THREE.Group(); const b = mesh(G.cyl, new THREE.MeshLambertMaterial({ color: 0xff5c8a }), .07, .4, .07); b.rotation.x = Math.PI / 2; g.add(b); const globe = mesh(G.sphere, shotMats.bubble, .11); globe.position.set(0, .1, .02); g.add(globe); return g; })(),
    mum: (() => { const g = new THREE.Group(); const s = mesh(G.box, shotMats.slipper, .16, .04, .36); s.rotation.x = -.6; g.add(s); const st2 = new THREE.Mesh(new THREE.TorusGeometry(.07, .02, 6, 12, Math.PI), shotMats.strap); st2.rotation.x = -Math.PI / 2 - .6; st2.position.set(0, .04, -.05); g.add(st2); return g; })(),
    dad: (() => { const g = new THREE.Group(); const b = mesh(G.cyl, new THREE.MeshLambertMaterial({ color: 0x2a2433 }), .1, .55, .1); b.rotation.x = Math.PI / 2; g.add(b); const ring = mesh(G.cyl, new THREE.MeshLambertMaterial({ color: 0xd9b04a }), .115, .06, .115); ring.rotation.x = Math.PI / 2; ring.position.z = -.22; g.add(ring); const tip = mesh(G.sphere, shotMats.core, .06); tip.position.z = -.28; g.add(tip); return g; })(),
  };
  for (const g of Object.values(VM)) { const hand = mesh(G.sphere, viewSkin, .07, .06, .1); hand.position.set(0, -.07, .12); g.add(hand); g.position.set(.28, -.26, -.55); g.traverse(o => { o.userData.noShadow = true; }); view.add(g); }

  /* ---------- state ---------- */
  const st = { cash: 0, placing: null, warnL: 0, warnR: 0, autoT: 0, level: 1, wave: 0, toSpawn: 0, spawnT: 0, breakT: 0, house: 100, kills: 0, who: 'pearl', yaw: 0, pitch: -.05, fireT: 0, helperT: { pearl: 0, mum: .5, dad: 1 }, aim: null, holding: false, recoil: 0, groanT: 3, inside: false };
  const zombies = [];
  const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const eyePos = new THREE.Vector3(), menuPos = new THREE.Vector3(), menuQ = new THREE.Quaternion(), fpsQ = new THREE.Quaternion(), dummy = new THREE.PerspectiveCamera();
  const sayCache = new Map();
  const saySprite = t => { if (!sayCache.has(t)) sayCache.set(t, textSprite(t)); return sayCache.get(t); };

  function clearZombies() { for (const z of zombies) { world.remove(z.g); if (z.say) world.remove(z.say); } zombies.length = 0; for (const s of shots) world.remove(s.g); shots.length = 0; for (const f of floats) world.remove(f.s); floats.length = 0; }
  function startWave() {
    st.wave++; st.level = st.wave;
    st.toSpawn = Math.round((7 + st.wave * 5) * (.7 + S.diff.attack * .3));
    st.spawnT = 1;
    levelUp(st.wave, st.wave === 1 ? 'Wave 1! Here they come!' : `Wave ${st.wave}! More zombies!`);
    hud();
  }
  function pickType() {
    const w = st.wave, r = Math.random();
    if (w >= 4 && r < .14) return 'okada';
    if (w >= 3 && r < .28) return 'big';
    if (w >= 2 && r < .45) return 'helmet';
    if (w >= 2 && r < .62) return 'runner';
    return 'walker';
  }
  // Zombies come through the front gate, and from wave 2 also through the side gates.
  function spawn() {
    const z = makeZombie(pickType());
    const homeX = rand(-3.8, 3.8), r = Math.random(), side = st.wave >= 2 && r < .5 ? (r < .25 ? -1 : 1) : 0;
    if (side) {
      z.g.position.set(side * rand(32, 42), 0, SIDE_Z + rand(-4, 4));
      z.path = [new THREE.Vector3(side * (SIDE_X + 1), 0, SIDE_Z + rand(-.8, .8)), new THREE.Vector3(side * (SIDE_X - 1.5), 0, SIDE_Z), new THREE.Vector3(homeX, 0, DOOR_Z)];
    } else {
      z.g.position.set(rand(-16, 16), 0, rand(-48, -38));
      z.path = [new THREE.Vector3(rand(-1.6, 1.6), 0, GATE_Z - .8), new THREE.Vector3(rand(-1.6, 1.6), 0, GATE_Z + 1), new THREE.Vector3(homeX, 0, DOOR_Z)];
    }
    z.pi = 0; z.side = side;
    zombies.push(z); st.toSpawn--;
  }
  function popZombie(z) {
    z.pop = .001; z.hp.visible = false;
    confetti.burst(tmpV.copy(z.g.position).setY(1.2 * z.T.scale), 30);
    S.pearls += z.T.pearls; st.kills++; st.cash += CASH[z.type]; sfx.zPop(); hud();
  }
  function damage(z, dmg) {
    if (z.pop) return;
    z.life = (z.life ?? z.hpMax) - dmg; z.hit = .15; z.hp.visible = true;
    z.fill.scale.x = Math.max(.01, z.life / z.hpMax); z.fill.position.x = -.33 * (1 - z.fill.scale.x);
    sfx.zHit();
    if (z.life <= 0) popZombie(z);
  }
  // A shooter's eye position in the world.
  function eyeOf(who, out) { const W = WHO[who]; return out.set(W.x, W.eye, PORCH_Z); }
  // Picks the zombie closest to the aim ray, so taps don't have to be pixel-perfect.
  function assist(origin, dir) {
    let best = null, bd = 1e9;
    for (const z of zombies) {
      if (z.pop) continue;
      const c = tmpV2.copy(z.g.position).setY(z.g.position.y + .95 * z.T.scale);
      const t = c.clone().sub(origin).dot(dir); if (t < 0) continue;
      const d = c.clone().sub(origin.clone().addScaledVector(dir, t)).length();
      if (d < .9 * z.T.scale + t * .03 && t < bd) { bd = t; best = c.clone(); }
    }
    return best;
  }
  function fireFrom(who, target) {
    const from = eyeOf(who, new THREE.Vector3());
    if (who === st.who) { from.copy(camera.localToWorld(new THREE.Vector3(.28, -.2, -.8))); st.recoil = 1; }
    else from.y -= .35;
    shoot(WHO[who], from, target, who === st.who ? S.up.zDmg : 1);
  }

  /* ---------- defenders planted in the yard ---------- */
  const defenders = [];
  // Grid kept out in the yard (not right by the porch) so defenders don't block your view.
  const CELL = 2, GX = 6, GZ0 = -12, GZ1 = -6;
  // A grid overlay shows where you can plant while choosing a spot.
  const gridTex = tex(64, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(255,248,240,.9)'; c.lineWidth = 3; c.strokeRect(3, 3, w - 6, h - 6); c.fillStyle = 'rgba(127,227,138,.18)'; c.fillRect(3, 3, w - 6, h - 6); }, true);
  gridTex.repeat.set(GX * 2 + 1, (GZ1 - GZ0) / CELL + 1); Z.grid.map = gridTex;
  const grid = new THREE.Mesh(new THREE.PlaneGeometry((GX * 2 + 1) * CELL, ((GZ1 - GZ0) / CELL + 1) * CELL), Z.grid);
  grid.rotation.x = -Math.PI / 2; grid.position.set(0, .04, (GZ0 + GZ1) / 2); grid.visible = false; grid.userData.noShadow = true; world.add(grid);
  function cellAt(pt) {
    const cx = Math.round(pt.x / CELL), cz = Math.round((pt.z - GZ0) / CELL);
    if (Math.abs(cx) > GX || cz < 0 || pt.z > GZ1 + 1 || cz > (GZ1 - GZ0) / CELL) return null;
    return { x: cx * CELL, z: GZ0 + cz * CELL, key: cx + ',' + cz };
  }
  function makeDefender(kind) {
    const g = new THREE.Group(), top = new THREE.Group(); g.add(top);
    const eyesOn = (y, z) => { for (const sx of [-1, 1]) { const w = mesh(G.sphere, M.white, .07); w.position.set(sx * .1, y, z); top.add(w); const e = mesh(G.sphere, M.eye, .035); e.position.set(sx * .1, y, z + .05); top.add(e); } };
    if (kind === 'pepper') {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(.35, .25, .45, 14), Z.pot); pot.position.y = .22; g.add(pot);
      const stem = mesh(G.cyl, shotMats.stem, .05, .5, .05); stem.position.y = .65; g.add(stem);
      top.position.y = 1.05; const pp = mesh(G.sphere, shotMats.pepper, .26, .26, .42); top.add(pp); eyesOn(.1, .22);
      const cap = mesh(G.sphere, shotMats.stem, .14, .08, .14); cap.position.z = -.38; top.add(cap);
    } else if (kind === 'mango') {
      const trunk = mesh(G.cyl, Z.trunk, .12, 1, .12); trunk.position.y = .5; g.add(trunk);
      top.position.y = 1.3; top.add(mesh(G.lowSphere, Z.leaf, .65, .5, .65)); eyesOn(.05, .58);
      for (let i = 0; i < 4; i++) { const m = mesh(G.lowSphere, Z.mango, .12, .15, .12); m.position.set(Math.cos(i * 1.6) * .5, -.25, Math.sin(i * 1.6) * .5); top.add(m); }
    } else if (kind === 'water') {
      for (let i = 0; i < 4; i++) { const b = mesh(G.box, Z.sachet, .4, .12, .3); b.position.set((i % 2) * .3 - .15, .06 + Math.floor(i / 2) * .13, 0); g.add(b); }
      const pole = mesh(G.cyl, Z.blue, .06, 1, .06); pole.position.y = .6; g.add(pole);
      top.position.y = 1.15; for (let i = 0; i < 3; i++) { const arm = mesh(G.box, Z.blue, .7, .06, .06); arm.rotation.y = i * Math.PI / 3; top.add(arm); }
    } else if (kind === 'block') {
      for (const [x, y] of [[-.42, .25], [.42, .25], [0, .75]]) { const b = mesh(G.box, Z.cement, .82, .48, .7); b.position.set(x, y, 0); g.add(b); }
    } else if (kind === 'banger') {
      const c = mesh(G.cyl, Z.gen, .14, .5, .14); c.position.y = .25; g.add(c);
      const band = mesh(G.cyl, Z.helmet, .15, .08, .15); band.position.y = .3; g.add(band);
      top.position.y = .55; const fuse = mesh(G.cyl, Z.metal, .02, .2, .02); fuse.position.y = .08; fuse.rotation.z = .4; top.add(fuse);
      const spark = mesh(G.sphere, Z.lamp, .05); spark.position.set(.05, .19, 0); top.add(spark);
    } else {
      const table = mesh(G.box, Z.trunk, 1.1, .08, .7); table.position.y = .7; g.add(table);
      for (const [x, z] of [[-.45, -.25], [.45, -.25], [-.45, .25], [.45, .25]]) { const l = mesh(G.box, Z.trunk, .07, .7, .07); l.position.set(x, .35, z); g.add(l); }
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(.22, .18, .25, 12), Z.metal); pot.position.set(-.2, .86, 0); g.add(pot);
      const plate = mesh(G.cyl, Z.mango, .15, .03, .15); plate.position.set(.25, .76, 0); g.add(plate);
      const pole = mesh(G.cyl, Z.metal, .03, 1.2, .03); pole.position.y = 1.3; g.add(pole);
      top.position.y = 1.85; const um = new THREE.Mesh(new THREE.ConeGeometry(.9, .45, 8, 1, true), Z.umbrella); top.add(um);
    }
    const hp = new THREE.Group(); hp.position.y = 1.9; g.add(hp);
    const back = mesh(G.box, Z.hpBack, .7, .09, .01); back.renderOrder = 5; hp.add(back);
    const fill = mesh(G.box, Z.hpFill, .66, .06, .012); fill.renderOrder = 6; hp.add(fill);
    hp.visible = false;
    world.add(g);
    return { g, top, hp, fill };
  }
  function plant(kind, cell, free = false) {
    const D = DEFS[kind];
    if (!cell || defenders.some(d => d.key === cell.key)) return false;
    if (!free) { if (st.cash < D.cost) return false; st.cash -= D.cost; }
    const m = makeDefender(kind);
    m.g.position.set(cell.x, 0, cell.z); m.g.scale.setScalar(.8);
    defenders.push({ kind, D, key: cell.key, x: cell.x, z: cell.z, life: D.hp, t: rand(0, .5), ...m });
    confetti.burst(tmpV.set(cell.x, .8, cell.z), 12); sfx.power();
    return true;
  }
  function removeDefender(d, poof = true) {
    world.remove(d.g); defenders.splice(defenders.indexOf(d), 1);
    if (poof) { confetti.burst(tmpV.set(d.x, .6, d.z), 14); sfx.zHit(); }
  }
  function clearDefenders() { while (defenders.length) removeDefender(defenders[0], false); }
  const floatCache = new Map();
  const floatText = t => { if (!floatCache.has(t)) floatCache.set(t, textSprite(t, { color: '#3aa655' })); return floatCache.get(t); };
  const floats = [];
  function setWho(who) {
    st.who = who;
    for (const [k, g] of Object.entries(VM)) g.visible = k === who;
    const skinCol = who === 'pearl' ? M.skin.color : FIG[who].arms[0].children[0].material.color;
    viewSkin.color.copy(skinCol);
    hud();
  }

  return {
    id: 'zombie',
    usesChase: false,
    noFireButton: true,
    startBanner: 'Protect Pearl!',
    hint: 'Drag to look. Tap a zombie to shoot.',
    world, st, items: zombies, shadowLight: moonLight, shadowSize: 22,
    bubbleY: .55,
    get house() { return st.house; },
    get who() { return st.who; },
    whoInfo: WHO,
    setWho,
    DEFS,
    get cash() { return st.cash; },
    get placing() { return st.placing; },
    get warn() { return [st.warnL, st.warnR]; },
    // Choose a defender to plant (or the same one again to cancel).
    select(kind) { st.placing = st.placing === kind ? null : kind; grid.visible = !!st.placing; hud(); },
    plantAt(kind, x, z) { return plant(kind, cellAt({ x, z })); },
    enter() {
      world.visible = true; scene.background = sky; scene.fog = fog;
      setMermaid(P, false); P.root.rotation.set(0, 0, 0); P.inner.visible = true;
    },
    exit() { world.visible = false; clearZombies(); clearDefenders(); st.placing = null; grid.visible = false; view.visible = false; for (const F of Object.values(FIG)) F.root.visible = true; },
    start() {
      clearZombies();
      clearDefenders();
      Object.assign(st, { level: 1, wave: 0, toSpawn: 0, spawnT: 0, breakT: 5, house: 100, kills: 0, yaw: 0, pitch: -.05, fireT: 0, aim: null, holding: false, recoil: 0, cash: S.up.zCash, placing: null, warned: false, autoT: 0 });
      grid.visible = false;
      // Garden starter upgrade: Pepper Shooters already planted.
      [[-2, -10], [2, -10], [0, -12]].slice(0, S.up.zSeed).forEach(([x, z]) => plant('pepper', cellAt({ x, z }), true));
      setWho(st.who);
    },
    scoreText() { return `₦${st.cash} · Wave ${Math.max(1, st.wave)} · ${st.kills} popped`; },
    finish(bank) {
      const best = store.get('pw_zbest', 0), rec = st.wave > best; if (rec) store.set('pw_zbest', st.wave);
      if (st.house <= 0) return {
        eyebrow: rec ? 'New best wave' : 'The zombies got in!',
        title: 'Everybody hide!',
        text: `The family popped ${st.kills} zombies and held the house until wave ${st.wave}, then hid in Pearl's room. Piggy bank: ${bank} pearls.`,
      };
      return { eyebrow: 'Defence over', title: 'Well done, family!', text: `${st.kills} zombies popped, reached wave ${Math.max(1, st.wave)}. Piggy bank: ${bank} pearls.` };
    },
    update(dt) {
      const playing = S.mode === 'play';
      // Family on the porch: the one you're playing is the camera, the others stand guard.
      for (const [k, F] of Object.entries(FIG)) {
        const W = WHO[k];
        F.root.visible = !(playing && k === st.who);
        F.root.position.set(W.x, 0, PORCH_Z + (S.mode === 'menu' ? .2 : 0));
        const target = F.target;
        if (playing && target && !target.pop) {
          const dx = target.g.position.x - W.x, dz = target.g.position.z - PORCH_Z;
          F.root.rotation.y = damp(F.root.rotation.y, Math.atan2(-dx, -dz), 6, dt);
        } else F.root.rotation.y = damp(F.root.rotation.y, 0, 4, dt);
        posePearl(F, { ph: S.t * 2, stage: 1, idle: true, t: S.t + k.length, wave: playing ? (st.helperT[k] > WHO[k].rate * 2 ? .6 : 1) : S.mode === 'over' ? 1 : 0 });
      }

      if (playing) {
        // Waves
        if (st.breakT > 0) { st.breakT -= dt; if (st.breakT <= 0) startWave(); }
        else if (st.toSpawn > 0) {
          st.spawnT -= dt;
          if (st.spawnT <= 0) { spawn(); st.spawnT = Math.max(.3, 1.7 - st.wave * .15) / (.7 + S.diff.attack * .3); }
        } else if (!zombies.some(z => !z.pop)) { st.breakT = 6; banner(`Wave ${st.wave} cleared! Plant more defenders!`); sfx.milestone(); }

        // You: hold to keep firing at the finger (or straight ahead with the keyboard).
        st.fireT -= dt;
        if (st.holding && st.fireT <= 0) {
          st.fireT = WHO[st.who].rate * S.up.zRate;
          const origin = camera.getWorldPosition(new THREE.Vector3());
          const dir = st.aim ? st.aim.clone() : camera.getWorldDirection(new THREE.Vector3());
          fireFrom(st.who, assist(origin, dir) || origin.clone().addScaledVector(dir, 40));
        }
        // Auto blaster upgrade: fire at the nearest zombie in view when you're not touching.
        st.autoT -= dt;
        if (S.up.zAuto > 0 && !st.holding && st.autoT <= 0) {
          const origin = camera.getWorldPosition(new THREE.Vector3()), fwd = camera.getWorldDirection(new THREE.Vector3());
          let best = null, bd = 40;
          for (const z of zombies) {
            if (z.pop) continue;
            const c = tmpV2.copy(z.g.position).setY(.95 * z.T.scale), d = c.distanceTo(origin);
            if (d < bd && c.clone().sub(origin).normalize().dot(fwd) > .82) { bd = d; best = c.clone(); }
          }
          if (best) { fireFrom(st.who, best); st.autoT = WHO[st.who].rate * S.up.zRate * [0, 2.2, 1.5, 1.05][S.up.zAuto]; }
        }
        // The others defend on their own, a bit slower than you.
        for (const k of Object.keys(WHO)) {
          if (k === st.who) continue;
          st.helperT[k] -= dt;
          let target = null, bd = 1e9;
          for (const z of zombies) { if (z.pop || z.g.position.z < -36) continue; const d = z.g.position.distanceTo(tmpV.set(WHO[k].x, 0, PORCH_Z)); if (d < bd) { bd = d; target = z; } }
          FIG[k].target = target;
          if (target && st.helperT[k] <= 0) {
            // Helpers are slower than you and sometimes miss, so you're the main defender.
            st.helperT[k] = WHO[k].rate * 4.2 * S.up.zFam;
            const aim = target.g.position.clone(); aim.y += .9 * target.T.scale + rand(-.5, .5) * S.up.zAim;
            aim.x += rand(-.6, .6) * S.up.zAim; aim.z += TYPES[target.type].speed * S.diff.speed * .35;
            fireFrom(k, aim);
          }
        }
        st.groanT -= dt;
        if (st.groanT <= 0 && zombies.length) { st.groanT = rand(2.5, 5); sfx.groan(); }
      }

      // Defenders
      for (const d of [...defenders]) {
        const D = d.D;
        d.hp.quaternion.copy(camera.quaternion);
        if (!playing) continue;
        if (D.shot) {
          d.t -= dt;
          let target = null, bd = D.range;
          for (const z of zombies) { if (z.pop) continue; const dist = Math.hypot(z.g.position.x - d.x, z.g.position.z - d.z); if (dist < bd) { bd = dist; target = z; } }
          if (target) {
            d.top.rotation.y = damp(d.top.rotation.y, Math.atan2(target.g.position.x - d.x, target.g.position.z - d.z), 8, dt);
            if (d.t <= 0) {
              d.t = D.rate;
              const aim = target.g.position.clone(); aim.y = .95 * target.T.scale;
              shoot(D, tmpV.set(d.x, 1.1, d.z).clone(), aim);
              d.top.scale.set(1.15, .85, 1.15);
            }
          }
          d.top.scale.lerp(tmpV2.set(1, 1, 1), Math.min(1, dt * 8));
        } else if (d.kind === 'water') {
          d.top.rotation.y += dt * 6;
          for (const z of zombies) if (!z.pop && Math.hypot(z.g.position.x - d.x, z.g.position.z - d.z) < D.range) z.slowT = .3;
          if (Math.random() < dt * 6) confetti.burst(tmpV.set(d.x + rand(-1, 1), 1.1, d.z + rand(-1, 1)), 1, 4);
        } else if (d.kind === 'stall') {
          d.t -= dt;
          if (d.t <= 0) {
            d.t = D.rate; st.cash += D.earn; sfx.pearl(); hud();
            const sp = floatText(`+₦${D.earn}`).clone(); sp.position.set(d.x, 2.2, d.z); world.add(sp); floats.push({ s: sp, t: 1.2 });
          }
        } else if (d.kind === 'banger') {
          d.top.rotation.y += dt * 10;
          const near = zombies.find(z => !z.pop && Math.hypot(z.g.position.x - d.x, z.g.position.z - d.z) < D.range);
          if (near) {
            for (const z of zombies) if (!z.pop && Math.hypot(z.g.position.x - d.x, z.g.position.z - d.z) < D.blast) damage(z, D.dmg);
            confetti.burst(tmpV.set(d.x, .8, d.z), 50); sfx.cannon(); removeDefender(d, false);
          }
        }
      }
      for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.t -= dt; f.s.position.y += dt; if (f.t <= 0) { world.remove(f.s); floats.splice(i, 1); } }

      // Shots
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.life -= dt;
        if (s.W.shot === 'slipper') { s.v.y -= 6 * dt; s.g.rotation.x += dt * 14; }
        else if (s.W.arc) { s.v.y -= 9 * dt; s.g.rotation.x += dt * 6; }
        else if (s.W.shot === 'pepper') s.g.lookAt(tmpV.copy(s.g.position).add(s.v));
        s.g.position.addScaledVector(s.v, dt);
        let hitZ = null;
        for (const z of zombies) {
          if (z.pop) continue;
          const c = tmpV.copy(z.g.position).setY(z.g.position.y + .95 * z.T.scale);
          if (c.distanceTo(s.g.position) < .55 * z.T.scale + .15) { hitZ = z; break; }
        }
        if (hitZ) {
          damage(hitZ, s.W.dmg * s.mul);
          hitZ.g.position.z -= .25 / hitZ.T.scale;
          if (s.W.splash) for (const z of zombies) if (z !== hitZ && !z.pop && z.g.position.distanceTo(hitZ.g.position) < s.W.splash) damage(z, s.W.dmg * s.mul * .5);
          confetti.burst(s.g.position, s.W.shot === 'fire' ? 14 : 5);
        }
        // Mangoes splash where they land even if they miss.
        if (!hitZ && s.W.arc && s.g.position.y < .1) { for (const z of zombies) if (!z.pop && z.g.position.distanceTo(s.g.position) < s.W.splash) damage(z, s.W.dmg * .6); confetti.burst(s.g.position, 8); }
        if (hitZ || s.life <= 0 || s.g.position.y < 0) { world.remove(s.g); shots.splice(i, 1); }
      }

      // Zombies: through the gate, up to the porch, then bang on the door.
      for (let i = zombies.length - 1; i >= 0; i--) {
        const z = zombies[i], p = z.g.position;
        if (z.pop) {
          z.pop += dt; z.g.scale.setScalar(z.T.scale * (1 + z.pop * 3)); z.g.rotation.y += dt * 12;
          if (z.pop > .22) { world.remove(z.g); if (z.say) world.remove(z.say); zombies.splice(i, 1); }
          continue;
        }
        z.ph += dt * 5 * (z.type === 'runner' ? 1.8 : 1);
        if (z.slowT > 0) z.slowT -= dt;
        const speed = z.T.speed * S.diff.speed * (1 + st.wave * .09) * (playing ? 1 : 0) * (z.slowT > 0 ? .5 : 1);
        // Follow the path: through a gate, into the yard, up to the door.
        let tgt = z.path[z.pi];
        if (z.pi < z.path.length - 1 && Math.hypot(tgt.x - p.x, tgt.z - p.z) < .5) tgt = z.path[++z.pi];
        const dx = tgt.x - p.x, dz = tgt.z - p.z, d = Math.hypot(dx, dz);
        // A defender in the way gets munched until it breaks.
        const block = playing && defenders.find(df => df.kind !== 'banger' && Math.hypot(df.x - p.x, df.z - p.z) < .95 + z.T.scale * .2 && ((df.x - p.x) * dx + (df.z - p.z) * dz) > 0);
        if (block) {
          z.bang = Math.max(z.bang - dt, 0);
          block.life -= 6 * z.T.scale * dt; block.hp.visible = true;
          block.fill.scale.x = Math.max(.01, block.life / block.D.hp); block.fill.position.x = -.33 * (1 - block.fill.scale.x);
          if (z.bang <= 0) { z.bang = .9; sfx.zHit(); }
          if (block.life <= 0) removeDefender(block);
          z.inner.rotation.y = Math.atan2(block.x - p.x, block.z - p.z);
        } else if (d > .15) {
          p.x += dx / d * speed * dt; p.z += dz / d * speed * dt;
          z.inner.rotation.y = Math.atan2(dx, dz);
        } else if (z.pi === z.path.length - 1) {
          // At the porch: bang on the door, which hurts the house.
          z.bang -= dt;
          if (playing && z.bang <= 0) {
            z.bang = 1.1; st.house = Math.max(0, st.house - z.T.dmg * 1.4 * S.diff.hit); sfx.doorBang(); hud();
            if (st.house <= 0) { banner('Oh no! The zombies got in!'); endGame(); }
            else if (st.house < 30 && !st.warned) { st.warned = true; banner('The door is breaking! Pop them fast!'); }
          }
        }
        // Wobbly zombie walk with arms out.
        const sw = Math.sin(z.ph);
        z.legs.forEach((l, k) => { l.rotation.x = z.bike ? -1.3 : sw * .55 * (k ? -1 : 1); });
        z.arms.forEach((a, k) => { a.rotation.set(-1.45 + Math.sin(z.ph * .5 + k) * .15 - (z.bang > .8 ? .6 : 0), 0, (k ? .1 : -.1)); });
        z.torso.rotation.z = Math.sin(z.ph * .5) * .12; z.head.rotation.z = Math.sin(z.ph * .7) * .2;
        z.inner.position.y = z.bike ? 0 : Math.abs(sw) * .06;
        if (z.hit > 0) { z.hit -= dt; z.inner.scale.set(1.15, .88, 1.15); } else z.inner.scale.set(1, 1, 1);
        z.hp.quaternion.copy(camera.quaternion);
        // Now and then a zombie calls out for Pearl.
        if (playing && !z.say && Math.random() < dt * .08 && p.z > -30) { z.say = saySprite(SAYINGS[Math.floor(Math.random() * SAYINGS.length)]); world.add(z.say); z.sayT = 2; }
        if (z.say) { z.say.position.set(p.x, 2.4 * z.T.scale, p.z); z.sayT -= dt; if (z.sayT <= 0) { world.remove(z.say); z.say = null; } }
      }
      // Warning arrows for zombies sneaking up outside your view.
      if (playing) {
        camera.updateMatrixWorld();
        const inv = camera.matrixWorldInverse, tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect;
        let L = 0, R = 0;
        for (const z of zombies) {
          if (z.pop || z.g.position.distanceTo(tmpV.set(0, 0, PORCH_Z)) > 26) continue;
          const v = tmpV2.copy(z.g.position).setY(1).applyMatrix4(inv);
          if (v.z > 0 || Math.abs(v.x / -v.z) > tanH) { if (v.x < 0) L++; else R++; }
        }
        if (L !== st.warnL || R !== st.warnR) { st.warnL = L; st.warnR = R; hud(); }
      }
      if (st.recoil > 0) st.recoil = Math.max(0, st.recoil - dt * 6);
      view.position.z = st.recoil * .08; view.rotation.x = st.recoil * .15;
      view.visible = playing;
    },
    // e: 0 = third-person view of the family and the house (menu, end card), 1 = first person.
    placeCamera(cam, e, wide) {
      // Portrait: aim low so the family and house sit above the menu card. Landscape: family on the left.
      menuPos.set(wide ? -1 : 0, wide ? 2.4 : 3.2, wide ? -9.5 : -10.5);
      dummy.position.copy(menuPos); dummy.lookAt(wide ? -3.2 : 0, wide ? 1.6 : -4.5, PORCH_Z); menuQ.copy(dummy.quaternion);
      eyeOf(st.who, eyePos);
      fpsQ.setFromEuler(new THREE.Euler(st.pitch, st.yaw, 0, 'YXZ'));
      cam.position.lerpVectors(menuPos, eyePos, e);
      cam.quaternion.slerpQuaternions(menuQ, fpsQ, e);
    },
    fireHit() { return false; },
    fire() {},
    pointerDown(e) {
      if (st.placing) {
        // Planting: tap a spot on the yard grid.
        this._aimAt(e);
        const origin = camera.getWorldPosition(new THREE.Vector3());
        if (st.aim.y < -.01) {
          const t = -origin.y / st.aim.y, pt = origin.clone().addScaledVector(st.aim, t);
          const cell = cellAt(pt), D = DEFS[st.placing];
          if (!cell) banner('Plant inside the yard grid');
          else if (defenders.some(d => d.key === cell.key)) banner('Something is already there');
          else if (st.cash < D.cost) banner(`You need ₦${D.cost} for a ${D.name}`);
          else { plant(st.placing, cell); st.placing = null; grid.visible = false; hud(); }
        }
        this._p = null; return;
      }
      this._p = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch, drag: false, t: performance.now() }; this._aimAt(e); st.holding = true; st.fireT = Math.min(st.fireT, 0); },
    pointerMove(e) {
      const p = this._p; if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (!p.drag && Math.hypot(dx, dy) > 14) { p.drag = true; st.holding = false; }
      if (p.drag) {
        const k = 2.6 / (innerWidth || 400);
        st.yaw = THREE.MathUtils.clamp(p.yaw - dx * k, -1.2, 1.2);
        st.pitch = THREE.MathUtils.clamp(p.pitch - dy * k, -.45, .3);
      } else this._aimAt(e);
    },
    pointerUp() { st.holding = false; this._p = null; },
    _aimAt(e) {
      const r = e.target.getBoundingClientRect();
      ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera); st.aim = ray.ray.direction.clone();
    },
    keyDown(e) {
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'a') { e.preventDefault(); st.yaw = Math.min(1.2, st.yaw + .12); }
      if (k === 'ArrowRight' || k === 'd') { e.preventDefault(); st.yaw = Math.max(-1.2, st.yaw - .12); }
      if (k === 'ArrowUp' || k === 'w') { e.preventDefault(); st.pitch = Math.min(.3, st.pitch + .06); }
      if (k === 'ArrowDown' || k === 's') { e.preventDefault(); st.pitch = Math.max(-.45, st.pitch - .06); }
      if (k === ' ' || k === 'Enter') { e.preventDefault(); st.aim = null; st.holding = true; }
      if (k === '1') setWho('pearl'); if (k === '2') setWho('mum'); if (k === '3') setWho('dad');
    },
    keyUp(e) { if (e.key === ' ' || e.key === 'Enter') st.holding = false; },
  };
}
