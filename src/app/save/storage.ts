/**
 * Where save text lives on the device. `SaveStorage` is synchronous on purpose: the game saves at
 * checkpoints in the middle of scenes and must never wait on a network. Cloud sync (sync.ts) runs
 * behind it, reading what slots.ts wrote.
 */

/** One save's text. */
export interface SaveStorage {
  /** Read the raw save (null if none or unavailable). */
  read(): string | null;
  /** Write; false if storage is unavailable. */
  write(raw: string): boolean;
  /** Delete. */
  clear(): void;
}

/** A string key-value store: browser localStorage, or a Map in tests. */
export interface KeyValue {
  /** Read (null if missing or unavailable). */
  get(key: string): string | null;
  /** Write; false if storage is unavailable or full. */
  set(key: string, value: string): boolean;
  /** Delete. */
  remove(key: string): void;
}

/** Browser localStorage. Every access is guarded: private modes and full disks throw. */
export const browserKv: KeyValue = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // unavailable: nothing to remove
    }
  },
};

/** An in-memory key-value store for tests and headless runs. */
export function memoryKv(initial: Record<string, string> = {}): KeyValue & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    get: key => data.get(key) ?? null,
    set: (key, value) => {
      data.set(key, value);
      return true;
    },
    remove: key => {
      data.delete(key);
    },
  };
}

/** In-memory storage for one save (headless sessions and the transcript cases). */
export function memorySaveStorage(initial: string | null = null): SaveStorage & { raw: string | null } {
  return {
    raw: initial,
    read() {
      return this.raw;
    },
    write(raw) {
      this.raw = raw;
      return true;
    },
    clear() {
      this.raw = null;
    },
  };
}
