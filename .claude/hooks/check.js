/* Stop hook: when Claude finishes a turn that changed code, run `npm run check` (types, lint,
   formatting, layer rules, every Vitest suite) before handing back. On failure it exits 2 with a
   short summary, which sends Claude back to fix it.

   - Runs only when the code changed since the last green run (a hash of the files' contents, so it
     survives commits and catches untracked files). A turn that only answered a question costs a hash.
   - Never re-runs on the exact code that already failed, and gives up after 3 blocks in a row in
     one session, so it can't loop.
   - State lives in .claude/hooks/.check-state.json (gitignored). Delete it to force a run.

   Same checks as the git pre-commit hook (.githooks/pre-commit), run in parallel (~10 s). */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawn } = require('child_process');

const root = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..');
const STATE = path.join(__dirname, '.check-state.json');
/** What the checks read. A change anywhere else (docs, for example) doesn't need a run. */
const WATCH = [
  'src',
  'tools',
  'tests',
  'server',
  'docs/reference',
  'docs/vision/character-design.md',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'vitest.config.ts',
  'eslint.config.js',
  'playwright.config.ts',
  '.dependency-cruiser.cjs',
  '.prettierrc',
  '.prettierignore',
];
const CHECKS = ['typecheck', 'lint', 'format:check', 'depcruise', 'test'];
const MAX_BLOCKS = 3;
const MAX_REPORT = 8000;

const readStdin = () => {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
};
const load = () => {
  try {
    return JSON.parse(fs.readFileSync(STATE, 'utf8'));
  } catch {
    return {};
  }
};
const save = s => fs.writeFileSync(STATE, JSON.stringify(s, null, 2) + '\n');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const say = msg => console.log(JSON.stringify({ systemMessage: msg }));

/** A hash of every watched file's path and contents (tracked and untracked, minus ignored). */
function fingerprint() {
  const files = git(['ls-files', '-co', '--exclude-standard', '-z', '--', ...WATCH])
    .split('\0')
    .filter(Boolean)
    .sort();
  const h = crypto.createHash('sha256');
  for (const f of [...new Set(files)]) {
    h.update(f + '\0');
    try {
      h.update(fs.readFileSync(path.join(root, f)));
    } catch {
      h.update('<deleted>');
    }
    h.update('\0');
  }
  return h.digest('hex');
}

/** Run one npm script; resolves with its exit code and combined output. */
function run(script) {
  const npm = path.join(path.dirname(process.execPath), process.platform === 'win32' ? 'npm.cmd' : 'npm');
  const cmd = fs.existsSync(npm) ? npm : 'npm';
  const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' };
  delete env.CI;
  return new Promise(resolve => {
    const child = spawn(cmd, ['run', '-s', script], { cwd: root, env });
    let out = '';
    child.stdout.on('data', d => (out += d));
    child.stderr.on('data', d => (out += d));
    child.on('error', e => resolve({ script, code: 1, out: String(e) }));
    child.on('close', code => resolve({ script, code, out }));
  });
}

/** The useful part of a failing check's output. */
function summarize({ script, out }) {
  let lines = out.split('\n').filter(l => !/^\s+at |^\s*$|node_modules\//.test(l));
  if (script === 'typecheck') lines = lines.filter(l => /error TS\d+/.test(l));
  if (script === 'format:check') lines = [...lines.filter(l => /\[warn\]/.test(l)), 'Fix: npm run format'];
  if (script === 'test') {
    const i = lines.findIndex(l => /Failed Tests|FAIL /.test(l));
    if (i > 0) lines = lines.slice(i);
  }
  const hints = [];
  if (/docs:codemap/.test(out)) hints.push('Fix: npm run docs:codemap');
  if (/sprites:export/.test(out)) hints.push('Fix: npm run sprites:export');
  return [`── npm run ${script} failed`, ...lines.slice(0, 60), ...hints].join('\n');
}

async function main() {
  const input = readStdin();
  if (!fs.existsSync(path.join(root, 'node_modules')) || !fs.existsSync(path.join(root, '.git'))) return 0;
  const state = load();
  const fp = fingerprint();
  if (state.green === fp) return 0;
  if (!state.green && !git(['status', '--porcelain', '--', ...WATCH]).trim()) {
    // First run on a clean tree: trust what's committed.
    save({ ...state, green: fp });
    return 0;
  }
  if (state.failed && state.failed.fp === fp) {
    say('npm run check is still failing on this code (reported earlier); not re-running.');
    return 0;
  }
  const results = await Promise.all(CHECKS.map(run));
  const failed = results.filter(r => r.code !== 0);
  if (!failed.length) {
    save({ green: fp });
    say('npm run check passed.');
    return 0;
  }
  const session = input.session_id || null;
  const prev = state.failed;
  const count = prev && input.stop_hook_active && prev.session === session ? prev.count + 1 : 1;
  save({ ...state, failed: { fp, session, count } });
  if (count > MAX_BLOCKS) {
    say(`npm run check still fails (${failed.map(r => r.script).join(', ')}) after ${MAX_BLOCKS} tries; handing back.`);
    return 0;
  }
  let report = `npm run check failed (${failed.map(r => r.script).join(', ')}). Fix these before finishing:\n\n`;
  report += failed.map(summarize).join('\n\n');
  if (report.length > MAX_REPORT) report = report.slice(0, MAX_REPORT) + '\n… (truncated; run npm run check)';
  process.stderr.write(report + '\n');
  return 2;
}

main().then(
  code => process.exit(code),
  e => {
    // A broken hook must never trap Claude: report and let the turn end.
    say(`check hook error: ${e && e.message}`);
    process.exit(0);
  },
);
