/* PostToolUse hook: keeps legacy/dist/ in sync with legacy/src/ during the TypeScript migration.
   If any legacy source file is newer than legacy/dist/cyberfunk.html, syntax-check the changed .js
   files and run legacy/build.js. Exit 2 hands the error back to Claude so a broken file is caught at
   the edit. Does nothing once legacy/ is deleted at cutover (P5 replaces this hook). */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..');
const legacy = path.join(root, 'legacy');
if (!fs.existsSync(path.join(legacy, 'src'))) process.exit(0);
const out = path.join(legacy, 'dist', 'cyberfunk.html');
const built = fs.existsSync(out) ? fs.statSync(out).mtimeMs : 0;
const sources = fs
  .readdirSync(path.join(legacy, 'src'))
  .filter(f => /\.(js|css)$/.test(f))
  .map(f => path.join('src', f))
  .concat('build.js');
const changed = sources.filter(f => fs.statSync(path.join(legacy, f)).mtimeMs > built);
if (!changed.length) process.exit(0);
try {
  for (const f of changed)
    if (f.endsWith('.js')) execFileSync(process.execPath, ['--check', f], { cwd: legacy, stdio: 'pipe' });
  execFileSync(process.execPath, ['build.js'], { cwd: legacy, stdio: 'pipe' });
} catch (e) {
  const msg = String(e.stderr || e.message)
    .split('\n')
    .filter(l => !/^\s+at |^Node\.js v/.test(l))
    .join('\n')
    .trim();
  process.stderr.write(`legacy/dist/ NOT rebuilt: ${msg}\n`);
  process.exit(2);
}
console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `legacy/dist/ rebuilt by hook (changed: ${changed.join(', ')}).`,
    },
  }),
);
