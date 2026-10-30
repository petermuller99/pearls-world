// Daddy: cheers Pearl on at milestones, jogs up now and then to toss her a power-up,
// and stands with the family on the menu and end card. His look is set in "Daddy's look"
// (`pw_dad_look`) and his photo is kept on the phone (`pw_dad_face`).
import { THREE, M, G, mesh, rand, damp, tex, makePearl, posePearl, setMermaid, applyPhoto, getOutfit, outlined } from './common.js';
import { sfx } from './audio.js';

export const DAD_LOOKS = {
  hair: [['lowcut', 'Low cut'], ['afro', 'Afro'], ['locs', 'Locs'], ['bald', 'Bald']],
  beard: [['none', 'No beard'], ['stubble', 'Stubble'], ['full', 'Full beard']],
  glasses: [['none', 'No glasses'], ['on', 'Glasses']],
  hat: [['none', 'No hat'], ['fila', 'Fila'], ['cap', 'Cap']],
  outfit: [['agbada', 'Agbada'], ['senator', 'Senator'], ['jersey', 'Jersey'], ['polo', 'Polo']],
};
export const DEFAULT_DAD = { skin: '#7a4e30', hair: 'lowcut', beard: 'stubble', glasses: 'none', hat: 'none', outfit: 'senator' };

/* ---------- Daddy's materials, shared by his figures in both worlds ---------- */
const D = {
  skin: new THREE.MeshLambertMaterial({ color: 0x7a4e30 }),
  hair: new THREE.MeshLambertMaterial({ color: 0x15100d }),
  stubble: new THREE.MeshLambertMaterial({ color: 0x15100d, transparent: true, opacity: .55 }),
  shirt: new THREE.MeshLambertMaterial({ color: 0x2c3e6b }),
  trousers: new THREE.MeshLambertMaterial({ color: 0x2c3e6b }),
  shoe: new THREE.MeshLambertMaterial({ color: 0x4a2c1a }),
  frame: new THREE.MeshBasicMaterial({ color: 0x1a1020 }),
  fila: new THREE.MeshLambertMaterial({ map: getOutfit('lagoon') }),
  cap: new THREE.MeshLambertMaterial({ color: 0xe8333a }),
  robe: new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
};
outlined(D.skin, D.hair, D.shirt, D.trousers, D.shoe, D.fila, D.cap, D.robe);

