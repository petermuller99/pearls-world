// Offline support for Pearl's World.
// Game files: serve from cache straight away, refresh the cache in the background,
// so the game opens instantly offline and picks up updates on the next launch.
// Bump VERSION when the list of files below changes.
const VERSION = 'pw-v12';
const SHELL = [
  './',
  'index.html',
  'js/main.js',
  'js/common.js',
  'js/audio.js',
  'js/chase.js',
  'js/shop.js',
  'js/daddy.js',
  'js/runner.js',
  'js/hunt.js',
  'vendor/three.module.min.js',
  'js/gfx.js',
  'vendor/addons/postprocessing/EffectComposer.js',
  'vendor/addons/postprocessing/RenderPass.js',
  'vendor/addons/postprocessing/UnrealBloomPass.js',
  'vendor/addons/postprocessing/OutputPass.js',
  'vendor/addons/postprocessing/ShaderPass.js',
  'vendor/addons/postprocessing/Pass.js',
  'vendor/addons/postprocessing/MaskPass.js',
  'vendor/addons/effects/OutlineEffect.js',
  'vendor/addons/shaders/CopyShader.js',
  'vendor/addons/shaders/LuminosityHighPassShader.js',
  'vendor/addons/shaders/OutputShader.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return;

  e.respondWith(
    caches.open(VERSION).then(async cache => {
      // Pages are cached by their path alone, so "./?source=pwa" and "./" share one entry.
      const nav = req.mode === 'navigate';
      const key = nav ? url.origin + url.pathname : req;
      const cached = await cache.match(key, { ignoreSearch: nav });
      const fresh = fetch(req)
        .then(res => {
          if (res.ok || res.type === 'opaque') cache.put(key, res.clone());
          return res;
        })
        .catch(() => cached);
      if (cached) {
        e.waitUntil(fresh);
        return cached;
      }
      return fresh;
    })
  );
});
