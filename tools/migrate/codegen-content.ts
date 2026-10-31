/**
 * One-time migration: writes the combat/data content files under src/content from the legacy tables,
 * preserving every value and the legacy key order. Function fields are carried over as legacy source
 * with mechanical rewrites (helpers → ops, Math.random → rng) and then reviewed by hand. After
 * generation these files are hand-owned; this script is kept for reference and deleted at cutover.
 *
 *   npx tsx tools/migrate/codegen-content.ts && npx prettier --write src/content
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadLegacy } from '../parity/legacy';
import { serialize, type SerializeOptions } from './serialize';

/* eslint-disable @typescript-eslint/no-explicit-any */
const { E } = loadLegacy();
const ROOT = path.resolve('src/content');

function write(rel: string, body: string) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body.trimStart());
}

/** Mechanical rewrites of legacy function source (reviewed by hand afterwards). */
function portFn(src: string): string {
  return src
    .replace(/c\.battle\.helpers\.(\w+)\(c, /g, 'c.ops.$1(')
    .replace(/c\.battle\.helpers\.(\w+)\(c\)/g, 'c.ops.$1()')
    .replace(/c\.battle\.log\(/g, 'c.ops.log(')
    .replace(/c\.battle\.flee = true;?/g, 'c.ops.flee();')
    .replace(/Math\.random\(\)/g, 'c.rng.next()');
}

const effectOpts = (extra: Partial<SerializeOptions> = {}): SerializeOptions => ({
  ...extra,
  renames: { fx: 'effects', k: 'kind', amt: 'amount', use: 'effects', ...(extra.renames ?? {}) },
  rewrite: (key, value) => (key === 'k' && value === 'fn' ? 'custom' : value),
  fn: f => portFn(f.toString()),
});

const rows = (table: Record<string, any>, ids: string[], opts: SerializeOptions, addId = false) =>
  ids
    .map(
      id =>
        `  ${/^[A-Za-z_$][\w$]*$/.test(id) ? id : JSON.stringify(id)}: ${serialize(addId ? { id, ...table[id] } : table[id], opts)},`,
    )
    .join('\n');

/* ---------------- combat basics ---------------- */
write(
  'combat/tones.ts',
  `
/** The five tones. Every enemy is weak to one and may resist one; SWEET is healing-only. */
import type { ToneId } from '@core/ids/combat';
import type { Table, ToneDef } from '@core/types';

export const TONES = {
${rows(E.TONES, Object.keys(E.TONES), {}, true)}
} as const satisfies Table<ToneId, ToneDef>;
`,
);

write(
  'combat/statuses.ts',
  `
/**
 * Status effects. Simple stat changes are data (\`mod\`); everything else (Scorched's burn, Muted,
 * Countermelody, Silence…) is a mechanic the engine implements by id. See docs/systems/combat.md.
 */
import type { StatusId } from '@core/ids/combat';
import type { StatusDef, Table } from '@core/types';

export const STATUSES = {
${rows(E.STATUSES, Object.keys(E.STATUSES), {}, true)}
} as const satisfies Table<StatusId, StatusDef>;
`,
);

write(
  'combat/timing.ts',
  `
/** On the One timing grades. The grade multiplies every hit of the action. */
import type { TimingId } from '@core/ids/combat';
import type { Table, TimingGradeDef } from '@core/types';

export const TIMING = {
${rows(E.TIMING, Object.keys(E.TIMING), {})}
} as const satisfies Table<TimingId, TimingGradeDef>;
`,
);

/* ---------------- skills ---------------- */
const skillOpts = effectOpts({ renames: { lvl: 'level' } as any });
const skillIds = Object.keys(E.SKILLS);
const skillTable = (name: string, doc: string, ids: string[]) => `
/** ${doc} */
import type { SkillId } from '@core/ids/combat';
import type { SkillDef, Table } from '@core/types';

export const ${name} = {
${rows(E.SKILLS, ids, skillOpts)}
} satisfies Partial<Table<SkillId, SkillDef>>;
`;
write(
  'combat/enemySkills.ts',
  skillTable(
    'ENEMY_SKILLS',
    'Normal-enemy attacks and signature moves.',
    skillIds.filter(i => i.startsWith('en_')),
  ),
);
write(
  'combat/bossSkills.ts',
  skillTable(
    'BOSS_SKILLS',
    'Boss moves. Which one a boss uses each turn is decided by its AI (content/bosses).',
    skillIds.filter(i => i.startsWith('b_')),
  ),
);
write(
  'combat/assistSkills.ts',
  skillTable(
    'ASSIST_SKILLS',
    'Bandmate assists, used every third round by each active bandmate.',
    skillIds.filter(i => i.startsWith('as_')),
  ),
);

/* ---------------- classes (one file each, with their skills) ---------------- */
for (const [cls, c] of Object.entries<any>(E.CLASSES)) {
  const ids = [c.riff, ...c.skills, c.solo];
  write(
    `classes/${cls}.ts`,
    `
/** ${c.name}: ${c.title}. ${c.role}. */
import type { SkillId } from '@core/ids/combat';
import type { ClassDef, SkillDef, Table } from '@core/types';

export const ${cls} = ${serialize(c, {})} as const satisfies ClassDef;

/** ${c.name} skills: riff, six unlockable skills (levels 1, 3, 5, 7, 10, 13) and the solo. */
export const ${cls}Skills = {
${rows(E.SKILLS, ids, skillOpts)}
} satisfies Partial<Table<SkillId, SkillDef>>;
`,
  );
}
const classIds = Object.keys(E.CLASSES);
write(
  'classes/index.ts',
  `
/** The seven instrument classes and all of their skills. */
import type { ClassId } from '@core/ids/combat';
import type { ClassDef, Table } from '@core/types';
${classIds.map(c => `import { ${c}, ${c}Skills } from './${c}';`).join('\n')}

export const CLASSES = { ${classIds.join(', ')} } satisfies Table<ClassId, ClassDef>;

/** Every class skill, in class order. */
export const CLASS_SKILLS = { ${classIds.map(c => `...${c}Skills`).join(', ')} };
`.replace(
    "import type { ClassId } from '@core/ids/combat';",
    "import type { ClassId } from '@core/ids/characters';",
  ),
);

/* ---------------- roots ---------------- */
const roots = JSON.parse(JSON.stringify(E.ROOTS));
roots.creole.discount = { districts: ['treme', 'quarter'], mult: 0.95 };
roots.cajun.discount = { districts: ['bayou'], mult: 0.95 };
write(
  'roots.ts',
  `
/** Character roots: where you grew up. A stat bonus, starting kit, and a discount at home. */
import type { RootsId } from '@core/ids/characters';
import type { RootsDef, Table } from '@core/types';

export const ROOTS = {
${rows(roots, Object.keys(roots), {})}
} satisfies Table<RootsId, RootsDef>;
`,
);

/* ---------------- enemies (by district) ---------------- */
const enemyOpts: SerializeOptions = { renames: { lvl: 'levels' } };
const enemies = Object.values<any>(E.ENEMIES);
const districtIds = Object.keys(E.DISTRICTS);
const camel = (s: string) => s.replace(/_(\w)/g, (_, c) => c.toUpperCase());
for (const d of districtIds) {
  const ids = enemies.filter(e => e.district === d && e.id !== 'ghost_track' && !e.rival).map(e => e.id);
  write(
    `districts/${d}/enemies.ts`,
    `
/** ${E.DISTRICTS[d].name}: street enemies and the district elite. */
import type { EnemyId } from '@core/ids/enemies';
import type { EnemyDef, Table } from '@core/types';

export const ${camel(d)}Enemies = {
${rows(E.ENEMIES, ids, enemyOpts)}
} satisfies Partial<Table<EnemyId, EnemyDef>>;
`,
  );
}
write(
  'enemies/summons.ts',
  `
/** Enemies that only appear when a boss calls them in. */
import type { EnemyId } from '@core/ids/enemies';
import type { EnemyDef, Table } from '@core/types';

export const SUMMONS = {
${rows(E.ENEMIES, ['ghost_track'], enemyOpts)}
} satisfies Partial<Table<EnemyId, EnemyDef>>;
`,
);
write(
  'enemies/rivals.ts',
  `
/** Cutting Contest rivals at Club Feu Follet. They fight with real class skills. */
import type { EnemyId } from '@core/ids/enemies';
import type { EnemyDef, Table } from '@core/types';

export const RIVALS = {
${rows(
  E.ENEMIES,
  enemies.filter(e => e.rival).map(e => e.id),
  enemyOpts,
)}
} satisfies Partial<Table<EnemyId, EnemyDef>>;
`,
);
write(
  'enemies/index.ts',
  `
/** Every non-boss enemy. Key order matters (spar pools iterate it), so keep this merge order. */
import type { EnemyId } from '@core/ids/enemies';
import type { EnemyDef, Table } from '@core/types';
${districtIds.map(d => `import { ${camel(d)}Enemies } from '../districts/${d}/enemies';`).join('\n')}
import { RIVALS } from './rivals';
import { SUMMONS } from './summons';

export const ENEMIES = {
  ${districtIds.map(d => `...${camel(d)}Enemies`).join(',\n  ')},
  ...SUMMONS,
  ...RIVALS,
} satisfies Table<EnemyId, EnemyDef>;
`,
);

/* ---------------- districts ---------------- */
for (const d of districtIds) {
  write(
    `districts/${d}/district.ts`,
    `
/** ${E.DISTRICTS[d].name}. */
import type { DistrictDef } from '@core/types';

export const ${camel(d)} = ${serialize(E.DISTRICTS[d], { renames: { lvl: 'levels' } })} as const satisfies DistrictDef;
`,
  );
}
write(
  'districts/index.ts',
  `
/** The districts of Neon Orleans, in travel and story order. */
import type { DistrictId } from '@core/ids/world';
import type { DistrictDef, Table } from '@core/types';
${districtIds.map(d => `import { ${camel(d)} } from './${d}/district';`).join('\n')}

export const DISTRICTS = { ${districtIds.map(d => `${d}: ${camel(d)}`).join(', ')} } satisfies Table<DistrictId, DistrictDef>;
`,
);

/* ---------------- bosses (functions ported by hand afterwards) ---------------- */
const bossIds = Object.keys(E.BOSSES);
// Boss files (data + AI hooks) were hand-ported from the legacy rows; see src/content/bosses/*.ts.
write(
  'bosses/index.ts',
  `
/** Every boss, in story order. */
import type { BossId } from '@core/ids/enemies';
import type { BossDef, Table } from '@core/types';
${bossIds.map(b => `import { ${camel(b)} } from './${b}';`).join('\n')}

export const BOSSES = { ${bossIds.map(b => `${b}: ${camel(b)}`).join(', ')} } satisfies Table<BossId, BossDef>;
`,
);

/* ---------------- notes ---------------- */
const notes: any = {};
for (const n of E.SCALE_ORDER) {
  const { boss: _boss, ...rest } = E.BLUE_NOTES[n];
  notes[n] = { ...rest, freq: E.NOTE_FREQ[n] };
}
write(
  'notes.ts',
  `
/** The six Blue Notes of the blues scale, in scale order. Each boss guards one (BossDef.note). */
import type { NoteId } from '@core/ids/enemies';
import type { NoteDef, Table } from '@core/types';

export const NOTES = {
${rows(notes, Object.keys(notes), {})}
} satisfies Table<NoteId, NoteDef>;
`,
);

/* ---------------- items ---------------- */
const items = JSON.parse(
  JSON.stringify(E.ITEMS, (_k, v) => (typeof v === 'function' ? `__FN__${v.toString()}` : v)),
);
items.grisgris.revive = { pct: 0.3, line: 'Your Gris-Gris Bag burns up and pulls you back. 30% Heart.' };
const unfn = (o: any): any => {
  if (typeof o === 'string' && o.startsWith('__FN__')) return { __fn: o.slice(6) };
  if (Array.isArray(o)) return o.map(unfn);
  if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, unfn(v)]));
  return o;
};
const itemsWithFns = unfn(items);
const itemOpts = effectOpts();
const restoreFns = (src: string) =>
  src.replace(/\{ __fn: "((?:[^"\\]|\\.)*)" \}/g, (_m, s) => portFn(JSON.parse(`"${s}"`)));
