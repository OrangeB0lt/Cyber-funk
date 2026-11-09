/**
 * The content tables (docs/reference/tables/) must match the content. When this fails, run
 * `npm run docs:tables` and commit the pages with your change.
 */
import { describe, expect, it } from 'vitest';
import { generateTables, staleTables } from './reference';

describe('content tables', () => {
  it('are up to date with the content', () => {
    expect(
      staleTables(generateTables()),
      'docs/reference/tables is stale: run `npm run docs:tables`',
    ).toEqual([]);
  });
});
