/**
 * The sprite gallery. Exports every sprite as an SVG, drawn as the game draws it, into
 * docs/reference/sprites/. Alongside them it writes a palette swatch sheet and a README listing the
 * whole cast. The design doc's cards embed these images. A test (tools/sprites.test.ts) fails when
 * the gallery is stale.
 *
 *   npm run sprites:export                          write docs/reference/sprites/
 *   npx tsx tools/sprites.ts --check                fail if it's stale
 *   npx tsx tools/sprites.ts --sheet out.html [--scale 4]   one-page contact sheet for reviewing art
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CLASS_IDS } from '@core/ids/characters';
import { BOSS_IDS } from '@core/ids/enemies';
import {
  CLONE_SPRITE_IDS,
  HERO_SPRITE_IDS,
  PALETTE_IDS,
  PERSON_SPRITE_IDS,
  SPRITE_IDS,
  type PersonSpriteId,
  type SpriteId,
} from '@core/ids/sprites';
import { DISTRICT_IDS, NPC_IDS } from '@core/ids/world';
import { BOSSES, CLASSES, DISTRICTS, ENEMIES, NPCS } from '@content/data';
import { RIVALS } from '@content/enemies/rivals';
import { SUMMONS } from '@content/enemies/summons';
import { NPC_SPRITE, PALETTE, RESERVED_P3, SPRITES, compileSprite, spriteSvg } from '@content/sprites';
import { isTodo } from '@content/sprites/placeholder';

const ROOT = process.cwd();
const OUT_DIR = 'docs/reference/sprites';
/** --bg2: the surface sprites sit on in battle cards, dialogue and sheets. */
const BACKDROP = '#140527';
const SCALE = 4;

/** Names for people who have no NpcId yet (the shopkeepers P3 will wire up). */
const SHOPKEEPER_NAMES: Partial<Record<PersonSpriteId, string>> = {
  pelican_bartender: 'Thirsty Pelican bartender',
  faisdodo_bartender: 'Fais Do-Do bartender',
  market_vendor: 'French Market vendor',
  chop_surgeon: 'Chop Shop surgeon',
  maison_clerk: 'Maison Chrome clerk',
  tuxedo_maitre: "Silver Tuxedo maître d'",
};

/** A sprite's display name. */
function nameOf(id: SpriteId): string {
  if (id in ENEMIES) return ENEMIES[id as keyof typeof ENEMIES].name;
  if (id in BOSSES) return BOSSES[id as keyof typeof BOSSES].name;
  const cls = CLASS_IDS.find(c => id === `hero_${c}` || id === `clone_${c}`);
  if (cls) return id.startsWith('hero_') ? CLASSES[cls].name : `Session Clone (${CLASSES[cls].name})`;
  const npc = NPC_IDS.find(n => NPC_SPRITE[n] === id);
  return npc ? NPCS[npc].name : (SHOPKEEPER_NAMES[id as PersonSpriteId] ?? id);
}

/** The cast in gallery order, grouped. */
function groups(): { title: string; ids: SpriteId[] }[] {
  const seen = new Set<SpriteId>();
  const take = (ids: readonly string[]) =>
    ids.filter(
      (id): id is SpriteId =>
        (SPRITE_IDS as readonly string[]).includes(id) &&
        !seen.has(id as SpriteId) &&
        !!seen.add(id as SpriteId),
    );
  const out = [
    { title: 'Heroes', ids: take(HERO_SPRITE_IDS) },
    { title: 'Session Clones', ids: take(CLONE_SPRITE_IDS) },
    { title: 'People', ids: take(PERSON_SPRITE_IDS.filter(id => !RESERVED_P3.includes(id))) },
    { title: 'Shopkeepers (P3)', ids: take(RESERVED_P3) },
    ...DISTRICT_IDS.map(d => ({
      title: `${DISTRICTS[d].name} enemies`,
      ids: take([
        ...DISTRICTS[d].pool,
        DISTRICTS[d].elite,
        ...(d === 'cemetery' ? Object.keys(SUMMONS) : []),
      ]),
    })),
    { title: 'Cutting Contest rivals', ids: take(Object.keys(RIVALS)) },
    { title: 'Bosses', ids: take(BOSS_IDS) },
  ];
  const missing = SPRITE_IDS.filter(id => !seen.has(id));
  if (missing.length) throw new Error(`Sprites missing from the gallery groups: ${missing.join(', ')}`);
  return out;
}

/** The palette as one SVG: a labelled swatch per colour. */
function paletteSvg(): string {
  const cols = 4;
  const w = 200;
  const h = 28;
  const rows = Math.ceil(PALETTE_IDS.length / cols);
  const cells = PALETTE_IDS.map((id, i) => {
    const x = (i % cols) * w;
    const y = Math.floor(i / cols) * h;
    return (
      `<rect x="${x + 4}" y="${y + 4}" width="20" height="20" fill="${PALETTE[id]}" stroke="#3a1c63"/>` +
      `<text x="${x + 30}" y="${y + 18}">${id} ${PALETTE[id]}</text>`
    );
  }).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * w}" height="${rows * h + 8}" viewBox="0 0 ${cols * w} ${rows * h + 8}">` +
    `<rect width="100%" height="100%" fill="${BACKDROP}"/>` +
    `<g font-family="ui-monospace, Menlo, monospace" font-size="12" fill="#f3ecff">${cells}</g></svg>\n`
  );
}

