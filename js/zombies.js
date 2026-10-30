// Zombie Defence: a first-person shooter on the porch of Pearl's family home in Lagos at dusk.
// Silly cartoon zombies shuffle through the gate wanting to eat Pearl; the family pops them
// into confetti. Drag to look around, tap or hold to shoot, switch between Pearl (bubble
// blaster), Mummy (slipper toss) and Daddy (fireball cannon). Whoever isn't being played
// keeps defending on their own.
import { THREE, M, G, mesh, tex, gradientTex, rand, lerp, damp, posePearl, setMermaid, textSprite, store, outlined } from './common.js';
import { sfx } from './audio.js';
import { makeMumFigure } from './chase.js';
import { makeDaddyFigure } from './daddy.js';

const PORCH_Z = -1.7, DOOR_Z = -2.9, GATE_Z = -14;
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
  // Compound wall with a gate in the middle.
  for (const s of [-1, 1]) {
    const w = mesh(G.box, Z.wall, 20, 2.2, .4); w.position.set(s * 12.5, 1.1, GATE_Z); world.add(w);
    const top = mesh(G.box, Z.wallTop, 20.2, .2, .5); top.position.set(s * 12.5, 2.25, GATE_Z); world.add(top);
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
    return { type, T, g, inner, hips, torso, head, arms, legs, bike, hp, fill, hpMax: Math.ceil(T.hp * (1 + Math.max(0, st.wave - 2) * .15)), ph: rand(0, 6), pop: 0, hit: 0, bang: 0, say: null, sayT: 0 };
  }

  /* ---------- shots ---------- */
  const shotMats = {
    bubble: new THREE.MeshLambertMaterial({ color: 0x9fe8ff, transparent: true, opacity: .6, emissive: 0x2a8ab0 }),
    bubbleHi: new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2) }),
    slipper: new THREE.MeshLambertMaterial({ color: 0x2f9e6a }),
    strap: new THREE.MeshLambertMaterial({ color: 0xffc93c }),
    core: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, .6) }),
    glow: new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }),
  };
  function makeShot(kind) {
    const g = new THREE.Group();
    if (kind === 'bubble') { g.add(mesh(G.lowSphere, shotMats.bubble, .14)); const h = mesh(G.lowSphere, shotMats.bubbleHi, .035); h.position.set(-.05, .05, .1); g.add(h); }
    else if (kind === 'slipper') { g.add(mesh(G.box, shotMats.slipper, .22, .05, .5)); const s = new THREE.Mesh(new THREE.TorusGeometry(.09, .025, 6, 12, Math.PI), shotMats.strap); s.rotation.x = -Math.PI / 2; s.position.z = -.08; g.add(s); }
    else { g.add(mesh(G.lowSphere, shotMats.core, .16)); g.add(mesh(G.lowSphere, shotMats.glow, .3)); }
    g.traverse(o => { o.userData.noShadow = true; });
    world.add(g); return g;
  }
  const shots = [];
  function shoot(who, from, to) {
    const W = WHO[who], g = makeShot(W.shot);
    g.position.copy(from);
    const v = to.clone().sub(from).normalize().multiplyScalar(W.speed);
    if (W.shot === 'slipper') v.y += 2.2;
    shots.push({ g, v, life: 2.2, who, W });
    (W.shot === 'bubble' ? sfx.bubbleShot : W.shot === 'slipper' ? sfx.slipper : sfx.cannon)();
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
  const st = { level: 1, wave: 0, toSpawn: 0, spawnT: 0, breakT: 0, house: 100, kills: 0, who: 'pearl', yaw: 0, pitch: -.05, fireT: 0, helperT: { pearl: 0, mum: .5, dad: 1 }, aim: null, holding: false, recoil: 0, groanT: 3, inside: false };
  const zombies = [];
  const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const eyePos = new THREE.Vector3(), menuPos = new THREE.Vector3(), menuQ = new THREE.Quaternion(), fpsQ = new THREE.Quaternion(), dummy = new THREE.PerspectiveCamera();
  const sayCache = new Map();
  const saySprite = t => { if (!sayCache.has(t)) sayCache.set(t, textSprite(t)); return sayCache.get(t); };

  function clearZombies() { for (const z of zombies) { world.remove(z.g); if (z.say) world.remove(z.say); } zombies.length = 0; for (const s of shots) world.remove(s.g); shots.length = 0; }
  function startWave() {
    st.wave++; st.level = st.wave;
    st.toSpawn = Math.round((5 + st.wave * 4) * (.7 + S.diff.attack * .3));
    st.spawnT = 1;
    levelUp(st.wave, st.wave === 1 ? 'Wave 1! Here they come!' : `Wave ${st.wave}! More zombies!`);
    hud();
  }
  function pickType() {
    const w = st.wave, r = Math.random();
    if (w >= 4 && r < .14) return 'okada';
    if (w >= 3 && r < .3) return 'big';
    if (w >= 2 && r < .55) return 'runner';
    return 'walker';
  }
  function spawn() {
    const z = makeZombie(pickType());
    z.homeX = rand(-3.8, 3.8);
    z.g.position.set(rand(-16, 16), 0, rand(-48, -38));
    zombies.push(z); st.toSpawn--;
  }
  function popZombie(z) {
    z.pop = .001; z.hp.visible = false;
    confetti.burst(tmpV.copy(z.g.position).setY(1.2 * z.T.scale), 30);
    S.pearls += z.T.pearls; st.kills++; sfx.zPop(); hud();
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
    shoot(who, from, target);
  }
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
    enter() {
      world.visible = true; scene.background = sky; scene.fog = fog;
      setMermaid(P, false); P.root.rotation.set(0, 0, 0); P.inner.visible = true;
    },
    exit() { world.visible = false; clearZombies(); view.visible = false; for (const F of Object.values(FIG)) F.root.visible = true; },
    start() {
      clearZombies();
      Object.assign(st, { level: 1, wave: 0, toSpawn: 0, spawnT: 0, breakT: 2.2, house: 100, kills: 0, yaw: 0, pitch: -.05, fireT: 0, aim: null, holding: false, recoil: 0 });
      setWho(st.who);
    },
    scoreText() { return `${S.pearls} pearls · Wave ${Math.max(1, st.wave)} · ${st.kills} popped`; },
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
          if (st.spawnT <= 0) { spawn(); st.spawnT = Math.max(.45, 2.1 - st.wave * .13) / (.7 + S.diff.attack * .3); }
        } else if (!zombies.some(z => !z.pop)) { st.breakT = 3; banner(`Wave ${st.wave} cleared! Well done!`); sfx.milestone(); }

        // You: hold to keep firing at the finger (or straight ahead with the keyboard).
        st.fireT -= dt;
        if (st.holding && st.fireT <= 0) {
          st.fireT = WHO[st.who].rate;
          const origin = camera.getWorldPosition(new THREE.Vector3());
          const dir = st.aim ? st.aim.clone() : camera.getWorldDirection(new THREE.Vector3());
          fireFrom(st.who, assist(origin, dir) || origin.clone().addScaledVector(dir, 40));
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
            st.helperT[k] = WHO[k].rate * 4.2;
            const aim = target.g.position.clone(); aim.y += .9 * target.T.scale + rand(-.5, .5);
            aim.x += rand(-.6, .6); aim.z += TYPES[target.type].speed * S.diff.speed * .35;
            fireFrom(k, aim);
          }
        }
        st.groanT -= dt;
        if (st.groanT <= 0 && zombies.length) { st.groanT = rand(2.5, 5); sfx.groan(); }
      }

      // Shots
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.life -= dt;
        if (s.W.shot === 'slipper') { s.v.y -= 6 * dt; s.g.rotation.x += dt * 14; }
        s.g.position.addScaledVector(s.v, dt);
        let hitZ = null;
        for (const z of zombies) {
          if (z.pop) continue;
          const c = tmpV.copy(z.g.position).setY(z.g.position.y + .95 * z.T.scale);
          if (c.distanceTo(s.g.position) < .55 * z.T.scale + .15) { hitZ = z; break; }
        }
        if (hitZ) {
          damage(hitZ, s.W.dmg);
          hitZ.g.position.z -= .25 / hitZ.T.scale;
          if (s.W.splash) for (const z of zombies) if (z !== hitZ && !z.pop && z.g.position.distanceTo(hitZ.g.position) < s.W.splash) damage(z, s.W.dmg * .5);
          confetti.burst(s.g.position, s.W.shot === 'fire' ? 14 : 5);
        }
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
        const speed = z.T.speed * S.diff.speed * (1 + st.wave * .06) * (playing ? 1 : 0);
        const tx = p.z < GATE_Z - .5 ? THREE.MathUtils.clamp(p.x, -1.8, 1.8) : z.homeX;
        const tz = p.z < GATE_Z - .5 ? GATE_Z : DOOR_Z + z.homeX * 0;
        const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
        if (d > .15) {
          p.x += dx / d * speed * dt; p.z += dz / d * speed * dt;
          z.inner.rotation.y = Math.atan2(dx, dz);
        } else if (p.z >= GATE_Z) {
          // At the porch: bang on the door, which hurts the house.
          z.bang -= dt;
          if (playing && z.bang <= 0) {
            z.bang = 1.1; st.house = Math.max(0, st.house - z.T.dmg * S.diff.hit); sfx.doorBang(); hud();
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
    pointerDown(e) { this._p = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch, drag: false, t: performance.now() }; this._aimAt(e); st.holding = true; st.fireT = Math.min(st.fireT, 0); },
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
