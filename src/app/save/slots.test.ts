import { describe, expect, it } from 'vitest';
import { createRng } from '@core/rng';
import { newGame } from '@engine/index';
import { encodeSave } from './format';
import { SaveSlots, slotKey, syncKey } from './slots';
import { memoryKv } from './storage';

const raw = (name = 'Dawlin', at = new Date('2026-10-31T10:42:00.000Z')) =>
  encodeSave(newGame(name, 'yat', 'snare', undefined, 0), createRng(1).save(), at);

describe('save slots', () => {
  it('keeps one key per slot and saves the session to the active slot', () => {
    const kv = memoryKv();
    const slots = new SaveSlots(kv);
    slots.active = 2;
    expect(slots.current.write(raw())).toBe(true);
    expect(kv.data.has(slotKey(2))).toBe(true);
    expect(kv.data.has(slotKey(1))).toBe(false);
    expect(slots.current.read()).toBe(raw());
    slots.active = 1;
    expect(slots.current.read()).toBeNull();
  });

  it('describes each slot: empty, a summary, or why it cannot load', () => {
    const kv = memoryKv({ [slotKey(3)]: '{broken' });
    const slots = new SaveSlots(kv);
    slots.storage(2).write(raw('Cher'));
    expect(slots.all()).toEqual([
      { slot: 1, summary: null, savedAt: null, problem: null },
      {
        slot: 2,
        summary: {
          name: 'Cher',
          cls: 'snare',
          level: 1,
          act: 'treme',
          step: 'meet_roux',
          district: 'treme',
          ngPlus: 0,
        },
        savedAt: '2026-10-31T10:42:00.000Z',
        problem: null,
      },
      { slot: 3, summary: null, savedAt: null, problem: 'corrupt' },
    ]);
  });

  it('marks local writes and deletes dirty; adopting the server copy stays clean', () => {
    const slots = new SaveSlots(memoryKv());
    expect(slots.meta(1)).toEqual({ baseRevision: null, dirty: false });
    slots.storage(1).write(raw());
    expect(slots.meta(1)).toEqual({ baseRevision: null, dirty: true });
    slots.adopt(1, raw('Remote'), 7);
    expect(slots.meta(1)).toEqual({ baseRevision: 7, dirty: false });
    expect(slots.info(1).summary?.name).toBe('Remote');
    slots.storage(1).clear();
    expect(slots.meta(1)).toEqual({ baseRevision: 7, dirty: true });
    expect(slots.storage(1).read()).toBeNull();
  });

  it('treats a save with no bookkeeping as never synced', () => {
    const slots = new SaveSlots(memoryKv({ [slotKey(1)]: raw(), [syncKey(2)]: 'nope' }));
    expect(slots.meta(1)).toEqual({ baseRevision: null, dirty: true });
    expect(slots.meta(2)).toEqual({ baseRevision: null, dirty: false });
  });

  it('notifies listeners of changes', () => {
    const slots = new SaveSlots(memoryKv());
    const seen: number[] = [];
    const off = slots.subscribe(s => seen.push(s));
    slots.storage(3).write(raw());
    slots.adopt(2, null, null);
    off();
    slots.storage(1).write(raw());
    expect(seen).toEqual([3, 2]);
  });
});
