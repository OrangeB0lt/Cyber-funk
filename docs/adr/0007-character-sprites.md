# ADR-0007: Character sprites as typed pixel grids, drawn as SVG

- **Status:** Accepted (2026-11-07)

## Context

The game was text only: enemies were text cards and dialogue was a coloured name over a line. The owner asked for simple pixel art for every character, whether hero, speaker, vendor, enemy or boss: about 90 sprites, all on a 360px phone, offline-capable (P5 makes it a PWA), and kept in step with content as P3 ports the remaining districts. The art had to follow the project's rules:
- presentation only, during the behaviour freeze
- mistakes caught at compile time
- the engine and the sim untouched

## Decision

1. **Sprites are data: one character per pixel, in TypeScript.**
   - Each row of the sprite table (`SpriteTable` in `core/types/sprites.ts`) is either a grid or a variant:
     - A grid is 24 strings of 24 characters (32×32 for bosses), plus `keys` that map each character to a palette colour name.
     - A variant is another sprite's pixels with a `recolor` and/or an `overlay`.
   - The palette is 80 named colours (`PALETTE_IDS`, `content/sprites/palette.ts`), and its neon entries equal `tokens.css`.
   - Design rules and a card per character: `docs/vision/character-design.md`. The validator checks the card list and the palette table against the code.
2. **Ids make missing art a compile error.**
   - An opponent's id is its sprite id. Heroes and Session Clones are template ids (`hero_${ClassId}`, `clone_${ClassId}`). Everyone else is in `PERSON_SPRITE_IDS`.
   - `SPRITES` is a full `Table<SpriteId, SpriteDef>`, so a new enemy, class or person without art doesn't compile.
   - Speakers map to art through `NPC_SPRITE: Record<NpcId, …>`, so a new speaker without art doesn't compile either.
   - A type-level guard stops a person id from ever reusing an opponent id. (NpcId `valet` and EnemyId `valet` are different people.)
3. **Art lives in content, but only the UI and tools may load it.**
   - `content/sprites/` holds the grids, the palette and the pure compiler.
   - A depcruise rule (`sprites-ui-and-tools-only`) forbids importing it from core, narrative, engine, app or any other content. It is never re-exported from `content/index.ts` or `content/data.ts`, so the sim, the parity oracles and headless sessions never load art.
   - The compiler can't live in `ui/`, because `tools/` (the doc export and the validator) may not import `ui/`.
4. **Drawn as inline SVG at whole-number scales.**
   - `compileSprite` merges each colour's pixels into horizontal runs: one `<path>` per colour, `shape-rendering="crispEdges"`, with the viewBox in pixel units.
   - The `Sprite` component scales to 3× in battle (72px; bosses 96px) and 2× for portraits and sheet rows (48px).
   - Effects (`ghost`, `holo`, `glitch`), the glow, the idle bob and the hit flash are CSS, so reduce motion stops them. Each effect also has a static look.
   - No image files, no loading, nothing to precache.
5. **Small, additive scene and view fields carry *who* to the UI.** All of these are optional:
   - `StoryLineSpec.npc` (set by `say`) and `StoryLineSpec.sprite` (a new optional fourth argument to `speak`)
   - `keeper` on shop requests
   - on `ActorView`: `defId` typed as `OpponentId | 'player'`, plus `cls` and `clone`, so the battle draws a Session Clone as the clone of the class it copied
   - `Float.kind`

   The transcript oracle records only who and text, and the shop oracle only the title, so parity is unaffected.

## Consequences

- Adding a character means an id, a doc card and a grid, and `npm run check` says what's missing. `npm run sprites:export` regenerates the gallery in `docs/reference/sprites/`, and a test fails when the gallery is stale.
- The art adds about 80 KB raw (10–15 KB gzipped) to the main bundle. P5 can split it out if load time needs that.
- Sprites are reviewable in diffs and greppable. A grid is hard to draw by hand without the gallery, and the dev menu's Sprite gallery and the exported SVGs exist for that.
- P4's gate of "screenshots side by side with v1" will differ wherever sprites appear. That is by design.

## Alternatives considered

- **PNG or sprite-sheet files under `public/`.** These need an asset pipeline and precaching, can't be type-checked against ids, and are opaque in review. Recolouring, as the Session Clones and Hush ranks need, would mean more files.
- **A procedural paper-doll (bodies, heads, outfits composed at runtime).** Faster to fill out, but the cast would look samey, and non-humanoids (gators, drones, the Click) need bespoke grids anyway. Variants cover the reuse we actually have.
- **Canvas rendering.** No advantage at these sizes, and inline SVG scales crisply, inherits CSS filters and needs no lifecycle code.
- **Keying art directly by NpcId, EnemyId and ClassId.** Speakers who reuse a boss's art, the two different valets, and shopkeepers with no NpcId all needed an indirection. A single SpriteId space with one mapping table keeps that in one place.
