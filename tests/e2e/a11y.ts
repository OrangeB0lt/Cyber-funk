/**
 * Accessibility checks for the e2e suite: axe-core (WCAG 2.2 A and AA) on whatever the page shows.
 * Any violation fails. There's no allowlist: the P3 accessibility pass emptied it, and a new
 * violation gets fixed, not listed.
 *
 * Set A11Y_REPORT=1 to collect every violation into test-results/a11y-report.jsonl instead of
 * failing (handy when a change trips several at once).
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Run axe on the page and fail on any violation. `settle: false` skips waiting for animations (the
 * timing bar resolves itself within about a second).
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
  expect(found, `accessibility on ${label}`).toEqual([]);
}
