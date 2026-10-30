# Pearl's World

A game I'm building for my baby daughter, Pearl. She's the main character. I'm her dad, Oluwashina, based in Lagos, Nigeria. This is a personal project made with love, so care about the small details.

## What exists today (v1)

`index.html` is a single self-contained file: HTML + CSS + vanilla JS drawing on one `<canvas>`. No build step, no dependencies except Google Fonts (Bagel Fat One, Nunito).

Two mini games:

1. **First Steps** (runner): Pearl crawls, then toddles, then runs across a Lagos sunset scene (skyline, Lekki-Ikoyi Link Bridge with a Nigerian flag, yellow danfo bus, palm trees, beach). Tap to jump, double jump allowed. Obstacles: toy ABC blocks, beach balls. Pickups: pearls, baby bottles (+1 heart). 3 hearts. Distance milestones trigger banners and confetti: first smile, first word "Dada", first tooth, first steps (switches to toddle), off she runs (switches to run), 1st birthday, and more.
2. **Pearl Hunt** (underwater): Pearl is a little mermaid. Hold and drag (or arrow keys) to swim. Collect pearls, open oysters (+3), avoid jellyfish. Some fish say "Hi Pearl!". Pearl-count milestones.

Shared features:
- Photo upload: center-cropped to 200x200 JPEG, stored in localStorage (`pw_face`), drawn as a circular head with a pink bow. Falls back to a drawn cartoon Pearl (brown skin, puff hair, bow).
- Piggy bank: total pearls across all games (`pw_bank`), best walk distance (`pw_best`), mute (`pw_mute`).
- WebAudio beeps for sound effects.
- Installable on phones (PWA): `manifest.webmanifest`, `sw.js` (offline cache), `icons/` (cartoon Pearl head on a sunset). Menu shows a "Put Pearl's World on this phone" button when Chrome offers install. When adding new files the game needs offline, list them in `sw.js` and bump its `VERSION`.
- Logical coordinate system: `S = min(h/400, w/460)`, world is `VW x VH` logical units. Ground at `VH - 60`.

## Design direction

- Palette: ink `#24163d`, pearl `#fff8f0`, coral `#ff6b4a`, lagoon `#0f8a8f`, sun `#ffc93c`, blush `#ff5c8a`.
- Chunky toy-like UI: thick ink borders, pearl-white cards, bottom drop shadows.
- Lagos and Nigerian details are the soul of it. Keep adding them (Third Mainland Bridge, Eko Atlantic, jollof, agege bread, ankara patterns, keke, okada).
- Must work great on an Android phone in portrait. That's the main device.
- Gentle for a child: no harsh fail states, no scary enemies, lots of celebration.

## Roadmap ideas (my priorities, in rough order)

1. Split into a proper project (Vite or plain modules): scenes, entities, assets, audio.
2. Better art: proper sprite sheets for Pearl (crawl, toddle, run, swim), parallax layers as images.
3. Record real sounds: my voice saying "Go Pearl!", her laughs, as pickup and milestone sounds.
4. Milestone editor: so I can add her real milestones with dates as they happen (a living baby book).
5. More levels: grandma's house, the market, Lekki Conservation Centre canopy walk, Christmas level.
6. ~~Make it installable on Android (PWA, works offline).~~ Done.
7. Later: connect the piggy bank to the Pearl wallet project (her crypto wallet app) so pearls teach saving.

## Hosting

Live at https://petermuller99.github.io/pearls-world/ (GitHub Pages, deploys from `main`). Claude works on its own branch; changes go live only when merged into `main`. All paths must stay relative because the site lives under `/pearls-world/`.

## Working rules

- No em dashes in any text I see.
- Keep it playable after every change. Test at phone width (around 390x800) and landscape.
- Ask me before big structural rewrites.
