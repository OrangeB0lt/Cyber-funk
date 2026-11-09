/**
 * The app icons (the PWA manifest's and Apple's touch icon), drawn from the game's own pixel art:
 * Gus Thibodeaux, Grand Marshal, on the night-purple background. Rendered with Playwright, so no
 * image library is needed.
 *
 *   npx tsx tools/icons.ts   → public/icons/*.png (checked in; rerun after redrawing Gus)
 *
 * The maskable icon keeps the sprite inside the middle 60%, so any launcher mask leaves it whole.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { compiled, spriteSvg } from '@content/sprites';

const OUT = path.join(import.meta.dirname, '..', 'public', 'icons');
const BG = '#0b0218';

/** An icon: its file, its size, and how much of it the sprite may fill. */
const ICONS = [
  { file: 'icon-192.png', size: 192, fill: 0.8 },
  { file: 'icon-512.png', size: 512, fill: 0.8 },
  { file: 'maskable-512.png', size: 512, fill: 0.6 },
  { file: 'apple-touch-icon.png', size: 180, fill: 0.8 },
] as const;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const sprite = compiled('gus');
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const icon of ICONS) {
    // Whole pixels only: the largest integer scale that fits the allowed area.
    const scale = Math.floor((icon.size * icon.fill) / Math.max(sprite.w, sprite.h));
    const svg = spriteSvg(sprite, { scale });
    await page.setViewportSize({ width: icon.size, height: icon.size });
    await page.setContent(
      `<body style="margin:0;width:${icon.size}px;height:${icon.size}px;background:${BG};display:grid;place-items:center">${svg}</body>`,
    );
    await page.screenshot({ path: path.join(OUT, icon.file), omitBackground: false });
    console.log(`${icon.file}: ${icon.size}px, sprite ×${scale}`);
  }
  await browser.close();
}

await main();
