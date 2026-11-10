/** Content validation and engine/content separation, enforced in CI. */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BANDMATE_IDS, SECOND_LINE_IDS } from '@core/ids/band';
import { CLASS_IDS, ROOTS_IDS } from '@core/ids/characters';
import { BOSS_IDS, ENEMY_IDS } from '@core/ids/enemies';
import { CHARM_IDS, ITEM_IDS, MOD_IDS, SHEET_MUSIC_IDS, THREADS_IDS } from '@core/ids/items';
import { DISTRICT_IDS, NPC_IDS, PLACE_IDS, QUEST_IDS } from '@core/ids/world';
import { ASSIST_SKILL_IDS, BOSS_SKILL_IDS, CLASS_SKILL_IDS, ENEMY_SKILL_IDS } from '@core/ids/combat';
import { validateContent } from './validate-content';

describe('content', () => {
  it('passes every validation check', () => {
    expect(validateContent()).toEqual([]);
  });
});

describe('engine/content separation', () => {
  /**
   * The engine implements mechanics; which enemy, item or place is involved is content's call.
   * Status, tone and timing ids are mechanics and may appear in engine code. Anything listed in
   * ALLOWED is a known exception with a reason.
   */
  const CONTENT_IDS = new Set<string>([
    ...ENEMY_IDS,
    ...BOSS_IDS,
    ...ITEM_IDS,
    ...SHEET_MUSIC_IDS,
    ...BANDMATE_IDS,
    ...SECOND_LINE_IDS,
    ...DISTRICT_IDS,
    ...PLACE_IDS,
    ...NPC_IDS,
    ...QUEST_IDS,
    ...CLASS_IDS,
    ...ROOTS_IDS,
    ...THREADS_IDS,
    ...CHARM_IDS,
    ...MOD_IDS,
    ...CLASS_SKILL_IDS,
    ...ENEMY_SKILL_IDS,
    ...BOSS_SKILL_IDS,
    ...ASSIST_SKILL_IDS,
  ]);
  /** Engine vocabulary that happens to collide with content ids (the Strip place vs the strip effect…). */
  const MECHANIC_WORDS = new Set([
    'dmg',
    'status',
    'heal',
    'funk',
    'cleanse',
    'strip',
    'guard',
    'groove',
    'custom',
    '',
    'boss',
    'telegraph',
    'good',
    'bad',
    'crit',
    'you',
    'solo',
    'assist',
  ]);
  const ALLOWED: Record<string, string> = {
    'items.ts:kingcake': 'PARITY: v1 special-cased King Cake outside battle by id (src/engine/items.ts).',
  };

  it('engine code contains no content-only id literals', () => {
    const root = path.resolve('src/engine');
    const files = fs.readdirSync(root, { recursive: true }) as string[];
    const found: string[] = [];
    for (const rel of files.filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'))) {
      const text = fs.readFileSync(path.join(root, rel), 'utf8');
      for (const m of text.matchAll(/'([a-z][a-z0-9_]*)'/g)) {
        const id = m[1]!;
        if (CONTENT_IDS.has(id) && !MECHANIC_WORDS.has(id) && !ALLOWED[`${path.basename(rel)}:${id}`])
          found.push(`${rel}: '${id}'`);
      }
    }
    expect(found).toEqual([]);
  });
});
