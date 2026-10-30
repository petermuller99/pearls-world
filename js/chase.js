// Shared by both games: Mummy chasing Pearl, power-ups, fireballs and the shield bubble.
import { THREE, M, G, mesh, rand, damp, makePearl, posePearl, setMermaid, getOutfit } from './common.js';
import { sfx } from './audio.js';

// The chase gap: how far ahead of Mummy Pearl is. 0 means caught.
export const GAP_MAX = 10, GAP_START = 6;

/* ---------- Mummy ---------- */
const mumDress = new THREE.MeshLambertMaterial({ map: getOutfit('purple') });
const mumGele = new THREE.MeshLambertMaterial({ map: getOutfit('sun') });

// Mummy: a taller version of Pearl in a long ankara dress and gele.
export function makeMum(parent, { mermaid = false, lines, closeLines, onSay }) {
  const F = makePearl();
  F.root.scale.setScalar(1.3);
  F.root.traverse(o => {
    if (o.material === M.dress) o.material = mumDress;
    if (o.material === M.gele) o.material = mumGele;
  });
  for (const [k, g] of Object.entries(F.hairs)) g.visible = k === 'gele';
  F.cap.visible = false; F.bow.visible = false; F.headband.visible = false;
  F.legs.forEach(l => { l.userData.sock.visible = false; });
  // A long iro-style dress down to her ankles.
  F.dress.scale.set(1.05, 1.9, 1.05); F.dress.position.y = .02;
  if (mermaid) setMermaid(F, true);
  parent.add(F.root);

  let ph = 0, talkT = rand(2, 4);
  const x = { v: 0 }, y = { v: 0 };
  return {
    fig: F,
    reset(px, py, pz) { x.v = px; y.v = py; F.root.position.set(px, py, pz + 3); talkT = rand(2, 4); },
    // mode: 'menu' (standing beside Pearl), 'play' (chasing), 'over' (hugging if caught).
    update(dt, { px, py, pz, gap, mode, caught, t, speed }) {
      let tz, reach = 0, idle = false, wave = 0;
      if (mode === 'menu' || (mode === 'over' && !caught)) {
        x.v = damp(x.v, px + .95, 4, dt); y.v = damp(y.v, py, 4, dt); tz = pz + .7; idle = true; wave = mode === 'menu' ? 0 : 1;
      } else if (mode === 'over') {
        x.v = damp(x.v, px, 6, dt); y.v = damp(y.v, py, 6, dt); tz = pz + .45; reach = 1; idle = true;
      } else {
        // She stays far enough back (and a little to the side, and lower in the water)
        // for the camera to see Pearl over her head, closing in as the gap shrinks.
        const near = THREE.MathUtils.clamp((1.1 - gap) / 1.1, 0, 1);
        x.v = damp(x.v, px + (px > .5 ? .95 : -.95) * (1 - near), 2.2, dt); y.v = damp(y.v, py - (mermaid ? .6 : 0) * (1 - near), 2.2, dt);
        tz = pz + 1.3 + gap * .5;
        reach = THREE.MathUtils.clamp((3 - gap) / 2, 0, 1);
      }
      const zNow = F.root.position.z;
      F.root.position.set(x.v, y.v, mode === 'play' ? tz : damp(zNow, tz, 5, dt));
      ph += dt * (idle ? 1.5 : 1.15 * Math.max(4, speed));
      posePearl(F, { ph, stage: idle ? 1 : 2, swim: mermaid, idle, t, reach, wave });
      F.shadow.position.y = (.015 - y.v) / 1.3; F.shadow.scale.setScalar(.4);

      // Mummy calls out to Pearl every few seconds while chasing (shown by her chase-meter icon).
      if (mode === 'play') {
        talkT -= dt;
        if (talkT <= 0) {
          const pool = gap < 3 ? closeLines : lines;
          onSay(pool[Math.floor(Math.random() * pool.length)]);
          talkT = rand(5, 9); sfx.mum();
        }
      }
    },
  };
}

