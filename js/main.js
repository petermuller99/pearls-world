// Pearl's World 3D: the menu, the shared game flow (hearts, pearls, milestones banner,
// end card, piggy bank) and the render loop. Each game lives in its own module.
import { THREE, $, store, damp, makePearl, applyPhoto, makeConfetti, audio, sfx } from './common.js';
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
let pixelRatio = Math.min(devicePixelRatio || 1, 2);
renderer.setPixelRatio(pixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
function resize() {
  const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Keep about 64 degrees visible side to side so the play area fits in portrait.
  const hFov = 64 * Math.PI / 180;
  camera.fov = THREE.MathUtils.clamp(2 * Math.atan(Math.tan(hFov / 2) / camera.aspect) * 180 / Math.PI, 50, 78);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

/* ---------- shared game state ---------- */
const S = { mode: 'menu', t: 0, hearts: 3, pearls: 0, inv: 0, cam: 0, paused: false };
let bank = store.get('pw_bank', 0);
const P = makePearl();
scene.add(P.root);
applyPhoto(P, store.get('pw_face', null));
const confetti = makeConfetti(scene);

let bannerTimer = 0;
function banner(t) { const b = $('banner'); b.textContent = t; b.classList.remove('off'); bannerTimer = 2.6; }
function hud() {
  $('hearts').textContent = '♥'.repeat(Math.max(0, S.hearts)) + '♡'.repeat(Math.max(0, 3 - S.hearts));
  $('hearts').setAttribute('aria-label', S.hearts + ' hearts');
  $('score').textContent = game.scoreText();
}
function hurt(msg) {
  S.hearts--; S.inv = 1.4; sfx.hit(); hud();
  if (S.hearts <= 0) endGame(); else banner(msg);
}
function updateBank() { $('bank').textContent = bank; $('best').textContent = store.get('pw_best', 0); }

const ctx = { scene, P, confetti, S, hurt, banner, hud: () => hud(), camera };
const games = { run: createRunner(ctx), dive: createHunt(ctx) };
let game = games[store.get('pw_last', 'run')] || games.run;
game.enter();

function switchTo(id) {
  if (game.id === id) return;
  game.exit(); game = games[id]; game.enter();
  store.set('pw_last', id);
}
function start(id) {
  switchTo(id);
  confetti.clear();
  Object.assign(S, { mode: 'play', hearts: 3, pearls: 0, inv: 0 });
  game.start();
  $('menu').hidden = true; $('over').hidden = true; $('hud').hidden = false;
  hud(); banner(game.startBanner);
  const hint = $('hint'); hint.textContent = game.hint; hint.classList.remove('off');
  clearTimeout(start.hintTimer); start.hintTimer = setTimeout(() => hint.classList.add('off'), 4500);
}
function toMenu() {
  S.mode = 'menu';
  $('over').hidden = true; $('hud').hidden = true; $('menu').hidden = false; $('banner').classList.add('off'); $('hint').classList.add('off');
  updateBank();
}
function endGame() {
  if (S.mode !== 'play') return;
  S.mode = 'over';
  bank += S.pearls; store.set('pw_bank', bank);
  const info = game.finish(bank);
  $('overEyebrow').textContent = info.eyebrow; $('overTitle').textContent = info.title; $('overText').textContent = info.text;
  setTimeout(() => { if (S.mode === 'over') { $('hud').hidden = true; $('over').hidden = false; } }, 900);
}

/* ---------- menu ---------- */
$('playRun').onclick = () => start('run');
$('playDive').onclick = () => start('dive');
$('againBtn').onclick = () => start(game.id);
$('menuBtn').onclick = toMenu;
$('homeBtn').onclick = () => { if (S.mode === 'play') { endGame(); } toMenu(); };
// Hovering or focusing a game card shows its world behind the menu.
for (const [btn, id] of [['playRun', 'run'], ['playDive', 'dive']]) {
  $(btn).addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && S.mode === 'menu') switchTo(id); });
  $(btn).addEventListener('focus', () => { if (S.mode === 'menu') switchTo(id); });
}

