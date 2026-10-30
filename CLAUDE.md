# Pearl's World

A game I'm building for my baby daughter, Pearl. She's the main character. I'm her dad, Oluwashina, based in Lagos, Nigeria. This is a personal project made with love, so care about the small details.

## What exists today

The main game is **3D** (Three.js r170, vendored in `vendor/` so it works offline). Plain ES modules, no build step:

- `index.html`: page, CSS and menu (photo button, two game cards, piggy bank, "Classic 2D version" link, install button), HUD, banner, end card.
- `js/main.js`: renderer, camera, game flow shared by both games (hearts, pearls, `hurt()`, banner, end card, piggy bank), input routing, render loop with automatic quality step-down, menu wiring, photo upload.
- `js/common.js`: helpers, canvas textures, shared materials, **Pearl** (`makePearl`, `posePearl`, `setMermaid`, `applyPhoto`), confetti, sound (`sfx`), `textSprite` for speech bubbles.
- `js/runner.js`: **First Steps**. Lekki-Ikoyi Link Bridge at sunset (walkway with 3 lanes, danfos and keke on the roads, cable-stayed pylons with waving Nigerian flags, lagoon, palms, skyline). Swipe to change lanes, tap or swipe up to jump (double jump). Toy blocks and beach balls, pearls (rows and arcs over obstacles), bottles (+1 heart). Distance milestones switch crawl, toddle, run.
- `js/hunt.js`: **Pearl Hunt**. Pearl is a mermaid swimming forward through the lagoon (sand, sea grass, coral, rocks, starfish, light rays, bubbles). Touch where to swim: the touch is projected onto the water in front of her and she glides there (arrow keys too). Pearl trails and rings, oysters on the floor that open and close (+3 if she reaches one while open), friendly smiling jellyfish (lose a heart), fish that greet her ("Hi Pearl!", "Bawo ni, Pearl!", "Kedu, Pearl!", "Sannu, Pearl!"). Pearl-count milestones.
- Each game module exposes the same interface (`enter/exit/start/update/placeCamera/scoreText/finish` + pointer and key handlers), so adding a level means adding a module.
- Camera sits in front of Pearl on the menu and end card (so her face shows) and behind her while playing. At each milestone she turns round and waves while the way ahead is cleared.
- `classic/`: the original 2D canvas game, kept as "Classic 2D version". `3d/` redirects to the main page (old link).
- `?debug` exposes `window.__pw` so tests can fast-forward. Headless tests render 3D in software at about 5 fps, so check real smoothness on a phone.

Shared features:
- Photo upload: center-cropped to 200x200 JPEG, stored in localStorage (`pw_face`), shown on the 3D Pearl's face. Falls back to the cartoon face.
- Storage: piggy bank `pw_bank`, best walk `pw_best`, mute `pw_mute`, last game shown on the menu `pw_last`. Shared with the classic game.
- WebAudio beeps for sound effects.
- Installable on phones (PWA): `manifest.webmanifest`, `sw.js` (offline cache), `icons/`. When adding files the game needs offline, list them in `sw.js` and bump its `VERSION`.

## Design direction

- Palette: ink `#24163d`, pearl `#fff8f0`, coral `#ff6b4a`, lagoon `#0f8a8f`, sun `#ffc93c`, blush `#ff5c8a`.
- Chunky toy-like UI: thick ink borders, pearl-white cards, bottom drop shadows.
- Lagos and Nigerian details are the soul of it. Keep adding them (Third Mainland Bridge, Eko Atlantic, jollof, agege bread, ankara patterns, keke, okada).
- Must work great on an Android phone in portrait. That's the main device.
- Gentle for a child: no harsh fail states, no scary enemies, lots of celebration.

## Roadmap ideas (my priorities, in rough order)

1. ~~Split into a proper project (Vite or plain modules).~~ Done for the 3D game (plain ES modules).
2. Better art: a nicer 3D Pearl model (AI generator or artist) could replace the code-built one later.
3. Record real sounds: my voice saying "Go Pearl!", her laughs, as pickup and milestone sounds.
4. Milestone editor: so I can add her real milestones with dates as they happen (a living baby book).
5. More levels: grandma's house, the market, Lekki Conservation Centre canopy walk, Christmas level.
6. ~~Make it installable on Android (PWA, works offline).~~ Done.
7. Later: connect the piggy bank to the Pearl wallet project (her crypto wallet app) so pearls teach saving.

## Hosting

Live at https://petermuller99.github.io/pearls-world/ (GitHub Pages, deploys from `main`). Claude works on its own branch, opens a pull request into `main`, and merges it itself once the change is tested and playable (Oluwashina's standing permission). Merging is what makes a change live. All paths must stay relative because the site lives under `/pearls-world/`.

## Working rules

- No em dashes in any text I see.
- Keep it playable after every change. Test at phone width (around 390x800) and landscape.
- Ask me before big structural rewrites.
