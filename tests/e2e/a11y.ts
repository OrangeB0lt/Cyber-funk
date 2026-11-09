/**
 * Accessibility checks for the e2e suite: axe-core (WCAG 2.2 A and AA) on whatever the page shows.
 *
 * `A11Y_ALLOW` lists the violations the game still has, per rule, with the screens they fire on. A
 * violation that isn't listed fails, and so does a listed one that no longer fires on a screen it's
 * listed for, so the list can only shrink. The accessibility pass empties it.
 *
 * Set A11Y_REPORT=1 to collect every violation into test-results/a11y-report.jsonl instead of
 * failing (for (re)building the list).
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Known violations: rule id → why it's still there and the screens (labels) it fires on. */
export const A11Y_ALLOW: Record<string, { reason: string; on: readonly string[] }> = {
  'label-content-name-mismatch': {
    reason:
      'aria-labels that replace the visible text: the Topbar ("Status and skills" hides the name, Heart, Funk, Doubloons), the version button, enemy target cards, the timing bar',
    on: [
      'title',
      'district',
      'place',
      'story',
      'story:choices',
      'battle',
      'battle:skills',
      'battle:target',
      'battle:timing',
      'battle:auto',
      'battle:victory',
      'battle:defeat',
    ],
  },
  'color-contrast': {
    reason: 'locked skills are drawn at 50% opacity (tone badge and level text)',
    on: ['sheet:status'],
  },
};

/**
 * Run axe on the page and fail on anything not in A11Y_ALLOW for this screen. `settle: false` skips
 * waiting for animations (the timing bar resolves itself within about a second).
 */
export async function expectAccessible(
  page: Page,
  label: string,
  opts: { settle?: boolean } = {},
): Promise<void> {
  // A sheet sliding in is half transparent: let finite animations finish so contrast is measured on
  // what the player ends up seeing.
  if (opts.settle !== false)
    await page.evaluate(() =>
      Promise.race([
        Promise.all(
          document
            .getAnimations()
            .filter(a => a.effect?.getTiming().iterations !== Infinity)
            .map(a => a.finished.catch(() => {})),
        ),
        new Promise(r => setTimeout(r, 2000)),
      ]),
    );
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const found = violations.map(v => ({
    rule: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 4).map(n => n.target.join(' ')),
  }));
  if (process.env.A11Y_REPORT) {
    mkdirSync('test-results', { recursive: true });
    appendFileSync('test-results/a11y-report.jsonl', JSON.stringify({ label, found }) + '\n');
    return;
  }
  const unexpected = found.filter(f => !A11Y_ALLOW[f.rule]?.on.includes(label));
  const fired = new Set(found.map(f => f.rule));
  const stale = Object.entries(A11Y_ALLOW)
    .filter(([rule, a]) => a.on.includes(label) && !fired.has(rule))
    .map(([rule]) => `${rule} no longer fires on ${label}: remove it from A11Y_ALLOW`);
  expect([...unexpected, ...stale], `accessibility on ${label}`).toEqual([]);
}