// Outfit textures: agbada cream with gold embroidery, senator navy with a gold band,
// a green football jersey with DADDY 1 on the back, and a plain polo.
const OUTFIT = {
  agbada: { shirt: tex(256, 128, (c, w, h) => { c.fillStyle = '#f4ead6'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c9962e'; c.lineWidth = 4; for (const x of [0, w]) for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x, 10, 18 + i * 9, 0, Math.PI); c.stroke(); } }), trousers: 0xf4ead6, sleeves: true, robe: true },
  senator: { shirt: tex(256, 128, (c, w, h) => { c.fillStyle = '#2c3e6b'; c.fillRect(0, 0, w, h); c.fillStyle = '#d9b04a'; c.fillRect(6, 0, 6, h * .55); c.fillRect(w - 12, 0, 6, h * .55); }), trousers: 0x2c3e6b, sleeves: true, long: true },
  jersey: { shirt: tex(256, 128, (c, w, h) => {
    c.fillStyle = '#1f9a50'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.fillRect(0, h - 14, w, 6);
    c.font = '400 26px "Bagel Fat One", "Arial Rounded MT Bold", sans-serif'; c.textAlign = 'center';
    c.fillText('DADDY', w * .5, 44); c.font = '400 44px "Bagel Fat One", "Arial Rounded MT Bold", sans-serif'; c.fillText('1', w * .5, 92);
  }), trousers: 0xffffff },
  polo: { shirt: tex(64, 64, (c, w, h) => { c.fillStyle = '#2f6fd6'; c.fillRect(0, 0, w, h); }), trousers: 0xc9a87c },
};
if (document.fonts && document.fonts.load) document.fonts.load('400 26px "Bagel Fat One"').then(() => {
  const fresh = tex(256, 128, (c, w, h) => {
    c.fillStyle = '#1f9a50'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.fillRect(0, h - 14, w, 6);
    c.font = '400 26px "Bagel Fat One"'; c.textAlign = 'center'; c.fillText('DADDY', w * .5, 44);
    c.font = '400 44px "Bagel Fat One"'; c.fillText('1', w * .5, 92);
  });
  OUTFIT.jersey.shirt = fresh; if (lastLook) applyDadLook(lastLook);
}).catch(() => {});

const figures = [];
let lastLook = null;

export function makeDaddyFigure() {
  const F = makePearl();
  F.root.scale.setScalar(1.45);
  F.root.traverse(o => {
    if (o.material === M.skin) o.material = D.skin;
    else if (o.material === M.hair) o.material = D.hair;
    else if (o.material === M.dress || o.material === M.lace) o.material = D.shirt;
    else if (o.material === M.shoe) o.material = D.shoe;
    else if (o.material === M.gold) o.visible = false;
  });
  for (const g of Object.values(F.hairs)) g.visible = false;
  F.cap.visible = false; F.bow.visible = false; F.headband.visible = false;
  F.legs.forEach(l => { l.userData.sock.visible = false; l.children[0].material = D.trousers; });
  F.dress.scale.set(.95, 1, .95);

  const head = F.head, extra = {};
  // Hair
  extra.lowcut = new THREE.Mesh(new THREE.SphereGeometry(.372, 24, 12, 0, Math.PI * 2, 0, Math.PI * .4), D.hair); extra.lowcut.rotation.x = -.35;
  extra.afro = new THREE.Group(); const fro = mesh(G.sphere, D.hair, .44, .36, .42); fro.position.set(0, .2, -.06); extra.afro.add(fro);
  extra.locs = new THREE.Group(); extra.locs.add(new THREE.Mesh(extra.lowcut.geometry, D.hair)); extra.locs.children[0].rotation.x = -.35;
  // Locs hang around the sides and back of his head (the face is toward +z).
  for (let i = 0; i < 13; i++) {
    const a = -1.75 + i / 12 * 3.5, l = mesh(G.cyl, D.hair, .035, .44, .035);
    l.position.set(Math.sin(a) * .35, -.05, -Math.cos(a) * .35); extra.locs.add(l);
  }
  for (const k of ['lowcut', 'afro', 'locs']) head.add(extra[k]);
  // Beard
  const beardGeo = new THREE.SphereGeometry(.375, 20, 10, 0, Math.PI, Math.PI * .6, Math.PI * .4);
  extra.stubble = new THREE.Mesh(beardGeo, D.stubble);
  extra.full = new THREE.Group(); extra.full.add(new THREE.Mesh(beardGeo, D.hair));
  const chin = mesh(G.sphere, D.hair, .17, .14, .12); chin.position.set(0, -.3, .2); extra.full.add(chin);
  const tache = mesh(G.sphere, D.hair, .1, .03, .04); tache.position.set(0, -.03, .34); extra.full.add(tache);
  head.add(extra.stubble, extra.full);
  // Glasses
  extra.glasses = new THREE.Group();
  for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.08, .013, 6, 20), D.frame); r.position.set(s * .13, .03, .36); extra.glasses.add(r); }
  const bridge = mesh(G.box, D.frame, .1, .015, .015); bridge.position.set(0, .05, .37); extra.glasses.add(bridge);
  head.add(extra.glasses);
  // Hats
  extra.fila = new THREE.Group();
  const fila = new THREE.Mesh(new THREE.CylinderGeometry(.33, .37, .22, 20), D.fila); fila.position.y = .3; fila.rotation.z = .2; extra.fila.add(fila);
  const flop = mesh(G.sphere, D.fila, .2, .08, .2); flop.position.set(.2, .42, 0); flop.rotation.z = -.5; extra.fila.add(flop);
  extra.cap = new THREE.Group();
  extra.cap.add(new THREE.Mesh(new THREE.SphereGeometry(.38, 20, 10, 0, Math.PI * 2, 0, Math.PI * .45), D.cap));
  const brim = mesh(G.cyl, D.cap, .2, .025, .16); brim.position.set(0, .14, .36); extra.cap.add(brim);
  head.add(extra.fila, extra.cap);
  // Agbada: a wide flowing robe over the shoulders.
  extra.robe = new THREE.Mesh(new THREE.CylinderGeometry(.3, .62, .78, 22, 1, true), D.robe); extra.robe.position.y = .14; F.torso.add(extra.robe);
  F.extra = extra;
  figures.push(F);
  if (lastLook) applyDadLook(lastLook, [F]);
  return F;
}