write(
  'items.ts',
  restoreFns(`
/** Consumables and key items. \`effects\` run through the same resolver as skills, targeting you. */
import type { ItemId } from '@core/ids/items';
import type { ItemDef, Table } from '@core/types';

export const ITEMS = {
${rows(itemsWithFns, Object.keys(itemsWithFns), itemOpts)}
} satisfies Table<ItemId, ItemDef>;
`),
);

/* ---------------- gear ---------------- */
const tiers = (E.INSTRUMENT_TIERS as any[]).map(t => {
  const { tier, lvl, ...rest } = t;
  return { id: tier, ...rest, level: lvl };
});
write(
  'gear/instruments.ts',
  `
/**
 * Instruments: every class gets one per tier, generated here (not hand-written rows). The legendary
 * tier takes the class's \`legendary\` name.
 */
import { INSTRUMENT_TIER_IDS, type InstrumentId, type InstrumentTierId } from '@core/ids/items';
import { CLASS_IDS } from '@core/ids/characters';
import type { GearDef, InstrumentTierDef, Table } from '@core/types';
import { CLASSES } from '../classes';

export const INSTRUMENT_TIERS = {
${tiers.map(t => `  ${t.id}: ${serialize(t)},`).join('\n')}
} satisfies Table<InstrumentTierId, InstrumentTierDef>;

function makeInstruments(): Table<InstrumentId, GearDef> {
  const out: Record<string, GearDef> = {};
  for (const clsId of CLASS_IDS) {
    const cls = CLASSES[clsId];
    for (const tierId of INSTRUMENT_TIER_IDS) {
      const t: InstrumentTierDef = INSTRUMENT_TIERS[tierId];
      const id: InstrumentId = \`inst_\${clsId}_\${tierId}\`;
      out[id] = {
        id,
        slot: 'instrument',
        cls: clsId,
        tier: tierId,
        name: t.legendary ? cls.legendary : \`\${t.label} \${cls.name}\`,
        price: t.price,
        level: t.level,
        legendary: !!t.legendary,
        stats: { chops: t.chops },
        desc: t.legendary
          ? \`\${cls.name}'s legendary. Chops +\${t.chops}. Built by Ti-Jacques from five Blue Notes' worth of chrome.\`
          : \`\${cls.name}. Chops +\${t.chops}.\`,
      };
    }
  }
  return out as Table<InstrumentId, GearDef>;
}

/** Every instrument, class-major then tier order (matches v1's generation order). */
export const INSTRUMENTS = makeInstruments();
`,
);
const gearRows = (slot: string) =>
  Object.values<any>(E.GEAR)
    .filter(g => g.slot === slot)
    .map(g => g.id);
