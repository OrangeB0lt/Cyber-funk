/**
 * Write tests/fixtures/rules.json: what the engine does with every rule case (tools/engine/rules.ts).
 * It was first written while v1's rule oracle passed, so it holds v1's behavior.
 *
 *   npm run rules:baseline   # only when a change is meant to move these results
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { tsFacts } from './facts';
import { ruleCases, runRules } from './rules';

/** The fixture's path. */
export const RULES_BASELINE = path.join(import.meta.dirname, '..', '..', 'tests', 'fixtures', 'rules.json');

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  // One case per line, so a re-baseline's diff shows exactly which cases moved.
  const results = runRules(ruleCases(tsFacts()));
  const families = Object.entries(results).map(
    ([family, list]) =>
      `  "${family}": [\n${(list as unknown[]).map(c => '    ' + JSON.stringify(c)).join(',\n')}\n  ]`,
  );
  fs.writeFileSync(RULES_BASELINE, `{\n${families.join(',\n')}\n}\n`);
  console.log(`wrote ${path.relative(process.cwd(), RULES_BASELINE)}`);
}