export function applyDadLook(look, list = figures) {
  const L = { ...DEFAULT_DAD, ...look }; lastLook = L;
  D.skin.color.set(L.skin);
  const o = OUTFIT[L.outfit] || OUTFIT.senator;
  D.shirt.map = o.shirt; D.shirt.color.set(0xffffff); D.shirt.needsUpdate = true;
  D.robe.map = o.shirt; D.robe.needsUpdate = true;
  D.trousers.color.set(o.trousers);
  for (const F of list) {
    const x = F.extra;
    x.lowcut.visible = L.hair === 'lowcut' && L.hat === 'none';
    x.afro.visible = L.hair === 'afro' && L.hat !== 'cap';
    x.locs.visible = L.hair === 'locs';
    x.stubble.visible = L.beard === 'stubble'; x.full.visible = L.beard === 'full';
    x.glasses.visible = L.glasses === 'on';
    x.fila.visible = L.hat === 'fila'; x.cap.visible = L.hat === 'cap';
    x.robe.visible = !!o.robe;
    F.dress.scale.y = o.long ? 1.55 : 1; F.dress.position.y = o.long ? .1 : .22;
    F.arms.forEach(a => { a.children[0].material = o.sleeves ? D.shirt : D.skin; });
  }
}
export function setDadPhoto(url, onSkin) { figures.forEach((F, i) => applyPhoto(F, url, i ? null : onSkin)); }

const CHEERS = ['Go Pearl!', 'Well done, my baby!', 'That is my girl!', 'Yes o! Go go go!', 'Daddy is proud of you!'];
const HELPS = ['Catch, Pearl!', 'Daddy has something for you!', 'Here, my baby!'];

// One Daddy per world. `say(text)` shows his speech bubble, `give(kind, from)` drops a
// tossed power-up in front of Pearl, `side(px)` picks which side of Pearl he appears on.
export function createDaddy(parent, { mermaid = false, say, give, kinds }) {
  const F = makeDaddyFigure();
  if (mermaid) setMermaid(F, true);
  parent.add(F.root);
  let ph = 0, mode = 'menu', t = 0, helpT = rand(14, 22), spot = new THREE.Vector3(), said = false, tossed = false;
  const pos = F.root.position;
  return {
    fig: F,
    reset() { mode = 'away'; helpT = rand(12, 18); F.root.visible = false; },
    // Called at each milestone: Daddy waits at the side ahead, cheering as Pearl passes.
    cheer(px, py, pz, ahead) {
      mode = 'cheer'; said = false; F.root.visible = true;
      spot.set(px > 0 ? -2.15 : 2.15, mermaid ? Math.max(.6, py - .3) : 0, pz - ahead);
      pos.copy(spot); sfx.cheer();
    },
    update(dt, { px, py, pz, speed, gameMode, caught, time, diff }) {
      t += dt; ph += dt * 6;
      if (gameMode !== 'play') {
        // Menu and end card: stand with the family.
        F.root.visible = true; mode = 'menu';
        pos.set(damp(pos.x, px - .95, 4, dt), damp(pos.y, py, 4, dt), damp(pos.z, pz + .7, 4, dt));
        posePearl(F, { ph, stage: 1, idle: true, swim: mermaid, t: time, wave: gameMode === 'over' ? 1 : .0 });
        F.shadow.position.y = (.015 - pos.y) / 1.45;
        return;
      }
      if (mode === 'cheer') {
        const d = pz - pos.z;
        if (!said && d < 9 && d > -2) { said = true; say(CHEERS[Math.floor(Math.random() * CHEERS.length)]); }
        posePearl(F, { ph, stage: 1, idle: true, swim: mermaid, t: time, wave: 1, turn: 1 });
        F.root.position.y = spot.y + (mermaid ? Math.sin(time * 2) * .1 : Math.abs(Math.sin(time * 6)) * .15);
        if (pos.z > pz + 7) { mode = 'away'; F.root.visible = false; }
      } else if (mode === 'help') {
        // Jog up beside Pearl, toss a power-up ahead of her, then drop back.
        const tx = px + (px > 0 ? -2 : 2);
        const rel = t < 1.6 ? 5 - t * 2.5 : t < 2.6 ? 1 : 1 + (t - 2.6) * 4;
        pos.set(damp(pos.x, tx, 5, dt), mermaid ? damp(pos.y, py - .2, 4, dt) : 0, pz + rel);
        if (t > 1.2 && !said) { said = true; say(HELPS[Math.floor(Math.random() * HELPS.length)]); }
        if (t > 1.9 && !tossed) { tossed = true; sfx.toss(); give(kinds[Math.floor(Math.random() * kinds.length)], pos.clone().setY(pos.y + 1.3)); }
        posePearl(F, { ph, stage: 2, swim: mermaid, t: time, wave: t > 1.6 && t < 2.4 ? 1 : 0 });
        if (t > 4) { mode = 'away'; F.root.visible = false; helpT = rand(22, 34) * (.6 + diff.attack * .4); }
      } else {
        F.root.visible = false;
        helpT -= dt;
        if (helpT <= 0) { mode = 'help'; t = 0; said = false; tossed = false; F.root.visible = true; pos.set(px + (px > 0 ? -2 : 2), mermaid ? py : 0, pz + 5); }
      }
      F.shadow.position.y = (.015 - pos.y) / 1.45;
    },
  };
}
