// Pearl's World 3D: the menu, the shared game flow (Mummy's chase, power-ups, pearls,
// banner, pause, end card, piggy bank) and the render loop. Each game lives in its own module.
import { THREE, $, store, damp, makePearl, applyPhoto, applyLook, makeConfetti, LOOKS, DEFAULT_LOOK } from './common.js';
import { audio, sfx, unlock, setSfx, setMusic, playMusic, stopMusic, setMusicLevel, pauseAudio, resumeAudio } from './audio.js';
import { createPowers, GAP_MAX, GAP_START, DIFFICULTY, MUM_LOOKS, DEFAULT_MUM, applyMumLook, setMumPhoto } from './chase.js';
import { DAD_LOOKS, DEFAULT_DAD, applyDadLook, setDadPhoto } from './daddy.js';
import { loadUpgrades, saveUpgrades, upgradeEffects, renderShop } from './shop.js';
import { createGfx } from './gfx.js';
import { createRunner } from './runner.js';
import { createHunt } from './hunt.js';

const canvas = $('c');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  $('menu').hidden = true; $('nogl').hidden = false;
  throw e;
}
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
const gfx = createGfx(renderer, scene, camera);
function resize() {
  const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Keep about 64 degrees visible side to side so the play area fits in portrait.
  const hFov = 64 * Math.PI / 180;
  camera.fov = THREE.MathUtils.clamp(2 * Math.atan(Math.tan(hFov / 2) / camera.aspect) * 180 / Math.PI, 50, 78);
  camera.updateProjectionMatrix();
  gfx.resize(w, h);
}
addEventListener('resize', resize);

/* ---------- shared game state ---------- */
let diffKey = DIFFICULTY[store.get('pw_difficulty', 'normal')] ? store.get('pw_difficulty', 'normal') : 'normal';
let upgrades = loadUpgrades();
const S = { up: upgradeEffects(upgrades), diff: DIFFICULTY[diffKey], mode: 'menu', t: 0, pearls: 0, inv: 0, cam: 0, paused: false, gap: GAP_START, ammo: 0, shieldT: 0, magnetT: 0, stumble: 0, caught: false };
let bank = store.get('pw_bank', 0);
const P = makePearl();
scene.add(P.root);
let look = { ...DEFAULT_LOOK, ...store.get('pw_look', {}) };
applyLook(P, look);
applyPhoto(P, store.get('pw_face', null));
const confetti = makeConfetti(scene);

let bannerTimer = 0;
function banner(t) { const b = $('banner'); b.textContent = t; b.classList.remove('off'); bannerTimer = 2.6; }
function hud() {
  // Chase meter: Mummy's marker slides toward Pearl as the gap closes.
  const k = Math.max(0, Math.min(1, S.gap / GAP_MAX));
  $('mumMark').style.left = `${(1 - k) * 100}%`;
  $('chase').classList.toggle('close', S.gap < 3);
  $('chase').setAttribute('aria-label', `Mummy is ${S.gap < 3 ? 'very close' : S.gap < 6 ? 'catching up' : 'far behind'}`);
  $('score').textContent = game.scoreText();
  $('fireBtn').hidden = S.mode !== 'play' || S.ammo <= 0;
  $('ammo').textContent = S.ammo;
  $('shieldBadge').hidden = !(S.shieldT > 0 && S.mode === 'play');
  $('magnetBadge').hidden = !(S.magnetT > 0 && S.mode === 'play');
}
// A bump trips Pearl up and lets Mummy gain ground. The shield bubble blocks one bump.
function hurt(msg, sound = sfx.hit, amount = 2) {
  if (S.shieldT > 0) { S.shieldT = 0; S.inv = .8; sfx.shieldPop(); banner('Your shield saved you!'); hud(); return; }
  S.gap -= amount * S.diff.hit; S.inv = 1.2; S.stumble = .6; sound(); sfx.oops(); hud();
  if (S.gap <= 0) caught(); else banner(msg);
}
let sayTimer = 0;
// Speech bubble at the bottom left, for Mummy or Daddy.
function say(who, text) {
  const el = $('mumSay'); el.textContent = (who === 'dad' ? '👨🏾 ' : '👩🏾 ') + text; el.classList.remove('off');
  el.classList.toggle('dad', who === 'dad');
  clearTimeout(sayTimer); sayTimer = setTimeout(() => el.classList.add('off'), 2200);
}
function mumSay(text) { say('mum', text); }
function boost(amount, msg) { S.gap = Math.min(GAP_MAX, S.gap + amount); banner(msg); hud(); }
function caught() {
  S.gap = 0; S.caught = true; hud();
  banner('Mummy caught you! Hug time!');
  endGame();
}
function levelUp(lv) {
  sfx.levelUp(); setMusicLevel(lv);
  banner(`Level ${lv}! Faster!`);
}
function updateBank() { $('bank').textContent = bank; $('best').textContent = store.get('pw_best', 0); $('shopBank').textContent = bank; }

