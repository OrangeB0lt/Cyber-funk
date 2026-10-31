/**
 * Enforces the layer rules in .dependency-cruiser.cjs (see docs/adr/0002-layering.md).
 *
 * Calls dependency-cruiser's API instead of its CLI because the CLI refuses to start on Node
 * versions outside its support list (odd-numbered "current" releases). The API has no such
 * check, so every contributor's Node works.
 *
 *   npm run depcruise
 */
import { createRequire } from 'node:module';
import { cruise, type ICruiseOptions } from 'dependency-cruiser';
import extractTSConfig from 'dependency-cruiser/config-utl/extract-ts-config';

const require = createRequire(import.meta.url);
const config = require('../.dependency-cruiser.cjs') as { forbidden: unknown[]; options: ICruiseOptions };

const options: ICruiseOptions = {
  ...config.options,
  ruleSet: { forbidden: config.forbidden } as ICruiseOptions['ruleSet'],
  validate: true,
  outputType: 'err',
};
const tsConfig = extractTSConfig('tsconfig.json');
const result = await cruise(['src', 'tools'], options, {}, { tsConfig });
const output = typeof result.output === 'string' ? result.output : JSON.stringify(result.output);
process.stdout.write(output);
if (result.exitCode !== 0) process.exit(result.exitCode);
console.log('layer rules: ok');
