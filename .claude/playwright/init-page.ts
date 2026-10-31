// Serves the legacy build at http://cyberfunk.local/ straight from legacy/dist/, read fresh on every
// request, during the TypeScript migration. P5 repoints this at the new multi-file dist/.
import { fileURLToPath } from 'url';

const GAME = fileURLToPath(new URL('../../legacy/dist/cyberfunk.html', import.meta.url));

export default async ({ page }) => {
  await page.route('http://cyberfunk.local/**', route =>
    route.fulfill({ path: GAME, contentType: 'text/html; charset=utf-8' }),
  );
};