/* ---------- market stall (shop) ---------- */
function showShop() { $('shopBank').textContent = bank; renderShop($('shopList'), upgrades, bank, buy); }
function buy(u) {
  const cost = u.costs[upgrades[u.id]];
  if (cost == null || bank < cost) return;
  bank -= cost; store.set('pw_bank', bank);
  upgrades[u.id]++; saveUpgrades(upgrades); S.up = upgradeEffects(upgrades);
  sfx.power(); confetti.burst(P.root.position.clone().setY(P.root.position.y + 1.4), 40);
  banner(`${u.name} level ${upgrades[u.id]}!`);
  updateBank(); showShop();
}

const powers = createPowers(scene, P, S, { banner, hud: () => hud() });
const ctx = { scene, P, confetti, S, hurt, boost, mumSay, say, banner, hud: () => hud(), camera, levelUp, powers };
const games = { run: createRunner(ctx), dive: createHunt(ctx) };
let game = games[store.get('pw_last', 'run')] || games.run;
game.enter();
gfx.setShadowLight(game.shadowLight);
gfx.init();

function switchTo(id) {
  if (game.id === id) return;
  game.exit(); game = games[id]; game.enter(); gfx.setShadowLight(game.shadowLight);
  store.set('pw_last', id);
}
function start(id) {
  unlock(); sfx.start();
  switchTo(id);
  confetti.clear();
  S.up = upgradeEffects(upgrades);
  Object.assign(S, { mode: 'play', pearls: 0, inv: 0, gap: Math.min(GAP_MAX, GAP_START + S.up.headStart), ammo: S.up.startAmmo, shieldT: 0, magnetT: 0, stumble: 0, caught: false });
  powers.reset();
  setPaused(false);
  game.start();
  $('menu').hidden = true; $('over').hidden = true; $('hud').hidden = false; $('pausePanel').hidden = true;
  hud(); banner(game.startBanner);
  playMusic(game.id);
  const hint = $('hint'); hint.textContent = game.hint; hint.classList.remove('off');
  clearTimeout(start.hintTimer); start.hintTimer = setTimeout(() => hint.classList.add('off'), 4500);
}
function toMenu() {
  S.mode = 'menu'; stopMusic(); setPaused(false); hud(); $('mumSay').classList.add('off');
  $('over').hidden = true; $('pausePanel').hidden = true; $('hud').hidden = true; $('menu').hidden = false; $('banner').classList.add('off'); $('hint').classList.add('off');
  updateBank();
}
function endGame() {
  if (S.mode !== 'play') return;
  S.mode = 'over';
  bank += S.pearls; store.set('pw_bank', bank);
  stopMusic(); (S.caught ? sfx.caught : sfx.gameOver)(); hud();
  const info = game.finish(bank);
  $('overEyebrow').textContent = `${info.eyebrow} · ${S.diff.label}`; $('overTitle').textContent = info.title; $('overText').textContent = info.text;
  setTimeout(() => { if (S.mode === 'over') { $('hud').hidden = true; $('over').hidden = false; } }, 900);
}

