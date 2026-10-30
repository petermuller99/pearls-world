// Shared pieces for both 3D games: helpers, textures, materials, Pearl herself, confetti and sound.
import * as THREE from '../vendor/three.module.min.js';
export { THREE };

export const $ = id => document.getElementById(id);
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  remove(k) { try { localStorage.removeItem(k); } catch (e) {} },
};
export const rand = (a, b) => a + Math.random() * (b - a);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
export const COL = { ink: 0x24163d, pearl: 0xfff8f0, coral: 0xff6b4a, lagoon: 0x0f8a8f, sun: 0xffc93c, blush: 0xff5c8a, skin: 0x8a5a3c, hair: 0x2b1a12 };

/* ---------- textures drawn on canvas ---------- */
export function tex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
export function gradientTex(stops) {
  return tex(4, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    stops.forEach(([at, col]) => g.addColorStop(at, col));
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
}
function ankara([base, ring, dot, trim]) {
  return tex(256, 128, (c, w, h) => {
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) for (let x = (y / 32 % 2) * 16; x < w; x += 32) {
      c.fillStyle = ring; c.beginPath(); c.arc(x, y + 16, 10, 0, 7); c.fill();
      c.fillStyle = dot; c.beginPath(); c.arc(x, y + 16, 5, 0, 7); c.fill();
      c.fillStyle = '#fff8f0'; c.beginPath(); c.arc(x, y + 16, 2, 0, 7); c.fill();
    }
    c.fillStyle = trim; c.fillRect(0, h - 10, w, 6);
  }, true);
}

/* ---------- Pearl's look: the choices in the "Pearl's look" menu ---------- */
export const LOOKS = {
  skin: ['#d9a77e', '#c68a5e', '#a86b45', '#8a5a3c', '#6e4630', '#55362a', '#3f281f'],
  hair: [['puffs', 'Two puffs'], ['puff', 'One puff'], ['curls', 'Short curls'], ['gele', 'Gele']],
  hairColor: ['#140c0a', '#2b1a12', '#4a2a18'],
  bow: ['#ff5c8a', '#ff6b4a', '#ffc93c', '#0f8a8f', '#fff8f0', 'none'],
  outfit: {
    coral: ['#ff6b4a', '#ffc93c', '#24163d', '#0f8a8f'],
    lagoon: ['#0f8a8f', '#ffc93c', '#ff6b4a', '#fff8f0'],
    pink: ['#ff5c8a', '#fff8f0', '#6b4fc9', '#ffc93c'],
    sun: ['#ffc93c', '#ff6b4a', '#24163d', '#3aa655'],
    purple: ['#6b4fc9', '#ffc93c', '#ff5c8a', '#fff8f0'],
  },
};
export const DEFAULT_LOOK = { skin: '#8a5a3c', hair: 'puffs', hairColor: '#2b1a12', bow: '#ff5c8a', outfit: 'coral' };
const outfitTex = {};
const getOutfit = k => outfitTex[k] || (outfitTex[k] = ankara(LOOKS.outfit[k] || LOOKS.outfit.coral));
const scaleTex = tex(128, 128, (c, w, h) => {
  c.fillStyle = '#1fb5a8'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#7fe3d2'; c.lineWidth = 3;
  for (let y = 0; y <= h; y += 16) for (let x = (y / 16 % 2) * 8; x <= w; x += 16) { c.beginPath(); c.arc(x, y, 8, 0, Math.PI); c.stroke(); }
}, true);

/* ---------- shared materials and geometry ---------- */
export const M = {
  skin: new THREE.MeshLambertMaterial({ color: COL.skin }),
  hair: new THREE.MeshLambertMaterial({ color: COL.hair }),
  blush: new THREE.MeshLambertMaterial({ color: COL.blush }),
  bowKnot: new THREE.MeshLambertMaterial({ color: 0xffd1e0 }),
  eye: new THREE.MeshBasicMaterial({ color: 0x1a1020 }),
  white: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  cheek: new THREE.MeshBasicMaterial({ color: 0xff8a8a, transparent: true, opacity: .45 }),
  dress: new THREE.MeshLambertMaterial({ map: getOutfit('coral') }),
  bow: new THREE.MeshLambertMaterial({ color: COL.blush }),
  gele: new THREE.MeshLambertMaterial({ map: getOutfit('sun') }),
  shoe: new THREE.MeshLambertMaterial({ color: COL.pearl }),
  tail: new THREE.MeshLambertMaterial({ map: scaleTex }),
  fin: new THREE.MeshLambertMaterial({ color: 0x7fe3d2, side: THREE.DoubleSide }),
  shadow: new THREE.MeshBasicMaterial({ color: COL.ink, transparent: true, opacity: .28, depthWrite: false }),
  pearl: new THREE.MeshStandardMaterial({ color: 0xfff8f0, roughness: .15, metalness: .1, emissive: 0x6a5a70, emissiveIntensity: .35 }),
};
export const G = {
  sphere: new THREE.SphereGeometry(1, 20, 14),
  lowSphere: new THREE.SphereGeometry(1, 10, 8),
  box: new THREE.BoxGeometry(1, 1, 1),
  shadow: new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
};
export function mesh(geo, mat, sx = 1, sy = sx, sz = sx) { const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); return m; }