/** Every gallery file: one SVG per sprite, the palette, and the README. */
export function generateSpriteGallery(): Map<string, string> {
  const files = new Map<string, string>();
  for (const id of SPRITE_IDS)
    files.set(
      `${id}.svg`,
      spriteSvg(compileSprite(id, SPRITES, PALETTE), { scale: SCALE, background: BACKDROP }),
    );
  files.set('palette.svg', paletteSvg());

  const todo = SPRITE_IDS.filter(id => isTodo(SPRITES[id])).length;
  const cell = (id: SpriteId) => `![${nameOf(id)}](${id}.svg)<br>\`${id}\`<br>${nameOf(id)}`;
  const md = [
    '<!-- Generated by tools/sprites.ts. Do not edit by hand: run `npm run sprites:export`. -->',
    '',
    '# Sprites: generated gallery',
    '',
    `Every sprite as the game draws it, at ${SCALE}× on the surface it sits on in battle and dialogue (\`--bg2\`). Generated from \`src/content/sprites/\` by [tools/sprites.ts](../../../tools/sprites.ts). **Don't edit these files:** run \`npm run sprites:export\` after changing art. A test (\`tools/sprites.test.ts\`) fails when they are out of date. What each character should look like, and why, is in the [character design doc](../../vision/character-design.md).`,
    '',
    `**${SPRITE_IDS.length}** sprites · **${PALETTE_IDS.length}** palette colours${todo ? ` · **${todo}** still placeholders` : ''}`,
    '',
  ];
  for (const g of groups()) {
    md.push(`## ${g.title}`, '', '| | | | |', '|---|---|---|---|');
    for (let i = 0; i < g.ids.length; i += 4) {
      const row = g.ids.slice(i, i + 4).map(cell);
      while (row.length < 4) row.push(' ');
      md.push(`| ${row.join(' | ')} |`);
    }
    md.push('');
  }
  md.push('## Palette', '', '![The master palette](palette.svg)', '');
  files.set('README.md', md.join('\n'));
  return files;
}

/** Files that differ from what's on disk (or shouldn't be there any more). */
export function staleSpriteGallery(files: Map<string, string>): string[] {
  const dir = path.join(ROOT, OUT_DIR);
  const stale: string[] = [];
  for (const [name, text] of files) {
    const p = path.join(dir, name);
    if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== text) stale.push(name);
  }
  if (fs.existsSync(dir))
    for (const f of fs.readdirSync(dir)) if (!files.has(f)) stale.push(`${f} (no longer generated)`);
  return stale.sort();
}

export function writeSpriteGallery(files: Map<string, string>): void {
  const dir = path.join(ROOT, OUT_DIR);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (!files.has(f)) fs.rmSync(path.join(dir, f));
  for (const [name, text] of files) fs.writeFileSync(path.join(dir, name), text);
}

/** A one-page contact sheet (HTML) of every sprite, for reviewing art in a browser or a screenshot. */
export function contactSheet(scale: number): string {
  const tiles = groups()
    .map(
      g =>
        `<h2>${g.title}</h2><div class="row">` +
        g.ids
          .map(
            id =>
              `<figure>${spriteSvg(compileSprite(id, SPRITES, PALETTE), { scale, background: BACKDROP })}<figcaption>${id}</figcaption></figure>`,
          )
          .join('') +
        '</div>',
    )
    .join('');
  return `<!doctype html><meta charset="utf-8"><title>Sprites</title><style>
body{margin:0;padding:16px;background:#0b0218;color:#f3ecff;font:12px ui-monospace,Menlo,monospace}
h2{font-size:13px;color:#a893c7;margin:14px 0 6px}.row{display:flex;flex-wrap:wrap;gap:10px}
figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:4px}
svg{display:block;image-rendering:pixelated}</style>${tiles}`;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const arg = (name: string) => {
    const i = process.argv.indexOf(name);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const sheet = arg('--sheet');
  if (sheet) {
    fs.writeFileSync(sheet, contactSheet(Number(arg('--scale') ?? 4)));
    console.log(`sprites: wrote a contact sheet to ${sheet}`);
  } else {
    const files = generateSpriteGallery();
    if (process.argv.includes('--check')) {
      const stale = staleSpriteGallery(files);
      if (stale.length) {
        console.error(`${OUT_DIR} is stale (${stale.join(', ')}). Run \`npm run sprites:export\`.`);
        process.exit(1);
      }
      console.log('sprites: gallery up to date');
    } else {
      writeSpriteGallery(files);
      console.log(`sprites: wrote ${files.size} files to ${OUT_DIR}/`);
    }
  }
}
