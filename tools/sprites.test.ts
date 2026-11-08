/**
 * The sprite gallery (docs/reference/sprites/) must match the art. When this fails, run
 * `npm run sprites:export` and commit the files with your change.
 */
import { describe, expect, it } from 'vitest';
import { generateSpriteGallery, staleSpriteGallery } from './sprites';

describe('sprite gallery', () => {
  it('is up to date with the art', () => {
    const stale = staleSpriteGallery(generateSpriteGallery());
    expect(stale, 'docs/reference/sprites is stale: run `npm run sprites:export`').toEqual([]);
  });
});
