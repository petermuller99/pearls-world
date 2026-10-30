// All sound in Pearl's World is made live with WebAudio: two original songs and the
// sound effects. Nothing to download, so it works offline.
import { store } from './common.js';

export const audio = {
  sfxOn: !store.get('pw_mute', false),
  musicOn: !store.get('pw_music_off', false),
};

let ac = null, master, musicBus, sfxBus, echoIn, noiseBuf;
function ensure() {
  if (ac) return ac;
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  master = ac.createGain(); master.connect(ac.destination);
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.connect(master);
  musicBus = ac.createGain(); musicBus.gain.value = audio.musicOn ? .55 : 0; musicBus.connect(comp);
  sfxBus = ac.createGain(); sfxBus.gain.value = audio.sfxOn ? .9 : 0; sfxBus.connect(comp);
  // A soft echo the songs can send notes into.
  echoIn = ac.createGain(); echoIn.gain.value = .3;
  const d = ac.createDelay(1); d.delayTime.value = .32;
  const fb = ac.createGain(); fb.gain.value = .38;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
  echoIn.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(musicBus);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  return ac;
}
// Browsers only allow sound after a tap, so call this from button handlers.
export function unlock() { if (ensure() && ac.state === 'suspended') ac.resume(); }
export function setSfx(on) { audio.sfxOn = on; store.set('pw_mute', !on); if (ac) sfxBus.gain.setTargetAtTime(on ? .9 : 0, ac.currentTime, .05); }
export function setMusic(on) { audio.musicOn = on; store.set('pw_music_off', !on); if (ac) musicBus.gain.setTargetAtTime(on ? .55 : 0, ac.currentTime, .1); }
// Pausing freezes the audio clock, which stops the music exactly where it was.
let paused = false;
export function pauseAudio() { paused = true; if (ac) ac.suspend(); }
export function resumeAudio() { paused = false; if (ac) ac.resume(); }
document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else if (!paused) ac.resume(); });

/* ---------- instruments ---------- */
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function env(g, t, a, peak, dec) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
}
function osc(type, f, t, dur, vol, dest, o = {}) {
  const s = ac.createOscillator(), g = ac.createGain();
  s.type = type; s.frequency.setValueAtTime(f, t);
  if (o.to) s.frequency.exponentialRampToValueAtTime(o.to, t + (o.slide || dur));
  if (o.detune) s.detune.value = o.detune;
  env(g, t, o.a || .005, vol, dur);
  let out = g;
  if (o.lp) { const f2 = ac.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp; g.connect(f2); out = f2; }
  s.connect(g); out.connect(dest);
  if (o.echo) out.connect(echoIn);
  s.start(t); s.stop(t + (o.a || .005) + dur + .05);
}
function noise(t, dur, vol, dest, type, freq, q = 1) {
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  env(g, t, .002, vol, dur);
  s.connect(f); f.connect(g); g.connect(dest);
  s.start(t, Math.random() * .5); s.stop(t + dur + .05);
}
const I = {
  kick(t, v = 1) { osc('sine', 150, t, .28, .9 * v, musicBus, { to: 42, slide: .12 }); },
  clap(t, v = 1) { noise(t, .13, .32 * v, musicBus, 'bandpass', 1700, .8); noise(t + .012, .1, .2 * v, musicBus, 'bandpass', 2200, .8); },
  shaker(t, v = 1) { noise(t, .045, .09 * v, musicBus, 'highpass', 7000); },
  talk(t, m, v = 1) { osc('sine', mtof(m + 7), t, .3, .35 * v, musicBus, { to: mtof(m), slide: .14 }); },
  bass(t, m, d, v = 1) { osc('triangle', mtof(m), t, d, .42 * v, musicBus, { lp: 700 }); osc('sine', mtof(m - 12), t, d, .3 * v, musicBus); },
  kalimba(t, m, v = 1, echo = false) {
    osc('sine', mtof(m), t, .5, .2 * v, musicBus, { echo });
    osc('sine', mtof(m) * 4.2, t, .08, .05 * v, musicBus);
  },
  guitar(t, m, v = 1) { osc('triangle', mtof(m), t, .16, .1 * v, musicBus, { lp: 2600 }); osc('square', mtof(m), t, .06, .025 * v, musicBus, { lp: 1800 }); },
  pad(t, m, d, v = 1) {
    for (const det of [-8, 7]) osc('sawtooth', mtof(m), t, d, .035 * v, musicBus, { a: .35, lp: 900, detune: det });
  },
};