/* ---------- Pearl ---------- */
// Built facing local +z; `inner` is turned 180 degrees so she faces down the course (-z).
export function makePearl() {
  const root = new THREE.Group(), inner = new THREE.Group(), hips = new THREE.Group(), torso = new THREE.Group(), head = new THREE.Group();
  inner.rotation.y = Math.PI;
  root.add(inner); inner.add(hips); hips.add(torso);

  const dress = new THREE.Mesh(new THREE.CylinderGeometry(.2, .34, .5, 18), M.dress);
  dress.position.y = .22; torso.add(dress);
  const collar = mesh(G.sphere, M.skin, .14); collar.position.y = .5; torso.add(collar);

  const limb = (len, r) => { const g = new THREE.CapsuleGeometry(r, len, 4, 10); g.translate(0, -len / 2 - r / 2, 0); return g; };
  const armGeo = limb(.24, .07), legGeo = limb(.24, .08);
  const arms = [-1, 1].map(s => { const a = new THREE.Group(); a.position.set(s * .2, .44, 0); a.add(new THREE.Mesh(armGeo, M.skin)); torso.add(a); return a; });
  const legs = [-1, 1].map(s => {
    const l = new THREE.Group(); l.position.set(s * .1, 0, 0);
    l.add(new THREE.Mesh(legGeo, M.skin));
    const shoe = mesh(G.lowSphere, M.shoe, .09, .07, .12); shoe.position.set(0, -.36, .03); l.add(shoe);
    hips.add(l); return l;
  });

  // Mermaid tail: a chain of shrinking segments that ripple, ending in a fin.
  const tail = new THREE.Group(); hips.add(tail);
  const tailSegs = [];
  let parent = tail;
  [[.25, .2], [.21, .18], [.16, .16], [.11, .14]].forEach(([r, len], i) => {
    const seg = new THREE.Group(); seg.position.y = i ? -len * 1.3 : .05; parent.add(seg);
    const m = mesh(G.sphere, M.tail, r, len, r * .85); m.position.y = -len * .6; seg.add(m);
    tailSegs.push(seg); parent = seg;
  });
  const finGeo = new THREE.ConeGeometry(.16, .34, 3); finGeo.translate(0, -.17, 0);
  for (const s of [-1, 1]) { const f = new THREE.Mesh(finGeo, M.fin); f.scale.z = .25; f.position.y = -.2; f.rotation.z = s * .55; parent.add(f); }
  tail.visible = false;

  head.position.y = .82; torso.add(head);
  head.add(mesh(G.sphere, M.skin, .36));
  const cap = new THREE.Mesh(new THREE.SphereGeometry(.375, 24, 12, 0, Math.PI * 2, 0, Math.PI * .42), M.hair);
  cap.rotation.x = -.35; head.add(cap);
  const hairs = { puffs: new THREE.Group(), puff: new THREE.Group(), curls: new THREE.Group(), gele: new THREE.Group() };
  for (const g of Object.values(hairs)) head.add(g);
  for (const s of [-1, 1]) { const bun = mesh(G.sphere, M.hair, .17); bun.position.set(s * .3, .26, -.05); hairs.puffs.add(bun); }
  const top = mesh(G.sphere, M.hair, .25, .22, .25); top.position.set(0, .38, -.1); hairs.puff.add(top);
  for (let i = 0; i < 26; i++) {
    // Little curls scattered over the top and back of the head.
    const a = i * 2.4, up = .25 + (i % 7) / 7 * .9;
    const c = mesh(G.lowSphere, M.hair, .085);
    c.position.set(Math.cos(a) * Math.cos(up) * .37, Math.sin(up) * .37 + .02, Math.sin(a) * Math.cos(up) * .37 - .05);
    if (c.position.z > .22 && c.position.y < .2) continue;
    hairs.curls.add(c);
  }
  // Gele: a wrapped headtie with a tall fanned knot, in ankara.
  const wrap = new THREE.Mesh(new THREE.SphereGeometry(.4, 24, 12, 0, Math.PI * 2, 0, Math.PI * .45), M.gele); wrap.rotation.x = -.3; hairs.gele.add(wrap);
  const band = new THREE.Mesh(new THREE.TorusGeometry(.36, .07, 8, 28), M.gele); band.rotation.x = Math.PI / 2 - .3; band.position.y = .1; hairs.gele.add(band);
  for (let i = 0; i < 5; i++) { const f = mesh(G.sphere, M.gele, .2, .11, .05); f.position.set((i - 2) * .1, .45 + Math.abs(i - 2) * -.03, -.1); f.rotation.set(-.3, 0, (i - 2) * .45); hairs.gele.add(f); }
  const bow = new THREE.Group(); bow.position.set(.17, .33, -.06); bow.rotation.set(-.5, 0, -.45); head.add(bow);
  for (const s of [-1, 1]) { const w = mesh(G.sphere, M.bow, .13, .09, .06); w.position.x = s * .11; w.rotation.z = s * .35; bow.add(w); }
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
  const W = 1.5;
  const photo = new THREE.Mesh(new THREE.SphereGeometry(.366, 24, 16, Math.PI / 2 - W / 2, W, Math.PI / 2 - W / 2 + .08, W), photoMat);
  photo.visible = false; head.add(photo);

  const shadow = mesh(G.shadow, M.shadow, .38); shadow.position.y = .015; root.add(shadow);

  return { root, inner, hips, torso, head, arms, legs, tail, tailSegs, face, photo, photoMat, shadow, cap, hairs, bow };
}

