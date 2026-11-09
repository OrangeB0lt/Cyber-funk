import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestPersistentStorage, resetPersistRequest } from './persist';

afterEach(() => resetPersistRequest());

describe('requestPersistentStorage', () => {
  it('asks once per page', () => {
    const persist = vi.fn(() => Promise.resolve(true));
    const nav = { storage: { persist } } as unknown as Navigator;
    requestPersistentStorage(nav);
    requestPersistentStorage(nav);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('is quiet where the API is missing or refuses', async () => {
    expect(() => requestPersistentStorage({} as Navigator)).not.toThrow();
    resetPersistRequest();
    const nav = { storage: { persist: () => Promise.reject(new Error('no')) } } as unknown as Navigator;
    expect(() => requestPersistentStorage(nav)).not.toThrow();
    await Promise.resolve();
  });
});