function setSound() {
  const b = $('soundBtn'); b.setAttribute('aria-pressed', String(!audio.muted));
  b.setAttribute('aria-label', audio.muted ? 'Sound off' : 'Sound on'); b.style.opacity = audio.muted ? .45 : 1;
}
$('soundBtn').onclick = () => { audio.muted = !audio.muted; store.set('pw_mute', audio.muted); setSound(); };

// Photo: centre-cropped to 200x200 and kept on this phone only.
function showPhotoButtons() { $('clearPhoto').hidden = !store.get('pw_face', null); }
$('photo').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  const fr = new FileReader();
  fr.onload = () => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = 200;
      const k = Math.min(im.width, im.height);
      c.getContext('2d').drawImage(im, (im.width - k) / 2, (im.height - k) * .3, k, k, 0, 0, 200, 200);
      const url = c.toDataURL('image/jpeg', .85);
      store.set('pw_face', url); applyPhoto(P, url); showPhotoButtons();
    };
    im.src = fr.result;
  };
  fr.readAsDataURL(f);
  e.target.value = '';
});
$('clearPhoto').onclick = () => { store.remove('pw_face'); applyPhoto(P, null); showPhotoButtons(); };
document.querySelector('label[for=photo]').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('photo').click(); } });

// Install on phone (works offline).
let installEv = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEv = e; $('installBtn').hidden = false; });
$('installBtn').onclick = async () => { if (!installEv) return; installEv.prompt(); try { await installEv.userChoice; } catch (_) {} installEv = null; $('installBtn').hidden = true; };
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
addEventListener('keydown', e => { if (S.mode === 'play') game.keyDown(e); });
addEventListener('keyup', e => game.keyUp(e));
document.addEventListener('visibilitychange', () => { S.paused = document.hidden; });

/* ---------- update and render ---------- */
const front = new THREE.Vector3(), behind = new THREE.Vector3(), look = new THREE.Vector3();
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function update(dt) {
  S.t += dt;
  game.update(dt);
  if (S.inv > 0) { S.inv -= dt; P.inner.visible = Math.floor(S.inv * 12) % 2 === 0; } else P.inner.visible = true;
  confetti.update(dt);
  // Camera in front of Pearl on the menu and end card so we see her face, behind her while playing.
  const playing = S.mode === 'play';
  S.cam = damp(S.cam, playing ? 1 : 0, playing ? 2.2 : 1.6, dt);
  const e = S.cam * S.cam * (3 - 2 * S.cam);
  game.placeCamera(camera, e, camera.aspect > 1.2, front, behind, look);
  if (bannerTimer > 0) { bannerTimer -= dt; if (bannerTimer <= 0) $('banner').classList.add('off'); }
}

// Quality step-down for slower phones: drop the pixel ratio if frames keep running long.
let last = performance.now(), slow = 0, checkT = 0;
function frame(now) {
  const raw = (now - last) / 1000, dt = Math.min(.05, raw); last = now;
  if (!S.paused) update(reduced && S.mode === 'menu' ? dt * .3 : dt);
  renderer.render(scene, camera);
  checkT += raw; if (raw > 1 / 40) slow++;
  if (checkT > 2) {
    if (slow > 50 && pixelRatio > 1) { pixelRatio = Math.max(1, pixelRatio - .5); renderer.setPixelRatio(pixelRatio); resize(); }
    checkT = 0; slow = 0;
  }
  requestAnimationFrame(frame);
}
resize(); setSound(); updateBank(); showPhotoButtons(); hud();
if ('serviceWorker' in navigator && location.protocol !== 'file:') addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
// Test hook: lets automated checks fast-forward the game.
if (location.search.includes('debug')) window.__pw = { S, update, games, get game() { return game; }, start };
requestAnimationFrame(frame);