for (const [slot, file, name, idType] of [
  ['threads', 'threads', 'THREADS', 'ThreadsId'],
  ['charm', 'charms', 'CHARMS', 'CharmId'],
  ['mod', 'mods', 'MODS', 'ModId'],
] as const) {
  write(
    `gear/${file}.ts`,
    `
/** ${name === 'THREADS' ? 'Threads: the body slot.' : name === 'CHARMS' ? 'Charms: luck, protection and odd powers.' : 'Cyber mods: chrome upgrades.'} */
import type { ${idType} } from '@core/ids/items';
import type { GearDef, Table } from '@core/types';

export const ${name} = {
${rows(E.GEAR, gearRows(slot), { renames: { lvl: 'level' } })}
} satisfies Table<${idType}, GearDef>;
`,
  );
}
write(
  'gear/index.ts',
  `
/** All gear, in v1 order: generated instruments, then threads, charms, mods. */
import type { GearId } from '@core/ids/items';
import type { GearDef, Table } from '@core/types';
import { CHARMS } from './charms';
import { INSTRUMENTS } from './instruments';
import { MODS } from './mods';
import { THREADS } from './threads';

export const GEAR: Table<GearId, GearDef> = { ...INSTRUMENTS, ...THREADS, ...CHARMS, ...MODS };
`,
);

