/**
 * One-time migration: writes the world data tables (places, NPCs, quests, glossary) from legacy.
 *
 *   npx tsx tools/migrate/codegen-world.ts && npx prettier --write src/content
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadLegacy } from '../parity/legacy';
import { serialize } from './serialize';

/* eslint-disable @typescript-eslint/no-explicit-any */
const { E } = loadLegacy();
const ROOT = path.resolve('src/content');
const write = (rel: string, body: string) => fs.writeFileSync(path.join(ROOT, rel), body.trimStart());
const key = (k: string) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));
const rows = (table: Record<string, any>, map: (v: any, k: string) => any = v => v) =>
  Object.entries(table)
    .map(([k, v]) => `  ${key(k)}: ${serialize(map(v, k))},`)
    .join('\n');

write(
  'places.ts',
  `
/** Places inside districts. What you can do at each one is its scene (districts/<id>/places.scene.ts). */
import type { PlaceId } from '@core/ids/world';
import type { PlaceDef, Table } from '@core/types';

export const PLACES: Table<PlaceId, PlaceDef> = {
${rows(E.PLACES, ({ kind: _k, ...rest }) => rest)}
};
`,
);
write(
  'npcs.ts',
  `
/** Everyone who speaks in scenes, with the color their name shows in. */
import type { NpcId } from '@core/ids/world';
import type { NpcDef, Table } from '@core/types';

export const NPCS: Table<NpcId, NpcDef> = {
${rows(E.NPCS)}
};
`,
);
write(
  'quests.ts',
  `
/** Side quests as the journal shows them. Each quest's logic lives in its giver's scene. */
import type { QuestId } from '@core/ids/world';
import type { QuestDef, Table } from '@core/types';

export const QUESTS: Table<QuestId, QuestDef> = {
${rows(E.QUESTS)}
};
`,
);
write(
  'glossary.ts',
  `
/**
 * The Lagniappe Lexicon. Words in narration that match a key link to it automatically (longest match
 * first, once per line) unless \`noauto\`; [[key]] or [[key|display]] links explicitly.
 */
import type { GlossaryId } from '@core/ids/world';
import type { GlossaryDef, Table } from '@core/types';

export const GLOSSARY: Table<GlossaryId, GlossaryDef> = {
${rows(E.GLOSSARY, (v, k) => ({ id: k, ...v }))}
};
`,
);
console.log('wrote places, npcs, quests, glossary');
