/* PostToolUse hook: keeps dist/ in sync with src/. If any source file is newer than
   dist/cyberfunk.html (however it was edited), syntax-check the changed .js files and run
   build.js. Exit 2 hands the error back to Claude so a broken file is caught at the edit. */
const fs = require('fs'); const path = require('path');
const { execFileSync } = require('child_process');
const root = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..');
const out = path.join(root, 'dist', 'cyberfunk.html');
const built = fs.existsSync(out) ? fs.statSync(out).mtimeMs : 0;
const sources = fs.readdirSync(path.join(root, 'src')).filter(f => /\.(js|css)$/.test(f)).map(f => path.join('src', f)).concat('build.js');
const changed = sources.filter(f => fs.statSync(path.join(root, f)).mtimeMs > built);
if (!changed.length) process.exit(0);
try {
  for (const f of changed) if (f.endsWith('.js')) execFileSync(process.execPath, ['--check', f], { cwd: root, stdio: 'pipe' });
  execFileSync(process.execPath, ['build.js'], { cwd: root, stdio: 'pipe' });
} catch (e) {
  const msg = String(e.stderr || e.message).split('\n').filter(l => !/^\s+at |^Node\.js v/.test(l)).join('\n').trim();
  process.stderr.write(`dist/ NOT rebuilt: ${msg}\n`);
  process.exit(2);
}
console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: `dist/ rebuilt by hook (changed: ${changed.join(', ')}).` } }));