/* ---------- power-ups ---------- */
export const POWERS = ['fire', 'fire', 'shield', 'magnet'];
const PM = {
  fire: new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff4a00, emissiveIntensity: .8, roughness: .4 }),
  flame: new THREE.MeshBasicMaterial({ color: 0xffd23c }),
  shield: new THREE.MeshLambertMaterial({ color: 0x7fe3ff, transparent: true, opacity: .45, emissive: 0x2a7aa0, emissiveIntensity: .5, depthWrite: false }),
  star: new THREE.MeshBasicMaterial({ color: 0xfff8f0 }),
  magnet: new THREE.MeshLambertMaterial({ color: 0xe8333a }),
  tip: new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: .8, roughness: .3 }),
  ring: new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: .7 }),
};
const starGeo = (() => {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? .07 : .17; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  return new THREE.ExtrudeGeometry(sh, { depth: .04, bevelEnabled: false }).center();
})();
export function makePowerItem(kind) {
  const g = new THREE.Group(), spin = new THREE.Group(); g.add(spin);
  if (kind === 'fire') {
    spin.add(mesh(G.sphere, PM.fire, .22));
    const f = new THREE.Mesh(new THREE.ConeGeometry(.13, .3, 10), PM.flame); f.position.y = .25; spin.add(f);
  } else if (kind === 'shield') {
    spin.add(mesh(G.sphere, PM.shield, .27));
    spin.add(new THREE.Mesh(starGeo, PM.star));
  } else {
    const u = new THREE.Mesh(new THREE.TorusGeometry(.16, .06, 8, 16, Math.PI), PM.magnet); u.rotation.z = Math.PI; spin.add(u);
    for (const s of [-1, 1]) { const tip = mesh(G.cyl, PM.tip, .062, .1, .062); tip.position.set(s * .16, .05, 0); spin.add(tip); }
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.36, .02, 6, 24), PM.ring); g.add(ring);
  g.userData.spin = spin; g.userData.ring = ring;
  return g;
}
export function animatePowerItem(g, t, dt) {
  g.userData.spin.rotation.y += dt * 2.5;
  g.userData.ring.rotation.set(Math.PI / 2 + Math.sin(t * 2) * .3, 0, t);
  g.userData.ring.scale.setScalar(1 + Math.sin(t * 5) * .08);
}

/* ---------- fireballs, shield bubble ---------- */
export function createPowers(scene, P, S, { banner, hud }) {
  const core = new THREE.MeshBasicMaterial({ color: 0xffe066 });
  const glow = new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false });
  const ember = new THREE.MeshBasicMaterial({ color: 0xff9a2a, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false });
  const balls = [], embers = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group(); g.add(mesh(G.lowSphere, core, .14)); g.add(mesh(G.lowSphere, glow, .26));
    g.visible = false; scene.add(g); balls.push({ g, v: new THREE.Vector3(), life: 0 });
  }
  for (let i = 0; i < 40; i++) { const e = mesh(G.lowSphere, ember, .07); e.visible = false; scene.add(e); embers.push({ m: e, life: 0 }); }
  let emberI = 0;

  const bubble = mesh(G.sphere, PM.shield, .78); bubble.visible = false; bubble.renderOrder = 2; P.root.add(bubble);

  return {
    grant(kind) {
      sfx.power();
      if (kind === 'fire') { S.ammo = Math.min(9, S.ammo + 5); banner('Fireballs! Tap 🔥 to throw'); }
      else if (kind === 'shield') { S.shieldT = 12; banner('Shield bubble!'); }
      else { S.magnetT = 9; banner('Pearl magnet!'); }
      hud();
    },
    // Throws a fireball from `from` along `vel`. Returns false when out of fireballs.
    fire(from, vel) {
      if (S.ammo <= 0) return false;
      const b = balls.find(b => b.life <= 0); if (!b) return false;
      S.ammo--; b.life = 1.6; b.g.visible = true; b.g.position.copy(from); b.v.copy(vel);
      sfx.fire(); hud();
      return true;
    },
    // hit(pos) is supplied by the game and returns true when the fireball hit something.
    update(dt, hit, bubbleY = .55) {
      for (const b of balls) {
        if (b.life <= 0) continue;
        b.life -= dt; b.g.position.addScaledVector(b.v, dt);
        b.g.rotation.z += dt * 10; b.g.children[1].scale.setScalar(.26 * (1 + Math.sin(S.t * 30) * .12));
        const e = embers[emberI++ % embers.length]; e.life = .35; e.m.visible = true; e.m.position.copy(b.g.position).add(new THREE.Vector3(rand(-.08, .08), rand(-.08, .08), 0));
        if (hit(b.g.position)) { b.life = 0; sfx.poof(); }
        if (b.life <= 0) b.g.visible = false;
      }
      for (const e of embers) {
        if (e.life <= 0) continue;
        e.life -= dt; e.m.scale.setScalar(Math.max(.01, e.life / .35) * .07); e.m.position.y += dt * .6;
        if (e.life <= 0) e.m.visible = false;
      }
      if (S.shieldT > 0 && S.mode === 'play') S.shieldT -= dt;
      if (S.magnetT > 0 && S.mode === 'play') S.magnetT -= dt;
      bubble.visible = S.shieldT > 0 && S.mode === 'play' && (S.shieldT > 2 || Math.floor(S.shieldT * 8) % 2 === 0);
      bubble.position.y = bubbleY; bubble.scale.setScalar(.78 * (1 + Math.sin(S.t * 4) * .04));
    },
    reset() { for (const b of balls) { b.life = 0; b.g.visible = false; } for (const e of embers) { e.life = 0; e.m.visible = false; } },
  };
}