/* ---------------- sheet music, band, second line ---------------- */
const sheetPassive: Record<string, object> = {
  sm_circular: { funkRegen: 1 },
  sm_secondwind: { secondWind: true },
  sm_swing: { oneZone: 0.3 },
  sm_rubato: { dodgeBonus: 0.08 },
  sm_ghost: { critDmg: 2.0 },
};
const sheet: any = {};
for (const [id, s] of Object.entries<any>(E.SHEET_MUSIC)) sheet[id] = { ...s, passive: sheetPassive[id] };
write(
  'sheetMusic.ts',
  `
/** Sheet music: techniques bought once and always on. Their effects are data (\`passive\`). */
import type { SheetMusicId } from '@core/ids/items';
import type { SheetMusicDef, Table } from '@core/types';

export const SHEET_MUSIC = {
${rows(sheet, Object.keys(sheet), {})}
} satisfies Table<SheetMusicId, SheetMusicDef>;
`,
);
const bandPassive: Record<string, object> = {
  sugar: { healBonus: 0.1 },
  static: { doubloonBonus: 0.1 },
  remy: { dodgeBonus: 0.05 },
  moses: { funkRegen: 1 },
};
const band: any = {};
for (const [id, b] of Object.entries<any>(E.BANDMATES)) {
  const { passive, passiveId: _p, blurb, arc, ...rest } = b;
  band[id] = { ...rest, passive: bandPassive[id], passiveDesc: passive, blurb, arc };
}
write(
  'band/bandmates.ts',
  `
/** Bandmates you can recruit. Two can be active: each assists every third round and adds a passive. */
import type { BandmateId } from '@core/ids/band';
import type { BandmateDef, Table } from '@core/types';

export const BANDMATES = {
${rows(band, Object.keys(band), {})}
} satisfies Table<BandmateId, BandmateDef>;
`,
);
const condSrc = (f: any) =>
  f
    .toString()
    .replace(/^s => /, 's => ')
    .replace(/s\.flags\.contracts/g, 's.choices.contracts')
    .replace(/s\.flags\.vox/g, 's.choices.vox')
    .replace(/s\.flags\.lucien/g, 's.choices.lucien')
    .replace(/s\.flags\.gusFreed/g, '!!s.flags.gusFreed');
write(
  'band/secondLine.ts',
  `
/** Who marches in the second line on the Tower, in order. \`when\` decides if they've joined. */
import type { SecondLineMemberDef } from '@core/types';

export const SECOND_LINE: readonly SecondLineMemberDef[] = [
${(E.SECOND_LINE as any[]).map(m => `  { id: ${JSON.stringify(m.id)}, name: ${JSON.stringify(m.name)}, when: ${condSrc(m.cond)}, line: ${JSON.stringify(m.line)} },`).join('\n')}
];
`,
);
console.log('wrote src/content (combat + data)');
