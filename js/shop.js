// The market stall: permanent upgrades bought with pearls from the piggy bank.
// Levels are saved per phone in `pw_upgrades`; `upgradeEffects()` turns them into
// the numbers the games use (read as `S.up`).
import { store } from './common.js';

export const UPGRADES = [
  { id: 'fire', icon: '🔥', name: 'Fire pouch', costs: [60, 150, 300],
    says: ['Start with 0 fireballs, power-ups give 5', 'Start with 2 fireballs, power-ups give 6', 'Start with 4 fireballs, power-ups give 7', 'Start with 6 fireballs, power-ups give 8'] },
  { id: 'shield', icon: '🛡️', name: 'Stronger shield', costs: [50, 120, 250],
    says: ['Shield lasts 12 s', 'Shield lasts 16 s', 'Shield lasts 20 s', 'Shield lasts 25 s'] },
  { id: 'magnet', icon: '🧲', name: 'Super magnet', costs: [50, 120, 250],
    says: ['Magnet lasts 9 s', 'Magnet lasts 12 s and reaches further', 'Magnet lasts 15 s and reaches further', 'Magnet lasts 18 s and reaches furthest'] },
  { id: 'head', icon: '👟', name: 'Head start', costs: [80, 180, 350],
    says: ['Mummy starts close behind', 'Mummy starts a bit further back', 'Mummy starts further back', 'Mummy starts far back'] },
  { id: 'quick', icon: '🍼', name: 'Quick feet', costs: [70, 160, 320],
    says: ['Pearl pulls away at normal speed', 'Pearl pulls away 20% faster', 'Pearl pulls away 40% faster', 'Pearl pulls away 60% faster'] },
  { id: 'luck', icon: '🍀', name: 'Lucky finds', costs: [60, 140, 280],
    says: ['Power-ups at normal rate', 'Power-ups 35% more often', 'Power-ups 70% more often', 'Power-ups twice as often'] },
  // Zombie Defence
  { id: 'zAuto', group: 'zombie', icon: '🤖', name: 'Auto blaster', costs: [100, 250, 500],
    says: ['You fire only when you touch', 'Fires by itself, slowly, when you are not touching', 'Fires by itself at medium speed', 'Fires by itself at full speed'] },
  { id: 'zRate', group: 'zombie', icon: '⚡', name: 'Rapid fire', costs: [80, 200, 400],
    says: ['Normal fire rate', 'Fire 18% faster', 'Fire 39% faster', 'Fire 67% faster'] },
  { id: 'zDmg', group: 'zombie', icon: '💪', name: 'Power shots', costs: [80, 200, 400],
    says: ['Normal damage', '30% more damage', '60% more damage', 'Double damage'] },
  { id: 'zFam', group: 'zombie', icon: '👨‍👩‍👧', name: 'Family training', costs: [70, 180, 360],
    says: ['Helpers shoot slowly and miss a lot', 'Helpers shoot 25% faster and aim better', 'Helpers shoot 55% faster and aim well', 'Helpers shoot twice as fast and rarely miss'] },
  { id: 'zSeed', group: 'zombie', icon: '🌶️', name: 'Garden starter', costs: [90, 220, 450],
    says: ['Start with an empty yard', 'Start with 1 Pepper Shooter planted', 'Start with 2 Pepper Shooters planted', 'Start with 3 Pepper Shooters planted'] },
  { id: 'zCash', group: 'zombie', icon: '💰', name: 'Rich start', costs: [60, 150, 300],
    says: ['Start with ₦150', 'Start with ₦250', 'Start with ₦350', 'Start with ₦500'] },
];
export const MAX_LEVEL = 3;

export function loadUpgrades() {
  const saved = store.get('pw_upgrades', {});
  const lv = {};
  for (const u of UPGRADES) lv[u.id] = Math.max(0, Math.min(MAX_LEVEL, saved[u.id] | 0));
  return lv;
}
export function saveUpgrades(lv) { store.set('pw_upgrades', lv); }

export function upgradeEffects(lv) {
  return {
    startAmmo: [0, 2, 4, 6][lv.fire],
    firePack: [5, 6, 7, 8][lv.fire],
    shieldTime: [12, 16, 20, 25][lv.shield],
    magnetTime: [9, 12, 15, 18][lv.magnet],
    magnetReach: [7, 9, 11, 13][lv.magnet],
    headStart: [0, 1, 2, 3][lv.head],
    regen: [1, 1.2, 1.4, 1.6][lv.quick],
    luck: [1, 1.35, 1.7, 2][lv.luck],
    zAuto: lv.zAuto, zRate: [1, .85, .72, .6][lv.zRate], zDmg: [1, 1.3, 1.6, 2][lv.zDmg],
    zFam: [1, .8, .65, .5][lv.zFam], zAim: [1, .7, .45, .25][lv.zFam],
    zSeed: lv.zSeed, zCash: [150, 250, 350, 500][lv.zCash],
  };
}

// Draws the stall's rows into `list`. `onBuy(upgrade)` is called when Buy is tapped.
export function renderShop(list, lv, bank, onBuy) {
  list.textContent = '';
  let group = null;
  for (const u of UPGRADES) {
    const g = u.group || 'run';
    if (g !== group) {
      group = g;
      const h = document.createElement('h3'); h.className = 'shopGroup';
      h.textContent = g === 'zombie' ? 'Zombie Defence' : 'First Steps and Pearl Hunt';
      list.appendChild(h);
    }
    const level = lv[u.id], maxed = level >= MAX_LEVEL, cost = u.costs[level];
    const row = document.createElement('div'); row.className = 'item';
    const icon = document.createElement('span'); icon.className = 'icon'; icon.textContent = u.icon; icon.setAttribute('aria-hidden', 'true');
    const info = document.createElement('div'); info.className = 'info';
    const name = document.createElement('b'); name.textContent = u.name;
    const pips = document.createElement('span'); pips.className = 'pips'; pips.setAttribute('aria-label', `Level ${level} of ${MAX_LEVEL}`);
    for (let i = 0; i < MAX_LEVEL; i++) { const p = document.createElement('i'); if (i < level) p.className = 'on'; pips.appendChild(p); }
    const now = document.createElement('span'); now.className = 'now';
    now.textContent = maxed ? u.says[level] : `Next: ${u.says[level + 1]}`;
    info.append(name, pips, now);
    const buy = document.createElement('button'); buy.className = 'btn buy';
    if (maxed) { buy.textContent = 'Maxed!'; buy.disabled = true; }
    else {
      buy.textContent = `${cost} ⚪`; buy.setAttribute('aria-label', `Buy ${u.name} for ${cost} pearls`);
      buy.disabled = bank < cost;
      buy.onclick = () => onBuy(u);
    }
    row.append(icon, info, buy);
    list.appendChild(row);
  }
}
