/**
 * Is the game whole? Checks that every place has something to do, every boss has its scenes, every
 * story step points somewhere real and every [[lexicon]] link resolves. The registries' types already
 * require every place and boss; this keeps the message friendly and covers the rest. Runs in CI as a test
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

  // Every place has scenes and every boss its pre/post scenes (the registries' types insist too).
  for (const d of DISTRICT_IDS) {
    for (const p of DISTRICTS[d].places)
      if (!PLACE_SCENES[p])
        fail(
          `${d}: place ${p} (${PLACES[p].name}) has no scenes. Add it to PLACE_SCENES in src/content/index.ts.`,
        );
  }
  for (const b of BOSS_IDS) {
    if (!BOSS_SCENES[b])
      fail(
        `${BOSSES[b].district}: boss ${b} has no pre/post scenes. Add it to BOSS_SCENES in src/content/index.ts.`,
      );
  }

  // Every story step points the "!" at a place that has something to do.
  for (const act of ACT_ORDER) {
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
      if (key in GLOSSARY) continue;
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
