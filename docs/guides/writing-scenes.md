# Writing scenes

*A cookbook for story content: place options, NPC talks, events, boss scenes. Read [narrative-runtime.md](../architecture/narrative-runtime.md) for how it works underneath. The API is SceneContext v1 ([ADR-0004](../adr/0004-scene-api.md)): changes go through an ADR.*

## The shape

A scene is an async function that gets the scene API, `s`, and returns when it's done:

```ts
import type { Scene } from '@narrative/types';

export const askAboutTheHush: Scene = async s => {
  s.title('Congo Square');
  await s.narrate('The drummers stop when a Click-Drone passes. Then, very quietly, they start again.');
  await s.say('mamaroux', '"They can tax the noise. They can\'t tax the beat."');
};
```

- **Put it in a `*.scene.ts` file** under the district it belongs to (`content/districts/treme/places.scene.ts`). Only `.scene.ts` files may import `@narrative/*`; the layer check (`npm run depcruise`) enforces it.
- **Always `await`** anything that shows something: `narrate`, `say`, `choose`, `confirm`, `sheet`, `xp`, `fight`, `boss`, `giveNote`, `goto`. Forgetting an `await` makes lines race each other. ESLint's `no-floating-promises` rule fails the lint on it in every `*.scene.ts` file.
- **When the scene returns**, the player is back where they started (the place or the district screen). You never navigate "back".

## Showing text

```ts
s.title('Mama Roux\'s Kitchen');                     // new story screen with a heading (null: no heading)
await s.narrate('Steam, garlic, and a radio playing a station that went dark in 2061.');
await s.say('mamaroux', '"Sit."');                    // an NPC from content/npcs.ts (typed id; name and color come from there)
await s.speak('A voice in the static', '#3fb6ff', '"…"'); // a one-off speaker
s.toast('+1 Mojo');                                   // a brief message (no await)
```

- **Lexicon links.** Words that match a glossary entry link automatically, once per line. Force a link with `[[second line]]`, or show different text with `[[hush|the Hush]]`. The content validator fails on a link to a term that doesn't exist.
- **Quotes.** Dialogue keeps its quote marks inside the string, as in v1.

## Choices

```ts
const pick = await s.choose({
  pay: `Pay her (${fmtD(price)})`,
  haggle: { label: 'Haggle', hint: true },
  walk: { label: 'Walk away', silent: true },
  bribe: { label: 'Slip her a Gris-Gris', when: s.count('grisgris') > 0 },
}, 'She names a price.');

if (pick === 'pay') { … }                // `pick` is typed 'pay' | 'haggle' | 'walk' | 'bribe'
```

- **Keys** are stable identifiers. They become test ids (`choice:haggle`) and the transcript oracle compares them. Rename a key only when the meaning changes.
- **`when: false`** hides the option. **`hint`** highlights it. **`silent`** skips echoing the label as the player's line.
- **The optional second argument** is a prompt line shown above the buttons.
- **Yes/no as a dialog:** `if (await s.confirm('Leave the city?', 'You won\'t be back.', 'Go', 'Stay')) …`

## State

```ts
s.flags.set('hushHint');                      // one-time beats; every flag is documented in core/ids/flags.ts
if (s.flags.has('metRoux')) …

if (s.story.is({ act: 'treme', step: 'congo_square' })) …   // exact step
if (s.story.reached({ act: 'quarter', step: 'main_stage' })) …   // at or past
s.story.set({ act: 'treme', step: 'win_street_fights' });

s.setQuest('horn', 'active');                 // side quests: undefined → 'active' → 'done'
if (s.quest('horn') === 'done') …
s.counter('hornFights');                      // read a progress counter
s.choice('vox', 'redeemed');                  // the three big boss decisions (typed values)

s.game.day += 1;                              // simple fields can be written directly
```

**Adding a new flag:** add it to `FLAG_IDS` in `core/ids/flags.ts` with a doc comment saying what sets it and what reads it.

**Adding a story step:** add it to the act's list in `core/ids/story.ts` and give it a row in `content/story/acts.ts` (journal text, where, optional `hintPlace` and `progress`). The journal, the district "!" hint and the dev-menu jumps follow automatically.

## Rewards and costs

