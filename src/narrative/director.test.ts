import { describe, expect, it, vi } from 'vitest';
import { Director } from './director';
import { SceneInterrupt, type RunResult, type SceneContext } from './types';

const ctx = (signal: AbortSignal) => ({ signal }) as unknown as SceneContext;
const waitFor = (signal: AbortSignal) =>
  new Promise<void>((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)));

function director(over: Partial<ConstructorParameters<typeof Director>[0]> = {}) {
  const settled: RunResult[] = [];
  const d = new Director({
    makeContext: ctx,
    onInterrupt: { cut: async () => {} },
    onError: () => null,
    onSettled: r => settled.push(r),
    ...over,
  });
  return { d, settled };
}

describe('Director', () => {
  it('runs a scene and settles', async () => {
    const { d, settled } = director();
    const r = await d.run(async () => {}, { name: 'a' });
    expect(r).toEqual({ status: 'done' });
    expect(settled).toEqual([{ status: 'done' }]);
    expect(d.busy).toBe(false);
  });

  it('refuses a second scene while one is running (single flight)', async () => {
    const { d } = director();
    let release!: () => void;
    const first = d.run(() => new Promise<void>(r => (release = r)), { name: 'a' });
    expect(d.busy).toBe(true);
    expect(await d.run(async () => {}, { name: 'b' })).toEqual({ status: 'busy' });
    release();
    await first;
  });

  it('aborts a waiting scene so it unwinds', async () => {
    const { d } = director();
    const after = vi.fn();
    const run = d.run(
      async s => {
        await waitFor(s.signal);
        after();
      },
      { name: 'waits' },
    );
    await d.abort('title');
    expect(await run).toEqual({ status: 'aborted' });
    expect(after).not.toHaveBeenCalled();
  });

  it('runs the interrupt handler for a SceneInterrupt', async () => {
    const wake = vi.fn(async () => {});
    const { d } = director({ onInterrupt: { cut: wake } });
    const r = await d.run(
      async () => {
        throw new SceneInterrupt('cut');
      },
      { name: 'loses' },
    );
    expect(r).toEqual({ status: 'interrupted', kind: 'cut' });
    expect(wake).toHaveBeenCalledOnce();
  });

  it('recovers from an error with the fallback scene', async () => {
    const fallback = vi.fn(async () => {});
    const { d } = director({ onError: () => fallback });
    const r = await d.run(
      async () => {
        throw new Error('boom');
      },
      { name: 'breaks' },
    );
    expect(r.status).toBe('failed');
    expect(fallback).toHaveBeenCalledOnce();
  });
});
