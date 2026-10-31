/**
 * Runs the parity corpus against the legacy engine only. Run under c8 to measure how much of the
 * legacy engine (05) and the content functions (01–03) the corpus exercises:
 *
 *   npm run parity:coverage
 *
 * The parity gate requires >= 95% branch coverage of legacy/src/05_engine.js, so "the TS engine
 * matches legacy on the corpus" actually means something.
 */
import { generateCorpus, runFight, runMisc } from './driver';
import { legacyAdapter, legacyFacts } from './legacyAdapter';
import { CORPUS_SEED, CORPUS_SIZE, MISC_SEED, MISC_SIZE } from './corpus';
import { micro } from './micro';

const a = legacyAdapter();
const facts = legacyFacts(a.E);
let events = 0;
for (const spec of [...generateCorpus(facts, CORPUS_SEED, CORPUS_SIZE), ...micro(facts)]) {
  events += runFight(a, spec).events.length;
}
runMisc(a, facts, MISC_SEED, MISC_SIZE);
console.log(`corpus: ${CORPUS_SIZE} fights + micro scenarios, ${events} events`);
