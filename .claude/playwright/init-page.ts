// Serves the legacy build at http://cyberfunk.local/ straight from legacy/dist/, read fresh on every
// request, during the TypeScript migration. P5 repoints this at the new multi-file dist/.
// CommonJS on purpose: .claude/package.json marks this folder "type": "commonjs".
const path = require('path');

const GAME = path.resolve(__dirname, '../../legacy/dist/cyberfunk.html');

module.exports = async ({ page }) => {
  await page.route('http://cyberfunk.local/**', route =>
    route.fulfill({ path: GAME, contentType: 'text/html; charset=utf-8' }),
  );
};
