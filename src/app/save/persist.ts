/**
 * Ask the browser to keep this site's storage (the saves) when the device runs low on space. Browsers
 * may say no (Chrome grants it to installed or bookmarked sites; Safari mostly ignores it), and the
 * game works either way: this only makes an eviction less likely. Asked once per page, as soon as
 * there's a game worth keeping.
 */
let asked = false;

/** Request persistent storage, once. Never throws. */
export function requestPersistentStorage(
  nav: Pick<Navigator, 'storage'> | undefined = globalThis.navigator,
): void {
  if (asked) return;
  asked = true;
  try {
    void nav?.storage?.persist?.().catch(() => {});
  } catch {
    /* not available */
  }
}

/** Tests: forget that it was asked. */
export function resetPersistRequest(): void {
  asked = false;
}