/* ---------- songs ---------- */
// Lagos Sunset (First Steps): Afrobeat and highlife groove over C - Am - F - G.
const SUNSET = {
  bpm: lv => 108 + Math.min(lv - 1, 8) * 3,
  roots: [48, 45, 41, 43],
  chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],
  melody: [
    [[0, 79], [3, 76], [6, 79], [8, 81], [10, 79], [12, 76], [14, 74]],
    [[0, 76], [3, 72], [6, 76], [8, 79], [11, 81], [14, 79]],
    [[0, 81], [2, 79], [4, 77], [6, 81], [8, 84], [12, 81], [14, 79]],
    [[0, 79], [3, 83], [6, 86], [8, 83], [10, 79], [12, 74], [14, 76]],
  ],
  play(step, t, sd, lv) {
    const s = step % 16, bar = Math.floor(step / 16), b = bar % 4, phrase = Math.floor(bar / 4);
    if (s === 0 || s === 8 || (s === 11 && lv >= 2)) I.kick(t);
    if (s === 4 || s === 12) I.clap(t);
    I.shaker(t, s % 4 === 2 ? 1.3 : s % 2 ? .5 : .8);
    const bassSteps = { 0: 0, 3: 0, 6: 7, 8: 12, 11: 7, 14: 0 };
    if (bassSteps[s] != null) I.bass(t, this.roots[b] + bassSteps[s], sd * 1.8);
    if (s % 4 === 2) I.guitar(t, this.chords[b][(s / 4 | 0) % 2 ? 2 : 1] + 12);
    if (lv >= 3 && (s === 3 || s === 7 || s === 10 || s === 14)) I.talk(t, s === 7 ? 50 : 55, .8);
    if (phrase % 3 !== 2) for (const [ms, m] of this.melody[b]) if (ms === s) I.kalimba(t, m, 1);
    if (lv >= 5 && s % 2 === 1) I.shaker(t, .4);
  },
};
// Lagoon Dream (Pearl Hunt): soft and floaty over F - Dm - Bb - C.
const LAGOON = {
  bpm: lv => 84 + Math.min(lv - 1, 8) * 2.5,
  roots: [41, 38, 46, 48],
  chords: [[65, 69, 72], [62, 65, 69], [58, 62, 65], [60, 64, 67]],
  play(step, t, sd, lv) {
    const s = step % 16, b = Math.floor(step / 16) % 4, ch = this.chords[b];
    if (s === 0) for (const m of ch) I.pad(t, m, sd * 15);
    if (s === 0 || s === 10) I.bass(t, this.roots[b], sd * 5, .8);
    if (s % 2 === 0) I.kalimba(t, ch[(s / 2) % 3] + 12 + (s >= 8 ? 12 : 0), .6, true);
    if (lv >= 2 && (s === 4 || s === 12)) I.shaker(t, .8);
    if (lv >= 3 && (s === 0 || s === 8)) I.kick(t, .45);
    if (lv >= 4 && s % 4 === 3) osc('sine', mtof(ch[2] + 24), t, .08, .05, musicBus, { to: mtof(ch[2] + 31), slide: .06 });
  },
};
const SONGS = { run: SUNSET, dive: LAGOON };