```ts
s.give('gumbo');                 // toast "Got Gumbo."
s.give('pralines', 3, { silent: true });
if (!s.take('subtape')) { … }    // false if the player had none
s.count('kingcake');

if (!s.gold(-price)) { await s.narrate('You don\'t have it.'); return; }  // spending fails if short
s.gold(s.scaleGold(40));         // gains toast; scaleGold/scaleXp grow rewards with level
await s.xp(s.scaleXp(30));       // awaits the level-up popups

s.heal(0.5); s.funk(0.25); s.rest();
s.nextFight({ hyped: true });    // buffs for the next battle
s.bookHint('captain_hush');      // the Blue Book shows that weakness early
s.gainGear('thr_secondline', { equip: true });
s.recruit('sugar');
await s.giveNote('C');           // the chime, the quote, the count
```

## Checks and randomness

```ts
if (s.check('mojo', 0.4, true)) { … }   // 40% + 1.5% per Mojo point (+15% for Yat roots), clamped to 10–95%
const line = s.rng.pick(['…', '…', '…']);
if (s.rng.chance(0.25)) { … }
```

Use **`s.rng`** only. It's the seeded game stream, so the same save and choices replay the same way, which tests and bug reports depend on. `Math.random` is a lint error in content.

## Fights

```ts
const r = await s.fight({ enemies: ['hush_patrol', 'hush_patrol'] });   // 'win' | 'fled'
const r = await s.fight({ enemies: 'random' });                          // a street group from the district pool
await s.fight({ enemies: ['hush_sergeant'], level: 4, noFlee: true, ambush: true, intro: 'He was waiting.' });
```

- **Losing a street fight never returns.** The player wakes at the club, and the code after the `await` doesn't run, as in v1. So write the win path straight after the fight, and handle `'fled'` if SPLIT is allowed.
- **Bosses** use `await s.boss('captain_hush')`. It runs the boss's `pre` scene (first time), the fight with retries, then the `post` scene and the next act. Write `pre`/`post` in `content/bosses/<boss>.scene.ts` and register them in `BOSS_SCENES`.

## Minigames

```ts
const grade = await s.timing();   // one On the One bar (auto rhythm rolls instead); grade.id is 'one' | 'pocket' | 'loose' | 'clams'
s.board(rows.join('\n'));        // a fixed-width block in the story; each call redraws it in place
await s.wait(220);                // between frames (instant in tests and turbo)
```

The sit-in at Club Feu Follet uses `timing` eight times. The crawfish race at the Thirsty Pelican redraws its track with `board`. Tarot, whispers and blessings are ordinary choices and `s.rng` rolls.

## Shared helpers

Several districts use `src/content/world/shared.scene.ts`:
- `instrumentStock(cls, tiers)`: shop rows for the player's class instruments
- `rumor`: a bar tip about the next boss
- `getInvitation(s, how)`: the Vane ball invitation

Put a helper there when a second district needs it.

## Sheets and travel

```ts
await s.sheet({ kind: 'shop', title: 'The Praline Lady', stock: [{ id: 'kingcake', price: 80 }, { id: 'pralines' }], noSell: true });
await s.sheet({ kind: 'band' });     // resumes when the player closes the sheet
await s.goto('quarter');             // travel: autosave, first-visit narration, the district screen
s.returnTo({ kind: 'district' });    // where to land when the scene ends
```

## Places

A place is a list of options computed from the game state every time it's shown:

```ts
export const kitchen = definePlace('kitchen', {
  intro: g => (g.mealBuff ? { text: 'You\'re still full.' } : null),
  options: (g, h) => [
    { key: 'talk', label: 'Talk to Mama Roux', hint: h.is({ act: 'treme', step: 'meet_roux' }), run: mamaRouxTalk },
    { key: 'eat', label: `Eat (${fmtD(h.price(30))})`, sub: '+15% Chops & Grit for 3 fights', run: eat },
    ...(g.flags.hushHint ? [{ key: 'hush', label: 'Ask about the Hush', run: askAboutTheHush }] : []),
  ],
});
```

Register it in `PLACE_SCENES` (`content/index.ts`). Option keys become test ids (`opt:eat`). `h.price()` applies the player's roots discount; `h.is` and `h.reached` check the story.

## Checklist before you open a PR

- [ ] `npm run check` passes: types, lint, layers, and tests. That includes the completeness tests and the crawler, which run every option of every ported place down every choice.
- [ ] New choices and options have meaningful, stable keys.
- [ ] Every new id (flag, step, item, NPC) is in its `core/ids` list with a doc comment.
- [ ] The scene plays in the browser (`npm run dev`, and use the dev menu to jump there) at 360px.
- [ ] While porting v1 content: the transcript oracle still passes (`npm test`).
