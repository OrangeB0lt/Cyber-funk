# CYBER FUNK

*A Neon Orleans Jazz-Punk RPG.* "The city that care forgot never forgot how to play."

A complete text-based RPG in one self-contained HTML file, built for a phone. NEON ORLEANS, 2084: pick a New Orleans brass-band instrument, fight with music, tap On the One, take back the six Blue Notes from Metronome Corporation's lieutenants, and lead a second line on Metronome Tower to break the Click.

Vanilla JS, no frameworks, no images, no audio files. Sound is synthesized with the Web Audio API.

## 2.0 (in progress): run it with Docker

The game is being rebuilt in TypeScript and React (`src/`), with cloud saves in PostgreSQL (`server/`). Start the whole thing, game, API and database, with:

```bash
docker compose up --build -d --wait     # then open http://localhost:8080
```

To develop inside Docker with hot reload, run `docker compose -f compose.dev.yaml up --build` and open http://localhost:5173. See [docs/guides/docker.md](docs/guides/docker.md), and [docs/README.md](docs/README.md) for the documentation. The rest of this README describes v1, which now lives in `legacy/` and stays playable until the rebuild reaches parity.

## Play it (v1)

Open `dist/cyberfunk.html` in a browser. That's the whole game. Progress autosaves to `localStorage` (key `cyberfunk_save_v1`); Settings also has Export/Import Save as a text code.

Hidden dev menu: tap the version number on the title screen five times.

## Repo layout

```
src/
  01_data_core.js      tones, statuses, roots, SKILLS (player + enemy + boss moves), CLASSES, timing table
  02_data_enemies.js   ENEMIES, BOSSES (with per-boss AI), Blue Notes, note frequencies
  03_data_items.js     ITEMS, GEAR (instruments/threads/charms/mods), SHEET_MUSIC, BANDMATES, SECOND_LINE roster
  04_data_world.js     DISTRICTS, PLACES, NPCS, main-quest steps, QUESTS, BOUNTIES, street EVENTS, GLOSSARY
  05_engine.js         state, derived stats, progression, enemy factory, the combat engine and generic effect resolver (no DOM)
  06_ui_core.js        renderer, typewriter, lexicon linking, sheets/popups, menus (status, bag, gear, band, journal, book, lexicon, settings)
  07_ui_combat.js      battle screen, On the One timing bar, Play the Blues, victory/defeat, enemy group builder
  08_world.js          district hub, Hit the Streets, travel, shops, every place, NPC talks, side quests, mini-games
  09_story.js          prologue, boss pre/post scenes and the three choices, ball, second line, Tower, ending, NG+
  10_main.js           save/load/export/import, synthesized audio, title, character creation, dev menu, boot
  style.css            all styles (single dark neon theme)
build.js               concatenates src/ into dist/ (no bundler; the game itself has no build step)
dist/
  cyberfunk.html       the standalone game (complete HTML document)
  artifact.html        same page without the document skeleton, for hosts that wrap it
sim/
  sim.js               headless balance simulation: every class vs every district and boss
  trace.js             prints a single fight's log  (node sim/trace.js <class> <boss> <level>)
test/
  smoke.js             jsdom: drives the real UI through creation, menus, every place, every boss
  natural.js           jsdom: a legitimate no-cheat playthrough from prologue to ending
  stress.js            jsdom: repeated boss fights, detects loop stalls
  click.js             jsdom: traces the final Click fight step by step
  shots.py             Playwright: 360px screenshots and horizontal-overflow check
```

## Working on it

```
npm install          # jsdom, for the headless tests only
npm run build        # rebuild dist/ after editing src/
npm run sim          # balance numbers (tune BALANCE in src/05_engine.js)
npm test             # smoke test (~5 min)
npm run test:natural # full natural playthrough (~15-20 min)
```

`test/shots.py` needs Python with Playwright and a Chromium install.

### How the engine fits together

- **One state object** `S` holds everything and is what gets saved. `newState()` in `05_engine.js` is the schema; `migrate()` in `10_main.js` fills in missing fields on load.
- **One effect resolver.** Every skill, boss move, assist, and item is a list of effects (`dmg`, `status`, `heal`, `funk`, `cleanse`, `strip`, `guard`, `groove`, `fn`) resolved by `resolveSkill()`. It is actor-agnostic, which is how rivals, Session Clones, and Vox's Sample reuse player skills.
- **Combat is a pull loop.** `runUntilPlayer()` advances enemies until it needs the player; `playerAction()` applies the choice. The engine only emits `b.events`; the UI (`drainEvents`) animates them. The sim and tests use the engine without any DOM.
- **Content is data.** Adding an enemy, item, event, or glossary term is a new row in the matching table in `src/0x_data_*.js`. Story beats live in `08_world.js` (places/NPCs) and `09_story.js` (bosses, acts, ending).
- **Balance knobs** are in `BALANCE` at the top of the engine section of `05_engine.js`; boss stats in `makeEnemy()`; XP curve in `xpToNext()`.

## Credits

Written for a phone screen, in the spirit of the Social Aid & Pleasure Clubs who remember how to play. Dirge on the way there, dance on the way back.