/* ---------- menu ---------- */
$('playRun').onclick = () => start('run');
$('playDive').onclick = () => start('dive');
$('againBtn').onclick = () => start(game.id);
$('menuBtn').onclick = toMenu;
$('homeBtn').onclick = () => { if (S.mode === 'play') { endGame(); } toMenu(); };

/* ---------- difficulty ---------- */
function showDifficulty() {
  for (const b of document.querySelectorAll('#difficulty button')) b.setAttribute('aria-pressed', String(b.dataset.d === diffKey));
}
for (const b of document.querySelectorAll('#difficulty button')) {
  b.onclick = () => { unlock(); sfx.click(); diffKey = b.dataset.d; S.diff = DIFFICULTY[diffKey]; store.set('pw_difficulty', diffKey); showDifficulty(); };
}
showDifficulty();

/* ---------- graphics setting ---------- */
function showGfx() {
  for (const b of document.querySelectorAll('#gfx button')) b.setAttribute('aria-pressed', String(b.dataset.g === gfx.setting));
}
for (const b of document.querySelectorAll('#gfx button')) b.onclick = () => { unlock(); sfx.click(); gfx.setSetting(b.dataset.g); resize(); showGfx(); };
showGfx();

/* ---------- pause ---------- */
function setPaused(on) {
  S.paused = on;
  if (on) pauseAudio(); else resumeAudio();
  $('pausePanel').hidden = !on;
}
$('pauseBtn').onclick = () => { if (S.mode === 'play') { sfx.click(); setPaused(true); } };
$('resumeBtn').onclick = () => { setPaused(false); sfx.click(); };
$('restartBtn').onclick = () => { setPaused(false); start(game.id); };
$('quitBtn').onclick = () => { setPaused(false); endGame(); toMenu(); };
// Fire button: throws a fireball when Pearl has some.
$('fireBtn').addEventListener('pointerdown', e => { e.preventDefault(); if (S.mode === 'play' && !S.paused) game.fire(); });
// Hovering or focusing a game card shows its world behind the menu.
for (const [btn, id] of [['playRun', 'run'], ['playDive', 'dive']]) {
  $(btn).addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && S.mode === 'menu') switchTo(id); });
  $(btn).addEventListener('focus', () => { if (S.mode === 'menu') switchTo(id); });
}

function setSound() {
  $('soundBtn').setAttribute('aria-pressed', String(audio.sfxOn));
  $('musicBtn').setAttribute('aria-pressed', String(audio.musicOn));
}
$('soundBtn').onclick = () => { unlock(); setSfx(!audio.sfxOn); setSound(); sfx.click(); };
$('musicBtn').onclick = () => { unlock(); setMusic(!audio.musicOn); setSound(); };

// Photo: centre-cropped to 200x200 and kept on this phone only.
function showPhotoButtons() { $('clearPhoto').hidden = !store.get('pw_face', null); }
function cropPhoto(input, done) {
  const f = input.files && input.files[0]; if (!f) return;
  const fr = new FileReader();
  fr.onload = () => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = 200;
      const k = Math.min(im.width, im.height);
      c.getContext('2d').drawImage(im, (im.width - k) / 2, (im.height - k) * .3, k, k, 0, 0, 200, 200);
      done(c.toDataURL('image/jpeg', .85));
    };
    im.src = fr.result;
  };
  fr.readAsDataURL(f);
  input.value = '';
}
$('clearPhoto').onclick = () => { store.remove('pw_face'); applyPhoto(P, null); showPhotoButtons(); };

