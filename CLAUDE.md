# Pearl's World

A game I'm building for my baby daughter, Pearl. She's the main character. I'm her dad, Oluwashina, based in Lagos, Nigeria. This is a personal project made with love, so care about the small details.

## What exists today

The main game is **3D** (Three.js r170, vendored in `vendor/` so it works offline). Plain ES modules, no build step:

- `index.html`: page, CSS and menu (photo button, "Pearl's look" button, two game cards, piggy bank, install button), look panel, HUD, banner, end card.
- `js/main.js`: renderer, camera, game flow shared by both games (hearts, pearls, `hurt()`, banner, end card, piggy bank), input routing, render loop with automatic quality step-down, menu wiring, photo upload.
- `js/common.js`: helpers, canvas textures, shared materials, **Pearl** (`makePearl`, `posePearl`, `setMermaid`, `applyPhoto`, `applyLook`, `LOOKS`), confetti, `textSprite` for speech bubbles.
- `js/audio.js`: all sound, made live with WebAudio (nothing to download). Two original songs that speed up and add layers with the level: "Lagos Sunset" (First Steps: Afrobeat/highlife groove, talking drum, highlife guitar, kalimba melody) and "Lagoon Dream" (Pearl Hunt: pads, echoing kalimba arpeggio). `sfx` has a sound for every event (pearl ding that rises on a streak, jump/double jump/land, swish, bonk + "oops", milk glug, heart, milestone fanfare, level-up whoosh, game over jingle, danfo horn and keke beep as they pass, splash, bubbles, oyster sparkle, jellyfish boing, fish chirp). `unlock()` must run from a tap. Separate music and sound buttons in the HUD.
- `js/runner.js`: **First Steps**. Lekki-Ikoyi Link Bridge at sunset (walkway with 3 lanes, danfos and keke on the roads, cable-stayed pylons with waving Nigerian flags, lagoon, palms, skyline). Swipe to change lanes, tap or swipe up to jump (double jump). Toy blocks and beach balls, pearls (rows and arcs over obstacles), bottles (+1 heart). Distance milestones switch crawl, toddle, run.
- `js/hunt.js`: **Pearl Hunt**. Pearl is a mermaid swimming forward through the lagoon (sand, sea grass, coral, rocks, starfish, light rays, bubbles). Touch where to swim: the touch is projected onto the water in front of her and she glides there (arrow keys too). Pearl trails and rings, oysters on the floor that open and close (+3 if she reaches one while open), friendly smiling jellyfish (lose a heart), fish that greet her ("Hi Pearl!", "Bawo ni, Pearl!", "Kedu, Pearl!", "Sannu, Pearl!"). Pearl-count milestones. Heart bubbles (+1 heart) appear when she has lost a heart.
- **Difficulty** keeps rising, shown as "Level N" in the HUD with a level-up banner and sound, and the music speeds up. First Steps: a level every 200 m (max 12), speed `stage base + 0.0035 x distance` (max 17), toys closer together, two lanes blocked from level 3, beach balls rolling at her from level 4. Pearl Hunt: a level every 25 s (max 12), speed 4 up to 11, more jellyfish (two per row from level 3, drifting sideways from level 4), oysters open for less time.
- Each game module exposes the same interface (`enter/exit/start/update/placeCamera/scoreText/finish` + pointer and key handlers), so adding a level means adding a module.
- Camera sits in front of Pearl on the menu and end card (so her face shows) and behind her while playing. At each milestone she turns round and waves while the way ahead is cleared.
- `3d/` redirects to the main page (old link from the 3D prototype). The original 2D game has been removed; it is in git history if ever needed.
- `?debug` exposes `window.__pw` so tests can fast-forward. Headless tests render 3D in software at about 5 fps, so check real smoothness on a phone.

Shared features:
- Photo upload: center-cropped to 200x200 JPEG, stored in localStorage (`pw_face`) on the phone only, shown on the 3D Pearl's face with a soft faded edge. Her skin tone is read from the photo and applied to her body. Falls back to the cartoon face. Never commit Pearl's photos to this public repo.
- Pearl's look (`pw_look`): skin tone (7 swatches + "From photo"), hair (baby curls, short curls, two puffs, one puff, gele), hair colour, bow style (headband bow or little bow) and colour or none, outfit (sage ribbed romper or 5 ankara colourways), striped socks or none. She always has little ears with gold studs, lace flutter sleeves and chubby cheeks.
- Defaults were matched to a photo Oluwashina shared (the photo itself is not in the repo): warm deep brown skin `#8f6038`, soft near-black baby curls `#1c1410`, a big sage headband bow `#bfe0b5`, sage ribbed romper with lace sleeves, striped socks, white sandals, tiny gold stud earrings.
- Storage: piggy bank `pw_bank`, best walk `pw_best`, sound effects off `pw_mute`, music off `pw_music_off`, last game shown on the menu `pw_last`.
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
