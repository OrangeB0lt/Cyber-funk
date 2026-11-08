/**
 * Is the game whole? Checks that every place has something to do, every boss has its scenes, every
 * story step points somewhere real and every [[lexicon]] link resolves, for every district that has
 * been ported (src/content/pending.ts lists the ones that haven't). Runs in CI as a test
 * (completeness.test.ts) and on demand:
 *
 *   npx tsx tools/completeness.ts
 *
 * This is the check that would have caught the empty French Quarter: its places existed as data, but
 * nothing was registered for them, so the place screen showed a description and nothing to do.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BOSS_IDS } from '@core/ids/enemies';
import { ACT_ORDER, ACT_STEPS } from '@core/ids/story';
import { DISTRICT_IDS, PLACE_IDS, type PlaceId } from '@core/ids/world';
import type { StepDef } from '@core/types';
import { ACTS, BOSSES, DISTRICTS, GLOSSARY, PLACES, BOSS_SCENES, PLACE_SCENES } from '@content/index';
import { PENDING_DISTRICTS, isPendingAct, isPendingDistrict } from '@content/pending';

/**
 * [[links]] that knowingly name no glossary entry. Each is a v1 bug kept for parity (ADR-0003) and
 * fixed after the port.
 */
export const ALLOWED_UNLINKED: Record<string, string> = {
  hush: 'PARITY: v1 writes [[Hush|the Hush]] but the glossary key is "the hush" (docs/known-issues.md, fixed in P6).',
};

/** Every problem found, as a sentence a writer can act on. Empty when the game is whole. */
export function checkCompleteness(): string[] {
  const problems: string[] = [];
  const fail = (msg: string) => problems.push(msg);

  // Every place belongs to exactly one district, and says so.
  const owner = new Map<PlaceId, string[]>();
  for (const d of DISTRICT_IDS)
    for (const p of DISTRICTS[d].places) owner.set(p, [...(owner.get(p) ?? []), d]);
  for (const p of PLACE_IDS) {
    const ds = owner.get(p) ?? [];
    if (ds.length !== 1)
      fail(
        `Place ${p} is listed in ${ds.length ? ds.join(', ') : 'no district'}'s places (expected exactly one).`,
      );
    else if (PLACES[p].district !== ds[0])
      fail(`Place ${p} says it is in ${PLACES[p].district}, but ${ds[0]} lists it.`);
  }

  // Ported districts are whole: every place has scenes and the boss has its pre/post scenes.
  for (const d of DISTRICT_IDS) {
    if (isPendingDistrict(d)) continue;
    for (const p of DISTRICTS[d].places)
      if (!PLACE_SCENES[p])
        fail(
          `${d}: place ${p} (${PLACES[p].name}) has no scenes. Add it to PLACE_SCENES in src/content/index.ts.`,
        );
  }
  for (const b of BOSS_IDS) {
    if (isPendingDistrict(BOSSES[b].district)) continue;
    if (!BOSS_SCENES[b])
      fail(
        `${BOSSES[b].district}: boss ${b} has no pre/post scenes. Add it to BOSS_SCENES in src/content/index.ts.`,
      );
  }

  // A district still marked pending but fully ported should come off the list, so its tests run.
  for (const d of PENDING_DISTRICTS) {
    const places = DISTRICTS[d].places.every(p => PLACE_SCENES[p]);
    const bosses = BOSS_IDS.filter(b => BOSSES[b].district === d).every(b => BOSS_SCENES[b]);
    if (places && bosses)
      fail(
        `${d}: every place and boss has scenes now. Remove it from PENDING_DISTRICTS in src/content/pending.ts.`,
      );
  }

  // Every story step of a ported act points the "!" at a place that has something to do.
  for (const act of ACT_ORDER) {
    if (isPendingAct(act)) continue;
    for (const step of ACT_STEPS[act] as readonly string[]) {
      const def = (ACTS[act] as Record<string, StepDef>)[step]!;
      if (def.hintPlace && !PLACE_SCENES[def.hintPlace])
        fail(`Story ${act}.${step}: its hint place ${def.hintPlace} has no scenes.`);
    }
  }

  checkLexiconLinks(fail);
  return problems;
}

/** The [[key]] / [[key|display]] markup the lexicon links (src/app/lexicon.ts). */
const LINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/** Every explicit [[link]] in content source resolves to a glossary entry (else it renders as plain text). */
function checkLexiconLinks(fail: (msg: string) => void): void {
  const root = path.resolve('src/content');
  const files = (fs.readdirSync(root, { recursive: true }) as string[]).filter(
    f => f.endsWith('.ts') && !f.endsWith('.test.ts'),
  );
  for (const rel of files) {
    const text = stripComments(fs.readFileSync(path.join(root, rel), 'utf8'));
    for (const m of text.matchAll(LINK)) {
      const key = m[1]!.replace(/\\'/g, "'").trim().toLowerCase();
      if (key in GLOSSARY || ALLOWED_UNLINKED[key]) continue;
      const line = text.slice(0, m.index).split('\n').length;
      fail(
        `src/content/${rel}:${line}: [[${m[1]}]] names no glossary entry (keys are lowercase, e.g. "the hush").`,
      );
    }
  }
}

/** Source with comments blanked out (kept line-for-line so line numbers stay right). */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, c => c.replace(/[^\n]/g, ' '))
    .replace(/^\s*\/\/.*$/gm, l => ' '.repeat(l.length));
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const problems = checkCompleteness();
  if (problems.length) {
    console.error(problems.map(p => `✗ ${p}`).join('\n'));
    process.exit(1);
  }
  console.log('completeness: ok');
}