/* ---------- Pearl's look ---------- */
function saveLook() { store.set('pw_look', look); applyLook(P, look); buildLook(); }
function chipRow(el, options, key, render, obj = look, save = saveLook) {
  el.textContent = '';
  for (const opt of options) {
    const [value, label] = Array.isArray(opt) ? opt : [opt, opt];
    const b = document.createElement('button');
    render(b, value, label);
    b.setAttribute('aria-pressed', String(obj[key] === value));
    b.onclick = () => { sfx.click(); obj[key] = value; save(); };
    el.appendChild(b);
  }
}
const swatch = (b, v, label) => {
  b.className = 'sw' + (v === 'none' ? ' none' : '');
  if (v !== 'none') b.style.background = v;
  b.setAttribute('aria-label', label === 'none' ? 'No bow' : label);
};
function buildLook() {
  const skins = look.photoSkin && !LOOKS.skin.includes(look.photoSkin) ? [...LOOKS.skin, [look.photoSkin, 'From photo']] : LOOKS.skin;
  chipRow($('lookSkin'), skins, 'skin', (b, v, label) => { swatch(b, v, label === v ? 'Skin tone' : label); if (label === 'From photo') { b.className = 'sw photo'; b.textContent = 'From photo'; } });
  chipRow($('lookHair'), LOOKS.hair, 'hair', (b, v, label) => { b.className = 'chip'; b.textContent = label; });
  chipRow($('lookHairColor'), LOOKS.hairColor, 'hairColor', (b, v) => swatch(b, v, 'Hair colour'));
  chipRow($('lookBowStyle'), LOOKS.bowStyle, 'bowStyle', (b, v, label) => { b.className = 'chip'; b.textContent = label; });
  chipRow($('lookBow'), LOOKS.bow, 'bow', (b, v) => swatch(b, v, v === 'none' ? 'none' : 'Bow colour'));
  chipRow($('lookSocks'), LOOKS.socks, 'socks', (b, v, label) => { b.className = 'chip'; b.textContent = label; });
  chipRow($('lookOutfit'), Object.keys(LOOKS.outfit), 'outfit', (b, v) => { swatch(b, LOOKS.outfit[v][0], v + ' ankara'); b.style.background = `radial-gradient(circle at 50% 50%, ${LOOKS.outfit[v][2]} 0 4px, ${LOOKS.outfit[v][1]} 4px 9px, ${LOOKS.outfit[v][0]} 9px)`; });
}
$('lookBtn').onclick = () => { unlock(); sfx.click(); buildLook(); $('menu').hidden = true; $('lookPanel').hidden = false; };
$('shopBtn').onclick = () => { unlock(); sfx.click(); showShop(); $('menu').hidden = true; $('shopPanel').hidden = false; };
$('shopDone').onclick = () => { sfx.click(); $('shopPanel').hidden = true; $('menu').hidden = false; updateBank(); };
$('lookDone').onclick = () => { sfx.click(); $('lookPanel').hidden = true; $('menu').hidden = false; };

