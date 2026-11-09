/* Balance diff: runs the sim (tools/sim.ts) at a git ref and in the working tree over several seeds,
   averages each side, and prints the matchups that moved beyond the noise.
   The sim is deterministic for a seed, so the same code gives the same numbers; averaging seeds 1..N
   measures the change rather than one seed's luck.
   Usage: node .claude/skills/balance-check/compare.js [--ref HEAD] [--runs 3] [--all] */
const fs = require('fs'); const os = require('os'); const path = require('path');
const { execFileSync, execSync } = require('child_process');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const REF = opt('--ref', 'HEAD'); const RUNS = +opt('--runs', 3); const ALL = argv.includes('--all');
const ROOT = execSync('git rev-parse --show-toplevel').toString().trim();
const TSX = path.join(ROOT, 'node_modules', '.bin', 'tsx');

function parse(text) {
  const rows = {}; let cls = '';
  for (const line of text.split('\n')) {
    let m = /^=== (\w+) ===/.exec(line); if (m) { cls = m[1].toLowerCase(); continue; }
    m = /^BOSS (\w+)\s+L(\d+): win (\d+)% rounds ([\d.-]+) items ([\d.-]+) beads [\d.-]+ hpLeft (\d+)%/.exec(line);
    if (m) { rows[`${cls} vs ${m[1]}`] = { L: +m[2], win: +m[3], rounds: +m[4], items: +m[5], hp: +m[6], kind: 'boss' }; continue; }
    m = /^(\w+)\s+L(\d+) n=\d+: win (\d+)% rounds ([\d.]+|NaN) hpLost (\d+|NaN)%/.exec(line);
    if (m) rows[`${cls} in ${m[1]}`] = { L: +m[2], win: +m[3], rounds: +m[4], items: 0, hp: 100 - +m[5], kind: 'street' };
  }
  return rows;
}
function runAvg(cwd) {
  const all = [];
  for (let seed = 1; seed <= RUNS; seed++)
    all.push(parse(execFileSync(TSX, ['tools/sim.ts', '--seed', String(seed)], { cwd, maxBuffer: 16 << 20 }).toString()));
  const out = {};
  for (const k of Object.keys(all[0])) {
    const vals = all.map(r => r[k]).filter(Boolean);
    const mean = f => vals.reduce((a, v) => a + v[f], 0) / vals.length;
    out[k] = { L: vals[0].L, kind: vals[0].kind, win: mean('win'), rounds: mean('rounds'), items: mean('items'), hp: mean('hp') };
  }
  return out;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-sim-'));
try {
  // The ref's code, with this checkout's node_modules (the sim needs tsx and nothing else installed).
  execSync(`git archive ${JSON.stringify(REF)} src tools package.json tsconfig.json | tar -x -C ${JSON.stringify(tmp)}`, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(tmp, 'node_modules'), 'dir');
  const before = runAvg(tmp); const after = runAvg(ROOT);
  const f1 = n => (Number.isFinite(n) ? n.toFixed(1) : '-');
  const sign = n => (n > 0 ? '+' : '') + f1(n);
  const lines = []; const added = []; const removed = [];
  for (const k of Object.keys(after)) {
    const a = after[k], b = before[k];
    if (!b) { added.push(k); continue; }
    const dWin = a.win - b.win, dHp = a.hp - b.hp, dRoundsPct = b.rounds ? (a.rounds - b.rounds) / b.rounds * 100 : 0;
    // Thresholds sit just above seed-to-seed noise for N=40-60 fights averaged over 3 seeds.
    const moved = Math.abs(dWin) >= 4 || Math.abs(dHp) >= 6 || Math.abs(dRoundsPct) >= 15;
    if (moved || ALL) lines.push(`${k.padEnd(28)} L${String(a.L).padEnd(3)} win ${f1(b.win)}→${f1(a.win)} (${sign(dWin)})  rounds ${f1(b.rounds)}→${f1(a.rounds)} (${sign(dRoundsPct)}%)  hp ${f1(b.hp)}→${f1(a.hp)} (${sign(dHp)})`);
  }
  for (const k of Object.keys(before)) if (!after[k]) removed.push(k);
  const risky = Object.entries(after).filter(([, v]) => v.win < 90).map(([k, v]) => `${k} (L${v.L}) win ${f1(v.win)}%`);
  console.log(`Balance diff: ${REF} → working tree, seeds 1-${RUNS}. hp = % Heart left after winning.`);
  console.log(lines.length ? lines.join('\n') : 'No matchup moved beyond the noise thresholds (win ±4, hp ±6, rounds ±15%).');
  if (added.length) console.log('\nNew matchups: ' + added.join(', '));
  if (removed.length) console.log('\nRemoved matchups: ' + removed.join(', '));
  console.log('\nBelow 90% win in the working tree: ' + (risky.length ? '\n  ' + risky.join('\n  ') : 'none'));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
