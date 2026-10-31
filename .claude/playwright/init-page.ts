// Serves the built game at http://cyberfunk.local/ straight from dist/, read fresh on every
// request, so a reload after `npm run build` shows the new build. No server and no file:// access.
import { fileURLToPath } from 'url';

const GAME = fileURLToPath(new URL('../../dist/cyberfunk.html', import.meta.url));

export default async ({ page }) => {
  await page.route('http://cyberfunk.local/**', route => route.fulfill({ path: GAME, contentType: 'text/html; charset=utf-8' }));
};
