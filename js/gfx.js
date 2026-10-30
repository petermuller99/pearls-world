// Graphics quality: soft real-time shadows, glow (bloom) on bright things, and cartoon
// outlines on the characters. Setting is Auto, Low or High (`pw_gfx`). Auto starts on
// High and switches effects off one by one if the phone keeps dropping frames.
import { THREE, M, store } from './common.js';
import { EffectComposer } from '../vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/addons/postprocessing/OutputPass.js';
import { Pass } from '../vendor/addons/postprocessing/Pass.js';
import { OutlineEffect } from '../vendor/addons/effects/OutlineEffect.js';

export function createGfx(renderer, scene, camera) {
  let setting = ['auto', 'low', 'high'].includes(store.get('pw_gfx', 'auto')) ? store.get('pw_gfx', 'auto') : 'auto';
  // What is actually on right now. Auto may turn things off to keep the game smooth.
  const on = { shadows: true, bloom: true, outline: true };
  const maxRatio = Math.min(devicePixelRatio || 1, 2);
  let ratio = maxRatio, autoStep = 0, light = null;

  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const outline = new OutlineEffect(renderer, { defaultThickness: .0045, defaultColor: [.14, .09, .24], defaultAlpha: 1 });
  // Draws the outlines on top of what is already in the buffer.
  class OutlineOnly extends Pass {
    constructor() { super(); this.needsSwap = false; }
    render(r, writeBuffer, readBuffer) { r.setRenderTarget(this.renderToScreen ? null : readBuffer); outline.renderOutline(scene, camera); }
  }
  const composer = new EffectComposer(renderer);
  const outlinePass = new OutlineOnly();
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .5, .45, .9);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(outlinePass);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function apply() {
    const high = setting !== 'low';
    on.shadows = high && autoStep < 3; on.bloom = high && autoStep < 2; on.outline = high && autoStep < 2;
    ratio = setting === 'low' ? 1 : autoStep >= 1 ? Math.min(maxRatio, 1.5) : maxRatio;
    if (autoStep >= 3) ratio = 1;
    renderer.setPixelRatio(ratio);
    if (renderer.shadowMap.enabled !== on.shadows) {
      renderer.shadowMap.enabled = on.shadows;
      scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
    }
    // Soft blob shadows stand in when real shadows are off.
    M.shadow.visible = !on.shadows;
    if (light) light.castShadow = on.shadows;
    outlinePass.enabled = on.outline;
  }

  // Marks what casts shadows and which materials get outlines. Runs every half second
  // so newly spawned toys, goats and fish are included.
  let tagT = 0;
  function tag() {
    scene.traverse(o => {
      if (!o.isMesh) return;
      const mats = [].concat(o.material), m = mats[0];
      o.castShadow = on.shadows && !(m.isMeshBasicMaterial || m.transparent) && !o.userData.noShadow;
      for (const x of mats) if (!x.userData.outlineParameters) x.userData.outlineParameters = { visible: !!x.userData.outline };
    });
  }

  return {
    get setting() { return setting; },
    get on() { return on; },
    setSetting(s) { setting = s; autoStep = 0; store.set('pw_gfx', s); apply(); tag(); },
    // The world's main sun or overhead light casts the shadows.
    setShadowLight(l, size = 8) {
      if (light && light !== l) light.castShadow = false;
      light = l;
      const c = l.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = .5; c.far = 40; c.updateProjectionMatrix();
      l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -.0006; l.shadow.normalBias = .03; l.shadow.radius = 3;
      apply();
    },
    resize(w, h) { composer.setPixelRatio(ratio); composer.setSize(w, h); bloom.resolution.set(w / 2, h / 2); },
    render(dt) {
      tagT -= dt; if (tagT <= 0) { tagT = .5; tag(); }
      if (on.bloom) composer.render(dt);
      else { renderer.render(scene, camera); if (on.outline) outline.renderOutline(scene, camera); }
    },
    // Called every 2 s with how many frames ran slow; Auto steps quality down if needed.
    slowFrames(count, onResize) {
      if (setting === 'auto' && count > 50 && autoStep < 3) { autoStep++; apply(); onResize(); return true; }
      if (setting === 'high' && count > 50 && ratio > 1) { ratio = Math.max(1, ratio - .5); renderer.setPixelRatio(ratio); onResize(); return true; }
      return false;
    },
    init() { apply(); tag(); },
  };
}
