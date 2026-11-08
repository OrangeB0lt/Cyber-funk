/** The React presenter's story view: what the screen holds as a scene runs. */
import { describe, expect, it } from 'vitest';
import { defaultSettings } from '@engine/index';
import { Sfx } from './audio/sfx';
import { ReactPresenter } from './reactPresenter';
import { createView } from './view';

const presenter = () =>
  new ReactPresenter(createView(), {
    settings: () => defaultSettings(),
    game: () => null,
    sfx: new Sfx(() => false),
    turbo: () => true,
  });

describe('the board (crawfish race track)', () => {
  it('redraws in place while it is the newest line, and starts a new one after anything else', () => {
    const p = presenter();
    p.story('The Thirsty Pelican');
    p.board('frame 1');
    p.board('frame 2');
    expect(p.view.lines.map(l => [l.kind, l.text])).toEqual([['board', 'frame 2']]);
    p.promptLine('Who wins?');
    p.board('another race');
    expect(p.view.lines.map(l => l.kind)).toEqual(['board', 'prompt', 'board']);
    p.story(null);
    expect(p.view.lines).toEqual([]);
  });
});