let song = null, step = 0, nextT = 0, timer = null, level = 1;
export function playMusic(name) {
  if (!ensure()) return;
  stopMusic(true);
  song = SONGS[name]; step = 0; nextT = ac.currentTime + .08; level = 1;
  musicBus.gain.cancelScheduledValues(ac.currentTime);
  musicBus.gain.setValueAtTime(audio.musicOn ? .55 : 0, ac.currentTime);
  timer = setInterval(() => {
    if (!song) return;
    const sd = 60 / song.bpm(level) / 4;
    while (nextT < ac.currentTime + .15) { song.play(step, nextT, sd, level); step++; nextT += sd; }
  }, 25);
}
export function stopMusic(now) {
  if (timer) { clearInterval(timer); timer = null; }
  song = null;
  if (ac && !now) musicBus.gain.setTargetAtTime(0, ac.currentTime, .3);
}
export function setMusicLevel(lv) { level = lv; }

/* ---------- sound effects ---------- */
function fx(fn) { return (...a) => { if (!audio.sfxOn || !ensure() || document.hidden || paused) return; fn(ac.currentTime, ...a); }; }
let streak = 0, streakT = 0;
export const sfx = {
  click: fx(t => { osc('sine', 880, t, .06, .12, sfxBus); }),
  start: fx(t => { [523, 659, 784].forEach((f, i) => osc('triangle', f, t + i * .08, .14, .16, sfxBus)); osc('triangle', 1047, t + .24, .3, .18, sfxBus); }),
  // Each pearl in a quick run sounds a little higher, up to an octave.
  pearl: fx(t => {
    const now = performance.now(); streak = now - streakT < 900 ? Math.min(streak + 1, 12) : 0; streakT = now;
    const f = 988 * Math.pow(2, streak / 12);
    osc('sine', f, t, .1, .14, sfxBus); osc('sine', f * 1.5, t + .05, .14, .1, sfxBus);
  }),
  jump: fx(t => { osc('square', 300, t, .16, .06, sfxBus, { to: 620, slide: .12, lp: 1800 }); }),
  doubleJump: fx(t => { osc('square', 450, t, .16, .06, sfxBus, { to: 950, slide: .1, lp: 2400 }); osc('sine', 1400, t + .06, .1, .05, sfxBus); }),
  land: fx(t => { osc('sine', 120, t, .08, .2, sfxBus, { to: 60, slide: .06 }); }),
  swish: fx(t => { noise(t, .16, .18, sfxBus, 'bandpass', 1400, 1.2); osc('sine', 500, t, .1, .04, sfxBus, { to: 800 }); }),
  hit: fx(t => { osc('triangle', 260, t, .25, .3, sfxBus, { to: 90, slide: .2 }); noise(t, .08, .2, sfxBus, 'lowpass', 900); }),
  oops: fx(t => { osc('sine', 660, t + .05, .12, .12, sfxBus, { to: 440 }); osc('sine', 440, t + .2, .2, .12, sfxBus, { to: 330 }); }),
  bottle: fx(t => { for (let i = 0; i < 3; i++) osc('sine', 300 + i * 60, t + i * .09, .08, .14, sfxBus, { to: 520 + i * 60, slide: .07 }); }),
  heart: fx(t => { osc('sine', 660, t, .12, .14, sfxBus); osc('sine', 880, t + .1, .2, .14, sfxBus); osc('sine', 1320, t + .2, .25, .08, sfxBus); }),
  milestone: fx(t => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => osc('square', f, t + i * .085, .16, .06, sfxBus, { lp: 3000 })); }),
  levelUp: fx(t => { noise(t, .5, .2, sfxBus, 'bandpass', 900, .6); osc('sawtooth', 220, t, .45, .07, sfxBus, { to: 880, slide: .4, lp: 2000 }); osc('triangle', 1047, t + .4, .25, .12, sfxBus); }),
  gameOver: fx(t => { [784, 659, 523, 659, 784].forEach((f, i) => osc('triangle', f, t + i * .14, .25, .14, sfxBus)); }),
  danfo: fx(t => { for (const d of [0, .22]) { osc('square', 392, t + d, .16, .05, sfxBus, { lp: 1500 }); osc('square', 494, t + d, .16, .05, sfxBus, { lp: 1500 }); } }),
  keke: fx(t => { for (const d of [0, .12]) osc('square', 880, t + d, .07, .04, sfxBus, { lp: 2500 }); }),
  splash: fx(t => { noise(t, .5, .3, sfxBus, 'lowpass', 1600); noise(t + .05, .35, .12, sfxBus, 'highpass', 4000); }),
  bubble: fx(t => { osc('sine', 400 + Math.random() * 400, t, .07, .06, sfxBus, { to: 1100, slide: .05 }); }),
  oyster: fx(t => { osc('triangle', 180, t, .18, .12, sfxBus, { to: 260 }); [1319, 1568, 2093].forEach((f, i) => osc('sine', f, t + .12 + i * .07, .2, .1, sfxBus)); }),
  jelly: fx(t => { osc('sine', 500, t, .3, .22, sfxBus, { to: 160, slide: .25 }); osc('sine', 700, t + .05, .2, .08, sfxBus, { to: 300 }); }),
  // Mummy calling: a little two-note "Pe-arl!".
  mum: fx(t => { osc('triangle', 523, t, .14, .1, sfxBus, { to: 600, slide: .1 }); osc('triangle', 440, t + .16, .22, .1, sfxBus, { to: 392 }); }),
  caught: fx(t => { [392, 494, 587, 784].forEach((f, i) => osc('sine', f, t + i * .12, .4, .12, sfxBus)); osc('sine', 196, t, .9, .1, sfxBus); }),
  power: fx(t => { [784, 988, 1175, 1568].forEach((f, i) => osc('sine', f, t + i * .05, .12, .1, sfxBus)); noise(t, .3, .05, sfxBus, 'highpass', 6000); }),
  fire: fx(t => { noise(t, .35, .28, sfxBus, 'bandpass', 700, .7); osc('sawtooth', 160, t, .25, .06, sfxBus, { to: 420, slide: .2, lp: 1200 }); }),
  poof: fx(t => { noise(t, .25, .3, sfxBus, 'lowpass', 2500); [660, 880].forEach((f, i) => osc('square', f, t + .05 + i * .07, .08, .05, sfxBus, { lp: 2500 })); }),
  shieldPop: fx(t => { osc('sine', 900, t, .2, .16, sfxBus, { to: 300 }); noise(t, .12, .15, sfxBus, 'highpass', 3000); }),
  goat: fx(t => { const s = ac.createOscillator(), v = ac.createOscillator(), vg = ac.createGain(), g = ac.createGain(), f = ac.createBiquadFilter();
    s.type = 'sawtooth'; s.frequency.value = 330; v.frequency.value = 22; vg.gain.value = 30; v.connect(vg); vg.connect(s.frequency);
    f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 2; env(g, t, .02, .14, .45); s.connect(f); f.connect(g); g.connect(sfxBus);
    s.start(t); v.start(t); s.stop(t + .55); v.stop(t + .55); }),
  crow: fx(t => { for (const d of [0, .22]) { noise(t + d, .14, .2, sfxBus, 'bandpass', 1300, 3); osc('square', 420, t + d, .12, .04, sfxBus, { to: 300, lp: 1500 }); } }),
  puffer: fx(t => { osc('sine', 200, t, .25, .16, sfxBus, { to: 520, slide: .2 }); }),
  ink: fx(t => { noise(t, .2, .2, sfxBus, 'lowpass', 800); osc('sine', 300, t, .15, .1, sfxBus, { to: 120 }); }),
  fish: fx(t => { osc('sine', 1200, t, .06, .08, sfxBus, { to: 1700 }); osc('sine', 1500, t + .08, .08, .08, sfxBus, { to: 2100 }); }),
};