/* ---------- Daddy's look ---------- */
let dadLook = { ...DEFAULT_DAD, ...store.get('pw_dad_look', {}) };
applyDadLook(dadLook);
setDadPhoto(store.get('pw_dad_face', null));
function saveDad() { store.set('pw_dad_look', dadLook); applyDadLook(dadLook); buildDad(); }
function buildDad() {
  const chip = (b, v, label) => { b.className = 'chip'; b.textContent = label; };
  const skins = dadLook.photoSkin && !LOOKS.skin.includes(dadLook.photoSkin) ? [...LOOKS.skin, [dadLook.photoSkin, 'From photo']] : LOOKS.skin;
  chipRow($('dadSkin'), skins, 'skin', (b, v, label) => { swatch(b, v, label === v ? 'Skin tone' : label); if (label === 'From photo') { b.className = 'sw photo'; b.textContent = 'From photo'; } }, dadLook, saveDad);
  for (const k of ['hair', 'beard', 'glasses', 'hat', 'outfit']) chipRow($('dad' + k[0].toUpperCase() + k.slice(1)), DAD_LOOKS[k], k, chip, dadLook, saveDad);
  $('clearDadPhoto').hidden = !store.get('pw_dad_face', null);
}
$('dadPhoto').addEventListener('change', e => cropPhoto(e.target, url => {
  store.set('pw_dad_face', url);
  setDadPhoto(url, tone => { if (tone) { dadLook.skin = tone; dadLook.photoSkin = tone; } saveDad(); });
}));
$('clearDadPhoto').onclick = () => { store.remove('pw_dad_face'); setDadPhoto(null); buildDad(); };
/* ---------- Mummy's look ---------- */
let mumLook = { ...DEFAULT_MUM, ...store.get('pw_mum_look', {}) };
applyMumLook(mumLook);
setMumPhoto(store.get('pw_mum_face', null));
function saveMum() { store.set('pw_mum_look', mumLook); applyMumLook(mumLook); buildMum(); }
function buildMum() {
  const chip = (b, v, label) => { b.className = 'chip'; b.textContent = label; };
  const skins = mumLook.photoSkin && !LOOKS.skin.includes(mumLook.photoSkin) ? [...LOOKS.skin, [mumLook.photoSkin, 'From photo']] : LOOKS.skin;
  chipRow($('mumSkin'), skins, 'skin', (b, v, label) => { swatch(b, v, label === v ? 'Skin tone' : label); if (label === 'From photo') { b.className = 'sw photo'; b.textContent = 'From photo'; } }, mumLook, saveMum);
  const fabric = (b, v) => { swatch(b, LOOKS.outfit[v][0], v + ' ankara'); b.style.background = `radial-gradient(circle at 50% 50%, ${LOOKS.outfit[v][2]} 0 4px, ${LOOKS.outfit[v][1]} 4px 9px, ${LOOKS.outfit[v][0]} 9px)`; };
  chipRow($('mumGele'), Object.keys(LOOKS.outfit), 'gele', fabric, mumLook, saveMum);
  chipRow($('mumOutfit'), Object.keys(LOOKS.outfit), 'outfit', fabric, mumLook, saveMum);
  for (const k of ['hair', 'earrings', 'glasses']) chipRow($('mum' + k[0].toUpperCase() + k.slice(1)), MUM_LOOKS[k], k, chip, mumLook, saveMum);
  $('clearMumPhoto').hidden = !store.get('pw_mum_face', null);
}
$('mumPhoto').addEventListener('change', e => cropPhoto(e.target, url => {
  store.set('pw_mum_face', url);
  setMumPhoto(url, tone => { if (tone) { mumLook.skin = tone; mumLook.photoSkin = tone; } saveMum(); });
}));
$('clearMumPhoto').onclick = () => { store.remove('pw_mum_face'); setMumPhoto(null); buildMum(); };
$('mumBtn').onclick = () => { unlock(); sfx.click(); buildMum(); $('menu').hidden = true; $('mumPanel').hidden = false; };
$('mumDone').onclick = () => { sfx.click(); $('mumPanel').hidden = true; $('menu').hidden = false; };
$('dadBtn').onclick = () => { unlock(); sfx.click(); buildDad(); $('menu').hidden = true; $('dadPanel').hidden = false; };
$('dadDone').onclick = () => { sfx.click(); $('dadPanel').hidden = true; $('menu').hidden = false; };
for (const id of ['mumPhoto', 'dadPhoto']) document.querySelector(`label[for=${id}]`).addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $(id).click(); } });

// Install on phone (works offline).
let installEv = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEv = e; $('installBtn').hidden = false; });
$('installBtn').onclick = async () => {
  if (isIOS) { sfx.click(); $('menu').hidden = true; $('iosPanel').hidden = false; return; }
  if (!installEv) return; installEv.prompt(); try { await installEv.userChoice; } catch (_) {} installEv = null; $('installBtn').hidden = true;
};
// iPhone and iPad can't show an install prompt, so offer step-by-step help instead
// (Share, then Add to Home Screen). Hidden once the game is opened from the home screen.
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const installed = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
if (isIOS && !installed) { $('installBtn').textContent = /iPad/.test(navigator.userAgent) || navigator.platform === 'MacIntel' ? "Put Pearl's World on this iPad" : "Put Pearl's World on this iPhone"; $('installBtn').hidden = false; }
$('iosDone').onclick = () => { sfx.click(); $('iosPanel').hidden = true; $('menu').hidden = false; };
addEventListener('appinstalled', () => { installEv = null; $('installBtn').hidden = true; });

