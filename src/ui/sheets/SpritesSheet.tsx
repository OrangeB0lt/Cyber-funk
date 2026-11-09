/**
 * Dev: the sprite gallery. Every sprite at battle size, grouped by who they are and where they live,
 * for checking art on a real phone. Opened from the dev menu; works without a game.
 */
import { useState } from 'react';
import {
  CLONE_SPRITE_IDS,
  HERO_SPRITE_IDS,
  PERSON_SPRITE_IDS,
  SPRITE_IDS,
  type SpriteId,
} from '@core/ids/sprites';
import { DISTRICT_IDS } from '@core/ids/world';
import { DISTRICTS } from '@content/index';
import { Segmented } from '../components/Segmented';
import { Sprite } from '../components/Sprite';
import { Sheet } from './Sheet';
import s from './SpritesSheet.module.css';

/** Every sprite exactly once, grouped. */
function groups(): { title: string; ids: SpriteId[] }[] {
  const seen = new Set<SpriteId>();
  const take = (ids: readonly string[]) =>
    ids.filter((id): id is SpriteId => {
      if (!(SPRITE_IDS as readonly string[]).includes(id) || seen.has(id as SpriteId)) return false;
      seen.add(id as SpriteId);
      return true;
    });
  const out = [
    { title: 'Heroes', ids: take(HERO_SPRITE_IDS) },
    { title: 'Session Clones', ids: take(CLONE_SPRITE_IDS) },
    { title: 'People', ids: take(PERSON_SPRITE_IDS) },
    ...DISTRICT_IDS.map(d => ({
      title: DISTRICTS[d].name,
      ids: take([...DISTRICTS[d].pool, DISTRICTS[d].elite, DISTRICTS[d].boss]),
    })),
  ];
  return [...out, { title: 'Summons and rivals', ids: take(SPRITE_IDS) }];
}

export function SpritesSheet() {
  const [scale, setScale] = useState<'2' | '3'>('3');
  return (
    <Sheet title="Sprite gallery">
      <p className="small dim">
        {SPRITE_IDS.length} sprites, as battle cards ({'3×'}) or portraits ({'2×'}) draw them.
      </p>
      <Segmented
        label="Size"
        value={scale}
        options={[
          { value: '3', label: 'Battle 3×' },
          { value: '2', label: 'Portrait 2×' },
        ]}
        onChange={v => setScale(v)}
        testId="gallery-scale"
      />
      {groups().map(g => (
        <section key={g.title}>
          <h3 className={s.title}>{g.title}</h3>
          <div className={s.grid}>
            {g.ids.map(id => (
              <figure key={id} className={s.tile}>
                <Sprite id={id} scale={scale === '3' ? 3 : 2} />
                <figcaption className={s.id}>{id}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </Sheet>
  );
}
