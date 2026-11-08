/**
 * Content checks the type system can't express. Runs in CI as a test (validate-content.test.ts) and
 * on demand:
 *
 *   npx tsx tools/validate-content.ts
 *
 * Each check returns human-readable problems. To add a check, push to `problems` with enough detail
 * that a writer can fix the data without reading this file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CLASS_IDS } from '@core/ids/characters';
import { BOSS_IDS, ENEMY_IDS, NOTE_IDS } from '@core/ids/enemies';
import { PALETTE_IDS, PERSON_SPRITE_IDS, SPRITE_IDS, type SpriteId } from '@core/ids/sprites';
import { DISTRICT_IDS } from '@core/ids/world';
import { ACT_ORDER, ACT_STEPS } from '@core/ids/story';
import type { SpriteDef, StepDef } from '@core/types';
import {
  ACTS,
  BANDMATES,
  BOSSES,
  CLASSES,
  DISTRICTS,
  ENEMIES,
  ITEMS,
  SECOND_LINE,
  SKILL_LEVELS,
  SKILLS,
  STATUSES,
} from '@content/data';
import { RIVALS } from '@content/enemies/rivals';
import { SUMMONS } from '@content/enemies/summons';
import {
  MAX_VARIANT_DEPTH,
  NPC_SPRITE,
  PALETTE,
  RESERVED_P3,
  SPRITES,
  resolveSprite,
  type ResolvedSprite,
} from '@content/sprites';
import { MECHANIC_STATUSES } from '@engine/combat/resolve';

export function validateContent(): string[] {
  const problems: string[] = [];
  const fail = (msg: string) => problems.push(msg);

  // Every enemy can actually be met.
  const reachable = new Set<string>([...Object.keys(SUMMONS), ...Object.keys(RIVALS)]);
  for (const d of DISTRICT_IDS) {
    const district = DISTRICTS[d];
    district.pool.forEach(id => reachable.add(id));
    reachable.add(district.elite);
    if (!ENEMIES[district.elite].elite) fail(`District ${d}: elite ${district.elite} is not marked elite.`);
    for (const id of district.pool)
      if (ENEMIES[id].elite) fail(`District ${d}: pool enemy ${id} is an elite (elites spawn separately).`);
    if (BOSSES[district.boss].district !== d)
      fail(`District ${d}: its boss ${district.boss} says it lives in ${BOSSES[district.boss].district}.`);
  }
  for (const id of ENEMY_IDS)
    if (!reachable.has(id))
      fail(`Enemy ${id} never spawns (no district pool, elite slot, summon or rival list).`);

  // Classes: six skills, unlocked at SKILL_LEVELS; riff and solo are flagged as such.
  if (SKILL_LEVELS.length !== 6) fail(`SKILL_LEVELS must have 6 entries.`);
  for (const id of CLASS_IDS) {
    const c = CLASSES[id];
    if (new Set(c.skills).size !== 6) fail(`Class ${id}: skills must be 6 distinct ids.`);
    if (!SKILLS[c.riff].riff) fail(`Class ${id}: riff ${c.riff} is missing riff: true.`);
    if (!SKILLS[c.solo].solo) fail(`Class ${id}: solo ${c.solo} is missing solo: true.`);
  }

  // Bosses guard each Blue Note exactly once.
  const notes = BOSS_IDS.map(b => BOSSES[b].note).filter(Boolean);
  for (const n of NOTE_IDS) {
    const count = notes.filter(x => x === n).length;
    if (count !== 1) fail(`Blue Note ${n} is guarded by ${count} bosses (expected 1).`);
  }

  // Statuses the engine implements by id must exist (compile-checked) and have sensible defaults.
  for (const id of MECHANIC_STATUSES) if (STATUSES[id].turns < 1) fail(`Status ${id}: turns must be ≥ 1.`);

  // Assists, items, second line.
  for (const bm of Object.values(BANDMATES))
    if (!bm.assist.startsWith('as_')) fail(`Bandmate ${bm.id}: assist ${bm.assist} should be an as_* skill.`);
  for (const it of Object.values(ITEMS)) {
    if (it.battle && !it.effects?.length) fail(`Item ${it.id}: usable in battle but has no effects.`);
    if (it.key && (it.battle || it.field)) fail(`Item ${it.id}: key items can't be usable.`);
  }
  const lineIds = SECOND_LINE.map(m => m.id);
  if (new Set(lineIds).size !== lineIds.length) fail('SECOND_LINE has duplicate ids.');

  // Main quest: progress goals are positive; the done act has exactly one step.
  for (const act of ACT_ORDER) {
    for (const step of ACT_STEPS[act] as readonly string[]) {
      const def = (ACTS[act] as Record<string, StepDef>)[step]!;
      if (!def.journal.trim()) fail(`Story ${act}.${step}: empty journal text.`);
      if (def.progress && def.progress.goal < 1) fail(`Story ${act}.${step}: progress goal must be ≥ 1.`);
    }
  }

  // Every skill says what it does.
  for (const sk of Object.values(SKILLS)) if (!sk.desc.trim()) fail(`Skill ${sk.id}: empty desc.`);

  validateSprites(fail);
  return problems;
}

/** Characters a sprite grid may use: letters, digits and a few symbols ('.' and '_' are reserved). */
const SPRITE_ALPHABET = /^[A-Za-z0-9#*+=@%&~^!?<>|-]$/;
/** The character design doc: one card per sprite, and the master palette table. */
const DESIGN_DOC = 'docs/vision/character-design.md';

/** Sprite rules from docs/vision/character-design.md that the types can't express. */
function validateSprites(fail: (msg: string) => void): void {
  const bosses = new Set<string>(BOSS_IDS);
  const resolved = new Map<SpriteId, ResolvedSprite>();
  for (const id of SPRITE_IDS) {
    const def = SPRITES[id];
    const size = bosses.has(id) ? 32 : 24;
    const at = `Sprite ${id}`;
    const checkGrid = (
      rows: readonly string[],
      keys: Readonly<Record<string, string>>,
      what: string,
      overlay: boolean,
    ) => {
      if (rows.length !== size) fail(`${at}: ${what} has ${rows.length} rows, expected ${size}.`);
      const used = new Set<string>();
      rows.forEach((row, y) => {
        if (row.length !== size) fail(`${at}: ${what} row ${y} is ${row.length} wide, expected ${size}.`);
        for (const ch of row) {
          if (ch === '.' || (overlay && ch === '_')) continue;
          if (ch === '_') fail(`${at}: '_' (erase) belongs only in variant overlays.`);
          else if (!SPRITE_ALPHABET.test(ch))
            fail(`${at}: '${ch}' in ${what} row ${y} isn't in the pixel alphabet.`);
          else if (!keys[ch]) fail(`${at}: '${ch}' in ${what} row ${y} has no key.`);
          used.add(ch);
        }
      });
      for (const k of Object.keys(keys)) if (!used.has(k)) fail(`${at}: key '${k}' is never used.`);
    };
    if ('from' in def) {
      const chain: SpriteId[] = [id];
      let cur: SpriteDef = def;
      while ('from' in cur) {
        if (chain.includes(cur.from)) break; // resolveSprite reports the cycle below
        chain.push(cur.from);
        cur = SPRITES[cur.from];
      }
      if (chain.length - 1 > MAX_VARIANT_DEPTH)
        fail(`${at}: variant chain ${chain.join(' → ')} is too deep (at most ${MAX_VARIANT_DEPTH}).`);
      if (def.overlay) checkGrid(def.overlay, def.keys ?? {}, 'overlay', true);
      else if (def.keys) fail(`${at}: has keys but no overlay.`);
      if (!def.overlay && !def.recolor) fail(`${at}: a variant needs a recolor, an overlay, or both.`);
    } else {
      checkGrid(def.rows, def.keys, 'grid', false);
    }
    let r: ResolvedSprite;
    try {
      r = resolveSprite(id, SPRITES);
    } catch (e) {
      fail(`${at}: ${(e as Error).message}`);
      continue;
    }
    const painted = r.px.filter(Boolean).length;
    if (painted < r.px.length * 0.15)
      fail(`${at}: only ${painted} of ${r.px.length} pixels are painted (at least 15%).`);
    const colours = new Set(r.px.filter(Boolean)).size;
    const most = size === 32 ? 20 : 16;
    if (colours > most) fail(`${at}: uses ${colours} colours (at most ${most}).`);
    if ('from' in def && resolveSprite(def.from, SPRITES).px.every((c, i) => c === r.px[i]))
      fail(`${at}: the variant doesn't change a single pixel of ${def.from}.`);
    resolved.set(id, r);
  }

  // No two sprites are pixel-for-pixel the same.
  const byPixels = new Map<string, SpriteId>();
  for (const [id, r] of resolved) {
    const twin = byPixels.get(r.px.join(','));
    if (twin) fail(`Sprite ${id}: identical to ${twin}.`);
    else byPixels.set(r.px.join(','), id);
  }

  // Every palette colour is used by some pixel or glow, so the palette doesn't collect dead entries.
  const usedColours = new Set<string>();
  for (const r of resolved.values()) {
    for (const c of r.px) if (c) usedColours.add(c);
    if (r.glow) usedColours.add(r.glow);
  }
  for (const id of PALETTE_IDS)
    if (!usedColours.has(id))
      fail(
        `Palette colour ${id} isn't used by any sprite: use it, or remove it (and its row in ${DESIGN_DOC}).`,
      );

  // Opponents flagged as holograms are drawn as holograms.
  const holograms = [
    ...ENEMY_IDS.filter(id => ENEMIES[id].hologram),
    ...BOSS_IDS.filter(id => BOSSES[id].hologram),
  ] as SpriteId[];
  for (const id of holograms)
    if (resolved.has(id) && resolved.get(id)!.fx !== 'holo')
      fail(`Sprite ${id}: the opponent is a hologram, so fx must be 'holo'.`);

  // Every person sprite belongs to someone: a speaker (NPC_SPRITE) or a shopkeeper waiting for P3.
  const claimed = new Set<string>([...Object.values(NPC_SPRITE), ...RESERVED_P3]);
  for (const id of PERSON_SPRITE_IDS)
    if (!claimed.has(id)) fail(`Sprite ${id}: no speaker uses it (NPC_SPRITE) and it isn't in RESERVED_P3.`);

  // The design doc has a card for every sprite, and its palette table is exactly PALETTE.
  const doc = fs.readFileSync(path.resolve(DESIGN_DOC), 'utf8');
  const cards = new Set([...doc.matchAll(/^#{3,4} .*`([a-z0-9_]+)`\s*$/gm)].map(m => m[1]));
  for (const id of SPRITE_IDS)
    if (!cards.has(id)) fail(`${DESIGN_DOC}: no card for sprite ${id} (a heading ending in \`${id}\`).`);
  const rows = new Map(
    [...doc.matchAll(/^\| `([a-z0-9_]+)` \| `(#[0-9a-f]{6})` \|/gm)].map(m => [m[1]!, m[2]!]),
  );
  for (const id of PALETTE_IDS)
    if (rows.get(id) !== PALETTE[id])
      fail(
        `${DESIGN_DOC}: palette row for ${id} is ${rows.get(id) ?? 'missing'}, but PALETTE says ${PALETTE[id]}.`,
      );
  for (const name of rows.keys())
    if (!(PALETTE_IDS as readonly string[]).includes(name))
      fail(`${DESIGN_DOC}: palette row ${name} isn't in PALETTE_IDS.`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const problems = validateContent();
  if (problems.length) {
    console.error(problems.map(p => `✗ ${p}`).join('\n'));
    process.exit(1);
  }
  console.log('content: ok');
}
