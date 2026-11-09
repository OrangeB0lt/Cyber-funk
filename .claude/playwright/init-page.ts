// Serves the game at http://cyberfunk.local/ from dist-e2e/: the test-mode build (production code,
// cloud saves off, and the window.CF handle). Build it with `npm run build:test`; `npm run e2e`
// builds it too. Files are read fresh on every request, so a rebuild shows up on reload. Service
// workers are blocked in config.json, so nothing is cached between builds.
// CommonJS on purpose: .claude/package.json marks this folder "type": "commonjs".
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../dist-e2e');
const INDEX = path.join(ROOT, 'index.html');
const NO_BUILD =
  '<!doctype html><meta charset="utf-8"><title>No build</title>' +
  '<p>dist-e2e/ has no build. Run <code>npm run build:test</code>, then reload.</p>';

const isFile = file => fs.existsSync(file) && fs.statSync(file).isFile();

module.exports = async ({ page }) => {
  await page.route('http://cyberfunk.local/**', route => {
    const { pathname } = new URL(route.request().url());
    // No server behind this build (cloud saves are off), so the API never answers.
    if (pathname.startsWith('/api/')) return route.fulfill({ status: 404, body: '' });
    const file = path.join(ROOT, decodeURIComponent(pathname));
    if (file.startsWith(ROOT + path.sep) && isFile(file)) return route.fulfill({ path: file });
    // A missing asset is a 404; any other path is the game's page.
    if (path.extname(pathname)) return route.fulfill({ status: 404, body: '' });
    if (!isFile(INDEX))
      return route.fulfill({ status: 503, contentType: 'text/html; charset=utf-8', body: NO_BUILD });
    return route.fulfill({ path: INDEX });
  });
};
