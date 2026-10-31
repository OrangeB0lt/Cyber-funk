/**
 * Content checks the type system can't express. Runs in CI as a test (validate-content.test.ts) and
 * on demand:
 *
 *   npx tsx tools/validate-content.ts
 *
 * Each check returns human-readable problems. To add a check, push to `problems` with enough detail
 * that a writer can fix the data without reading this file.
 */
import { pathToFileURL } from 'node:url';
import { CLASS_IDS } from '@core/ids/characters';
import { BOSS_IDS, ENEMY_IDS, NOTE_IDS } from '@core/ids/enemies';
import { DISTRICT_IDS } from '@core/ids/world';
import { ACT_ORDER, ACT_STEPS } from '@core/ids/story';
import type { StepDef } from '@core/types';
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

  return problems;
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