/* ---------- input, passed to the current game ---------- */
canvas.addEventListener('pointerdown', e => {
  if (S.mode !== 'play') return;
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  game.pointerDown(e);
});
canvas.addEventListener('pointermove', e => { if (S.mode === 'play') game.pointerMove(e); });
canvas.addEventListener('pointerup', e => { if (S.mode === 'play') game.pointerUp(e); });
canvas.addEventListener('pointercancel', e => { if (S.mode === 'play') game.pointerUp(e); });
addEventListener('keydown', e => {
  if (S.mode !== 'play') return;
  if (e.key === 'p' || e.key === 'Escape') { setPaused(!S.paused); return; }
  if (!S.paused) game.keyDown(e);
});
addEventListener('keyup', e => game.keyUp(e));
// Leaving the app mid-game pauses it until Resume; otherwise the scene just stops while hidden.
document.addEventListener('visibilitychange', () => {
  if (S.mode === 'play') { if (document.hidden) setPaused(true); return; }
  S.paused = document.hidden;
});

/* ---------- update and render ---------- */
const front = new THREE.Vector3(), behind = new THREE.Vector3(), camTarget = new THREE.Vector3();
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function update(dt) {
  S.t += dt;
  if (S.mode === 'play') {
    // Pearl slowly pulls away again while she runs cleanly. Mummy gets quicker at higher levels.
    const lv = game.st.level || 1;
    S.gap = Math.min(GAP_MAX, S.gap + dt * Math.max(.04, .16 - lv * .01) * S.diff.regen * S.up.regen);
    if (S.stumble > 0) S.stumble -= dt;
    S.hudT = (S.hudT || 0) - dt; if (S.hudT <= 0) { S.hudT = .2; hud(); }
  }
  game.update(dt);
  powers.update(dt, pos => game.fireHit(pos), game.bubbleY);
  if (S.inv > 0) { S.inv -= dt; P.inner.visible = Math.floor(S.inv * 12) % 2 === 0; } else P.inner.visible = true;
  confetti.update(dt);
  // Camera in front of Pearl on the menu and end card so we see her face, behind her while playing.
  const playing = S.mode === 'play';
  S.cam = damp(S.cam, playing ? 1 : 0, playing ? 2.2 : 1.6, dt);
  const e = S.cam * S.cam * (3 - 2 * S.cam);
  game.placeCamera(camera, e, camera.aspect > 1.2, front, behind, camTarget);
  // While the look panel is open in portrait, slide the picture up so Pearl stands above the panel.
  S.lift = damp(S.lift || 0, (!$('lookPanel').hidden || !$('shopPanel').hidden || !$('dadPanel').hidden || !$('mumPanel').hidden) && camera.aspect < 1.2 ? .07 : 0, 6, dt);
  const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
  if (S.lift > .002) camera.setViewOffset(w, h, 0, h * S.lift, w, h); else if (camera.view && camera.view.enabled) camera.clearViewOffset();
  if (bannerTimer > 0) { bannerTimer -= dt; if (bannerTimer <= 0) $('banner').classList.add('off'); }
}

// Quality step-down for slower phones: if frames keep running long, Auto switches
// effects off (and High lowers the resolution).
let last = performance.now(), slow = 0, checkT = 0;
function frame(now) {
  const raw = (now - last) / 1000, dt = Math.min(.05, raw); last = now;
  if (!S.paused) update(reduced && S.mode === 'menu' ? dt * .3 : dt);
  gfx.render(dt);
  checkT += raw; if (raw > 1 / 40) slow++;
  if (checkT > 2) {
    if (!document.hidden && gfx.slowFrames(slow, resize)) showGfx();
    checkT = 0; slow = 0;
  }
  requestAnimationFrame(frame);
}
resize(); setSound(); updateBank(); showPhotoButtons(); hud();
if ('serviceWorker' in navigator && location.protocol !== 'file:') addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
// Test hook: lets automated checks fast-forward the game.
if (location.search.includes('debug')) window.__pw = { S, update, games, get game() { return game; }, start, powers, setPaused, gfx };
requestAnimationFrame(frame);