export function setMermaid(P, on) {
  P.tail.visible = on;
  P.legs.forEach(l => { l.visible = !on; });
}

export function applyLook(P, look) {
  const L = { ...DEFAULT_LOOK, ...look };
  M.skin.color.set(L.skin);
  M.hair.color.set(L.hairColor);
  for (const [k, g] of Object.entries(P.hairs)) g.visible = k === L.hair;
  P.cap.visible = L.hair !== 'gele';
  P.bow.visible = L.bow !== 'none' && L.hair !== 'gele';
  if (L.bow !== 'none') M.bow.color.set(L.bow);
  M.dress.map = getOutfit(L.outfit); M.dress.needsUpdate = true;
  M.gele.map = getOutfit(L.outfit === 'sun' ? 'coral' : 'sun'); M.gele.needsUpdate = true;
}

// Shows Daddy's photo on Pearl's face, or the cartoon face when url is empty.
// The photo's edge fades out so it blends into her head. `onSkin` gets the skin
// tone read from the middle of the photo, so her body can match her face.
export function applyPhoto(P, url, onSkin) {
  if (!url) { P.photo.visible = false; P.face.visible = true; return; }
  const im = new Image();
  im.onload = () => {
    const t = tex(256, 256, (c, w, h) => {
      c.drawImage(im, 0, 0, w, h);
      c.globalCompositeOperation = 'destination-in';
      const g = c.createRadialGradient(w / 2, h / 2, w * .34, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    if (P.photoMat.map) P.photoMat.map.dispose();
    P.photoMat.map = t; P.photoMat.needsUpdate = true;
    P.photo.visible = true; P.face.visible = false;
    if (onSkin) onSkin(skinFromPhoto(im));
  };
  im.src = url;
}
// Average colour of the cheeks and nose area, skipping very dark and very bright pixels.
function skinFromPhoto(im) {
  const c = document.createElement('canvas'); c.width = c.height = 40;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0, 40, 40);
  const d = x.getImageData(10, 16, 20, 14).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) {
    const l = (d[i] + d[i + 1] + d[i + 2]) / 3;
    if (l < 25 || l > 235) continue;
    r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
  }
  if (!n) return null;
  const hex = v => Math.round(v / n).toString(16).padStart(2, '0');
  return '#' + hex(r) + hex(g) + hex(b);
}

// Poses: stage 0 crawl, 1 toddle, 2 run, or `swim` for the mermaid.
// `turn` spins her round to face the chase camera, `wave` lifts her right hand,
// `idle` holds her still (menu and end card).
export function posePearl(P, { ph, stage = 1, air = false, turn = 0, wave = 0, idle = false, t = 0, swim = false }) {
  const sw = Math.sin(ph), cw = Math.cos(ph);
  let hipY, lean, headX, armX = [0, 0], armZ = [0, 0], legX = [0, 0], bob = 0, roll = 0, tailX = 0;
  if (swim) {
    hipY = 0;
    if (idle) {
      lean = .1; headX = -.05; armX = [-.2, -.2]; armZ = [-.5 - Math.sin(t * 2) * .1, .5]; tailX = .25 + Math.sin(t * 1.6) * .1; bob = Math.sin(t * 1.8) * .06;
    } else {
      lean = 1.3; headX = -1.15; tailX = 1.4;
      armX = [-2.75 + cw * .25, -2.75 + cw * .25]; armZ = [-.35 - sw * .45, .35 + sw * .45];
    }
    P.tailSegs.forEach((s, i) => { s.rotation.x = Math.sin(ph * (idle ? .5 : 1) - i * .9) * (.22 + i * .06); });
    P.tail.rotation.x = tailX;
  } else if (stage === 0 && !air) {
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
    lean = lerp(lean, .05, wave); headX = lerp(headX, -.1, wave);
    if (!swim) hipY = lerp(hipY, .42, wave);
    else P.tail.rotation.x = lerp(P.tail.rotation.x, .3, wave);
    armX[1] = lerp(armX[1], 0, wave); armZ[1] = lerp(armZ[1], 2.6 + Math.sin(t * 14) * .35, wave);
    if (!air && !idle && !swim) { legX = [lerp(legX[0], sw * .3, wave), lerp(legX[1], -sw * .3, wave)]; }
  }
  P.hips.position.y = hipY + bob;
  P.torso.rotation.set(lean, 0, roll);
  P.head.rotation.x = headX;
  P.arms.forEach((a, i) => a.rotation.set(armX[i], 0, armZ[i]));
  P.legs.forEach((l, i) => l.rotation.set(legX[i], 0, 0));
  P.inner.rotation.y = Math.PI * (1 - turn);
}

/* ---------- confetti ---------- */
export function makeConfetti(scene) {
  const geo = new THREE.PlaneGeometry(.12, .08);
  const mats = [COL.coral, COL.sun, COL.blush, 0x4cc9f0, COL.pearl, COL.lagoon].map(c => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
  const bits = [];
  for (let i = 0; i < 90; i++) { const m = new THREE.Mesh(geo, mats[i % 6]); m.visible = false; scene.add(m); bits.push({ m, life: 0, v: new THREE.Vector3(), spin: new THREE.Vector3() }); }
  return {
    burst(pos, n, gravity = 9) {
      let k = 0;
      for (const c of bits) {
        if (c.life > 0) continue;
        c.life = rand(1, 1.8); c.g = gravity; c.m.visible = true; c.m.position.copy(pos);
        c.v.set(rand(-3, 3), rand(3, 7) * (gravity < 5 ? .4 : 1), rand(-3, 1)); c.spin.set(rand(-9, 9), rand(-9, 9), rand(-9, 9));
        if (++k >= n) break;
      }
    },
    update(dt) {
      for (const c of bits) {
        if (c.life <= 0) continue;
        c.life -= dt; c.v.y -= c.g * dt; c.m.position.addScaledVector(c.v, dt);
        c.m.rotation.x += c.spin.x * dt; c.m.rotation.y += c.spin.y * dt; c.m.rotation.z += c.spin.z * dt;
        if (c.life <= 0) c.m.visible = false;
      }
    },
    clear() { for (const c of bits) { c.life = 0; c.m.visible = false; } },
  };
}

// Text on a sprite, used for speech bubbles and floating "+3".
export function textSprite(text, { color = '#24163d', bg = '#fff8f0', size = 44, pad = 18, border = '#24163d' } = {}) {
  const font = `400 ${size}px "Bagel Fat One", "Arial Rounded MT Bold", sans-serif`;
  const meas = document.createElement('canvas').getContext('2d'); meas.font = font;
  const w = Math.ceil(meas.measureText(text).width) + pad * 2, h = size + pad * 2;
  const t = tex(w, h, (c) => {
    if (bg) {
      c.fillStyle = bg; c.strokeStyle = border; c.lineWidth = 6;
      const r = h / 2; c.beginPath(); c.moveTo(r, 3); c.arcTo(w - 3, 3, w - 3, h - 3, r - 3); c.arcTo(w - 3, h - 3, 3, h - 3, r - 3); c.arcTo(3, h - 3, 3, 3, r - 3); c.arcTo(3, 3, w - 3, 3, r - 3); c.closePath(); c.fill(); c.stroke();
    }
    c.font = font; c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2 + 3);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, fog: false }));
  s.scale.set(w / h * .5, .5, 1);
  return s;
}
