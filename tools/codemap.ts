/**
 * Generates the code map reference in docs/reference/code-map/: every source file, its declarations
 * and class members, and who uses what, read from the TypeScript program itself. The hand-written
 * tour of the flows is docs/architecture/code-map.md.
 *
 *   npm run docs:codemap                 write the pages
 *   npx tsx tools/codemap.ts --check     exit 1 if the committed pages are stale
 *
 * codemap.test.ts runs the check in `npm test`, so the pages can't drift from the code. The output is
 * deterministic (sorted, no line numbers, no timestamps), so it changes only when declarations,
 * imports, signatures or doc comments change.
 *
 * Nodes are every top-level declaration (exported or not), every class member, and the method-like
 * members of capability interfaces: interfaces outside .tsx files with at least one method or
 * function-typed property, such as SceneContext, Presenter, EffectOps and BossDef. Plain data fields
 * are left out. Edges come from resolving every identifier in a node's body with the type checker.
 * Object literals and classes that satisfy a capability interface are listed as its implementations,
 * so seams like "which content implements BossDef.ai, and which engine function calls it" are
 * generated.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** Where the pages go, relative to the repo root. */
export const OUT_DIR = 'docs/reference/code-map';
const SRC_LINK = '../../../';
const GUIDE_LINK = '../../architecture/code-map.md';
/** How many names a "uses" / "used by" line shows before "+N more". */
const REF_CAP = 16;
/** Areas with more source files than this get a folder-level diagram instead of a file-level one. */
const GRAPH_FILE_LIMIT = 30;

// ---------------------------------------------------------------------------------------------------
// Areas: one page each.

interface Area {
  key: string;
  title: string;
  root: string;
  blurb: string;
  /** Files on this page (test files always go to `tests`). */
  owns: RegExp;
}

const AREAS: Area[] = [
  {
    key: 'core',
    title: 'src/core',
    root: 'src/core/',
    blurb:
      'The floor layer: every id list, the shared types (GameState, Battle, Actor, content defs, effects), the seeded Rng and pure helpers. It imports nothing else from the project.',
    owns: /^src\/core\//,
  },
  {
    key: 'narrative',
    title: 'src/narrative',
    root: 'src/narrative/',
    blurb:
      'The scene API that story content is written against (Scene, SceneContext, Presenter), the Director that runs one scene at a time, and the place/event authoring helpers.',
    owns: /^src\/narrative\//,
  },
  {
    key: 'content',
    title: 'src/content',
    root: 'src/content/',
    blurb:
      'Typed game data and story scripts: classes, skills, statuses, enemies, bosses (with their AI), items, gear, districts, acts, and the *.scene.ts files. Content never imports the engine; it gets engine powers through EffectOps and BossCtx arguments.',
    owns: /^src\/content\//,
  },
  {
    key: 'engine',
    title: 'src/engine',
    root: 'src/engine/',
    blurb:
      'The game rules as plain functions over GameState and Battle: stats, progression, inventory, shops, encounters, aftermath, and the combat loop. It mutates in place, draws randomness only from the Rng it is given, and never waits on the UI.',
    owns: /^src\/engine\//,
  },
  {
    key: 'app',
    title: 'src/app',
    root: 'src/app/',
    blurb:
      'Runs the game without React: GameApp (every command the UI can issue), Session, the SceneContext implementation, the battle controller, the presenters, the view store, saves, and cloud sync.',
    owns: /^src\/app\//,
  },
  {
    key: 'ui',
    title: 'src/ui and src/main.tsx',
    root: 'src/ui/',
    blurb:
      'React components that render the two stores (game and view) and call GameApp commands, plus the browser entry point src/main.tsx.',
    owns: /^src\/ui\/|^src\/main\.tsx$/,
  },
  {
    key: 'server',
    title: 'server',
    root: 'server/',
    blurb:
      'The cloud-save API: the Fastify app, its routes, the PostgreSQL repository and Drizzle schema, migrations and player-code auth. It may import only src/core and the save format/protocol.',
    owns: /^server\//,
  },
  {
    key: 'tools',
    title: 'tools',
    root: 'tools/',
    blurb:
      'Node scripts: the balance sim and fight trace, the engine baselines and fight driver, the content validator, the layer check, the sprite and icon exporters, screenshots, and this generator.',
    owns: /^tools\//,
  },
  {
    key: 'tests',
    title: 'tests (and every test file)',
    root: 'tests/',
    blurb:
      'The integration and e2e suites in tests/, plus every co-located *.test.ts and *.spec.ts file in the repo, each listed with what it covers. Symbols used by tests show them as "tests:" on the other pages.',
    owns: /^tests\//,
  },
];

const isTestFile = (f: string) => /\.(test|spec)\.tsx?$/.test(f);
const inScope = (f: string) => /^(src|server|tools|tests)\//.test(f) && !f.endsWith('.d.ts');
const areaOf = (f: string) => (isTestFile(f) ? 'tests' : (AREAS.find(a => a.owns.test(f))?.key ?? 'tests'));
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const sorted = (xs: Iterable<string>) => [...xs].sort(cmp);

// ---------------------------------------------------------------------------------------------------
// Model

type Kind =
  | 'function'
  | 'component'
  | 'class'
  | 'constructor'
  | 'method'
  | 'getter'
  | 'property'
  | 'const'
  | 'let'
  | 'type'
  | 'interface'
  | 'enum'
  | 'member'
  | 'module';

interface CodeNode {
  /** `${file}#${name}`. */
  key: string;
  file: string;
  /** `playerAction`, `GameApp.enterPlace`, or `(top level)` for module-scope statements. */
  name: string;
  kind: Kind;
  exported: boolean;
  access: string;
  signature: string;
  doc: string;
  /** Key of the class or interface that owns a member. */
  parent: string | null;
  children: string[];
  /** Capability interface (its method-like members are nodes). */
  capability: boolean;
  pos: number;
  walk: ts.Node[];
  uses: Set<string>;
  typeUses: Set<string>;
  usedBy: Set<string>;
  testUsers: Set<string>;
  /** Node keys, or `test:${file}#${name}` for implementations inside test files. */
  implementedBy: Set<string>;
}

interface FileEntry {
  file: string;
  area: string;
  test: boolean;
  purpose: string;
  imports: Set<string>;
  packages: Set<string>;
  styles: Set<string>;
  reexports: string[];
  importedBy: Set<string>;
  testedBy: Set<string>;
  nodes: string[];
  suites: string[];
}

interface Model {
  files: Map<string, FileEntry>;
  nodes: Map<string, CodeNode>;
}

const isTypeKind = (n: CodeNode) => n.kind === 'type' || n.kind === 'interface';

function collapse(s: string): string {
  return s
    .replace(/import\("[^"]*"\)\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

/** First sentence of a comment, for one-line summaries. */
function firstSentence(text: string, max = 220): string {
  const para = text.split(/\n\s*\n/)[0] ?? '';
  const flat = collapse(para);
  const m = /^(.+?[.!?])(\s|$)/.exec(flat);
  return truncate(m?.[1] ?? flat, max);
}

/** The file's header comment: the leading block comment, unless it is glued to the first declaration. */
function filePurpose(sf: ts.SourceFile): string {
  const text = sf.getFullText();
  const first = sf.statements[0];
  for (const r of ts.getLeadingCommentRanges(text, 0) ?? []) {
    const raw = text.slice(r.pos, r.end);
    if (!raw.startsWith('/*')) continue;
    const between = text.slice(r.end, first ? first.getStart(sf) : text.length);
    if (first && !ts.isImportDeclaration(first) && !/\n\s*\n/.test(between)) return '';
    const body = raw
      .replace(/^\/\*\*?/, '')
      .replace(/\*\/$/, '')
      .split('\n')
      .map(l => l.replace(/^\s*\* ?/, ''))
      .join('\n');
    return truncate(collapse(body.split(/\n\s*\n/)[0] ?? ''), 600);
  }
  return '';
}

const DECL_NAME_KINDS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.Parameter,
  ts.SyntaxKind.BindingElement,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.ClassExpression,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.PropertyDeclaration,
  ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.PropertySignature,
  ts.SyntaxKind.MethodSignature,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.TypeAliasDeclaration,
  ts.SyntaxKind.EnumDeclaration,
  ts.SyntaxKind.EnumMember,
  ts.SyntaxKind.TypeParameter,
  ts.SyntaxKind.JsxAttribute,
  ts.SyntaxKind.ImportSpecifier,
  ts.SyntaxKind.ImportClause,
  ts.SyntaxKind.NamespaceImport,
  ts.SyntaxKind.ExportSpecifier,
  ts.SyntaxKind.ModuleDeclaration,
  ts.SyntaxKind.NamedTupleMember,
]);

/** True when `id` names the thing being declared rather than referring to something. */
function isDeclarationName(id: ts.Identifier): boolean {
  const p = id.parent as ts.Node & { name?: ts.Node; label?: ts.Node; propertyName?: ts.Node };
  if (p.label === id) return true;
  if (ts.isBindingElement(p) && p.propertyName === id) return true;
  return DECL_NAME_KINDS.has(p.kind) && p.name === id;
}

function hasFunctionType(t: ts.TypeNode): boolean {
  if (ts.isFunctionTypeNode(t)) return true;
  if (ts.isParenthesizedTypeNode(t)) return hasFunctionType(t.type);
  if (ts.isUnionTypeNode(t)) return t.types.some(hasFunctionType);
  return false;
}

function isMethodLike(m: ts.TypeElement): m is ts.MethodSignature | ts.PropertySignature {
  return ts.isMethodSignature(m) || (ts.isPropertySignature(m) && !!m.type && hasFunctionType(m.type));
}

function memberName(name: ts.PropertyName | ts.PrivateIdentifier | undefined): string | null {
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return null;
}

function unwrap(e: ts.Expression | undefined): ts.Expression | undefined {
  let x = e;
  while (x && (ts.isParenthesizedExpression(x) || ts.isSatisfiesExpression(x) || ts.isAsExpression(x)))
    x = x.expression;
  return x;
}

/** Packages are reported by name: `react`, `@fastify/static`, `node:fs`. */
function packageName(spec: string): string {
  if (spec.startsWith('node:')) return spec;
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : (parts[0] ?? spec);
}

export function buildModel(): Model {
  const config = ts.readConfigFile(path.join(ROOT, 'tsconfig.json'), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ROOT);
  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
  const checker = program.getTypeChecker();
  const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/');

  const sources = program
    .getSourceFiles()
    .filter(sf => inScope(rel(sf.fileName)))
    .sort((a, b) => cmp(rel(a.fileName), rel(b.fileName)));

  const files = new Map<string, FileEntry>();
  const nodes = new Map<string, CodeNode>();
  const declMap = new Map<ts.Node, CodeNode>();
  /** Names that can resolve to a node through `x.name`: members and top-level names. */
  const memberNames = new Set<string>();
  /** Names of capability-interface members: only these can make an object literal an implementation. */
  const capNames = new Set<string>();
  const classes: { cls: ts.ClassDeclaration; file: string; test: boolean }[] = [];

  const docOf = (sym: ts.Symbol | undefined) =>
    sym ? firstSentence(ts.displayPartsToString(sym.getDocumentationComment(checker))) : '';

  function signatureOf(decl: ts.Node): string {
    const fn = ts.isVariableDeclaration(decl) ? unwrap(decl.initializer) : decl;
    if (
      fn &&
      (ts.isFunctionDeclaration(fn) ||
        ts.isArrowFunction(fn) ||
        ts.isFunctionExpression(fn) ||
        ts.isMethodDeclaration(fn) ||
        ts.isMethodSignature(fn) ||
        ts.isConstructorDeclaration(fn) ||
        ts.isGetAccessorDeclaration(fn))
    ) {
      const tps = fn.typeParameters?.length ? `<${fn.typeParameters.map(t => t.getText()).join(', ')}>` : '';
      const params = ts.isGetAccessorDeclaration(fn)
        ? ''
        : `(${fn.parameters.map(p => p.getText()).join(', ')})`;
      let ret = '';
      if (fn.type) ret = `: ${fn.type.getText()}`;
      else if (!ts.isConstructorDeclaration(fn)) {
        const sig = checker.getSignatureFromDeclaration(fn);
        if (sig) {
          const t = checker.typeToString(
            checker.getReturnTypeOfSignature(sig),
            fn,
            ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
          );
          ret = `: ${t}`;
        }
      }
      return truncate(collapse(`${tps}${params}${ret}`), 170);
    }
    if (ts.isPropertySignature(decl) && decl.type) return truncate(collapse(decl.type.getText()), 170);
    if (ts.isPropertyDeclaration(decl) || ts.isVariableDeclaration(decl)) {
      if (decl.type) return truncate(collapse(`: ${decl.type.getText()}`), 170);
      const init = decl.initializer;
      if (init && ts.isSatisfiesExpression(init))
        return truncate(collapse(`satisfies ${init.type.getText()}`), 170);
      const inner = unwrap(init);
      if (inner && ts.isNewExpression(inner))
        return truncate(collapse(`= new ${inner.expression.getText()}(…)`), 170);
      if (inner && ts.isArrayLiteralExpression(inner))
        return `= [ … ]${init && ts.isAsExpression(init) ? ' as const' : ''} (${inner.elements.length} entries)`;
      if (inner && ts.isObjectLiteralExpression(inner)) return `= { … } (${inner.properties.length} keys)`;
      return '';
    }
    if (ts.isClassDeclaration(decl) || ts.isInterfaceDeclaration(decl))
      return collapse((decl.heritageClauses ?? []).map(h => h.getText()).join(' '));
    if (ts.isTypeAliasDeclaration(decl)) {
      const t = collapse(decl.type.getText());
      if (t.length <= 110) return `= ${t}`;
      if (ts.isUnionTypeNode(decl.type)) return `= union of ${decl.type.types.length}`;
      return '';
    }
    return '';
  }

  function addNode(
    file: string,
    name: string,
    kind: Kind,
    decl: ts.Node,
    opts: { exported: boolean; access?: string; parent?: CodeNode; walk?: ts.Node[]; doc?: string },
  ): CodeNode {
    const key = `${file}#${name}`;
    const existing = nodes.get(key);
    if (existing) {
      // Getter/setter pairs and overloads share one node.
      declMap.set(decl, existing);
      existing.walk.push(...(opts.walk ?? [decl]));
      return existing;
    }
    const nameNode = (decl as { name?: ts.Node }).name;
    const sym = nameNode ? checker.getSymbolAtLocation(nameNode) : undefined;
    const node: CodeNode = {
      key,
      file,
      name,
      kind,
      exported: opts.exported,
      access: opts.access ?? '',
      signature: kind === 'module' ? '' : signatureOf(decl),
      doc: opts.doc ?? docOf(sym),
      parent: opts.parent?.key ?? null,
      children: [],
      capability: false,
      pos: decl.getStart(),
      walk: opts.walk ?? [decl],
      uses: new Set(),
      typeUses: new Set(),
      usedBy: new Set(),
      testUsers: new Set(),
      implementedBy: new Set(),
    };
    nodes.set(key, node);
    if (kind !== 'module') declMap.set(decl, node);
    opts.parent?.children.push(key);
    const short = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : name;
    memberNames.add(short);
    return node;
  }

  // Pass 1: files and nodes.
  for (const sf of sources) {
    const file = rel(sf.fileName);
    const test = isTestFile(file);
    const entry: FileEntry = {
      file,
      area: areaOf(file),
      test,
      purpose: filePurpose(sf),
      imports: new Set(),
      packages: new Set(),
      styles: new Set(),
      reexports: [],
      importedBy: new Set(),
      testedBy: new Set(),
      nodes: [],
      suites: [],
    };
    files.set(file, entry);
    if (test) {
      for (const st of sf.statements)
        if (ts.isClassDeclaration(st) && st.name) classes.push({ cls: st, file, test });
      entry.suites = suiteTitles(sf);
      continue;
    }

    const localExports = new Set<string>();
    for (const st of sf.statements)
      if (
        ts.isExportDeclaration(st) &&
        !st.moduleSpecifier &&
        st.exportClause &&
        ts.isNamedExports(st.exportClause)
      )
        for (const el of st.exportClause.elements) localExports.add((el.propertyName ?? el.name).text);
    const exported = (d: ts.Declaration, name: string) =>
      (ts.getCombinedModifierFlags(d) & ts.ModifierFlags.Export) !== 0 || localExports.has(name);
    const tsx = file.endsWith('.tsx');
    const fnKind = (name: string): Kind => (tsx && /^[A-Z]/.test(name) ? 'component' : 'function');
    const moduleWalk: ts.Node[] = [];

    for (const st of sf.statements) {
      if (ts.isFunctionDeclaration(st) && st.name) {
        const n = addNode(file, st.name.text, fnKind(st.name.text), st, {
          exported: exported(st, st.name.text),
        });
        if (!entry.nodes.includes(n.key)) entry.nodes.push(n.key);
      } else if (ts.isClassDeclaration(st) && st.name) {
        const cls = addNode(file, st.name.text, 'class', st, {
          exported: exported(st, st.name.text),
          walk: [...(st.heritageClauses ?? [])],
        });
        entry.nodes.push(cls.key);
        classes.push({ cls: st, file, test });
        for (const m of st.members) {
          const flags = ts.getCombinedModifierFlags(m);
          const access = [
            m.name && ts.isPrivateIdentifier(m.name) ? 'private' : '',
            flags & ts.ModifierFlags.Private ? 'private' : '',
            flags & ts.ModifierFlags.Protected ? 'protected' : '',
            flags & ts.ModifierFlags.Static ? 'static' : '',
          ]
            .filter(Boolean)
            .join(' ');
          if (ts.isConstructorDeclaration(m)) {
            const sig = checker.getSignatureFromDeclaration(m);
            addNode(file, `${st.name.text}.constructor`, 'constructor', m, {
              exported: cls.exported,
              parent: cls,
              doc: sig ? firstSentence(ts.displayPartsToString(sig.getDocumentationComment(checker))) : '',
            });
            continue;
          }
          const nm = memberName(m.name);
          if (!nm) continue;
          const kind: Kind | null = ts.isMethodDeclaration(m)
            ? 'method'
            : ts.isGetAccessorDeclaration(m) || ts.isSetAccessorDeclaration(m)
              ? 'getter'
              : ts.isPropertyDeclaration(m)
                ? 'property'
                : null;
          if (!kind) continue;
          addNode(file, `${st.name.text}.${nm}`, kind, m, { exported: cls.exported, access, parent: cls });
        }
      } else if (ts.isVariableStatement(st)) {
        const isConst = (st.declarationList.flags & ts.NodeFlags.Const) !== 0;
        for (const d of st.declarationList.declarations) {
          if (!ts.isIdentifier(d.name)) {
            moduleWalk.push(d);
            continue;
          }
          const init = unwrap(d.initializer);
          const isFn = !!init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init));
          const kind: Kind = isFn ? fnKind(d.name.text) : isConst ? 'const' : 'let';
          entry.nodes.push(addNode(file, d.name.text, kind, d, { exported: exported(d, d.name.text) }).key);
        }
      } else if (ts.isInterfaceDeclaration(st)) {
        const iface = addNode(file, st.name.text, 'interface', st, { exported: exported(st, st.name.text) });
        if (!entry.nodes.includes(iface.key)) entry.nodes.push(iface.key);
        if (!tsx && st.members.some(isMethodLike)) {
          iface.capability = true;
          for (const m of st.members) {
            if (!isMethodLike(m)) continue;
            const nm = memberName(m.name);
            if (!nm) continue;
            addNode(file, `${st.name.text}.${nm}`, 'member', m, {
              exported: iface.exported,
              parent: iface,
              walk: [],
            });
            capNames.add(nm);
          }
        }
      } else if (ts.isTypeAliasDeclaration(st)) {
        entry.nodes.push(
          addNode(file, st.name.text, 'type', st, { exported: exported(st, st.name.text) }).key,
        );
      } else if (ts.isEnumDeclaration(st)) {
        entry.nodes.push(
          addNode(file, st.name.text, 'enum', st, { exported: exported(st, st.name.text) }).key,
        );
      } else if (ts.isExportDeclaration(st)) {
        if (st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) {
          const what =
            st.exportClause && ts.isNamedExports(st.exportClause)
              ? `{ ${st.exportClause.elements.map(e => e.getText()).join(', ')} }`
              : st.exportClause
                ? st.exportClause.getText()
                : '*';
          entry.reexports.push(`${st.isTypeOnly ? 'type ' : ''}${what} from '${st.moduleSpecifier.text}'`);
        }
      } else if (
        !ts.isImportDeclaration(st) &&
        !ts.isImportEqualsDeclaration(st) &&
        !ts.isModuleDeclaration(st)
      ) {
        moduleWalk.push(st);
      }
    }
    if (moduleWalk.length) {
      const first = moduleWalk[0]!;
      entry.nodes.push(
        addNode(file, '(top level)', 'module', first, {
          exported: false,
          walk: moduleWalk,
          doc: 'Statements that run when the module loads.',
        }).key,
      );
    }
  }

  // Pass 2: imports, resolved to files.
  for (const sf of sources) {
    const entry = files.get(rel(sf.fileName))!;
    for (const st of sf.statements) {
      const spec =
        (ts.isImportDeclaration(st) || ts.isExportDeclaration(st)) &&
        st.moduleSpecifier &&
        ts.isStringLiteral(st.moduleSpecifier)
          ? st.moduleSpecifier.text
          : null;
      if (!spec) continue;
      if (/\.css$/.test(spec)) {
        entry.styles.add(spec.slice(spec.lastIndexOf('/') + 1));
        continue;
      }
      const resolved = ts.resolveModuleName(spec, sf.fileName, parsed.options, ts.sys).resolvedModule;
      const target = resolved && !resolved.isExternalLibraryImport ? rel(resolved.resolvedFileName) : null;
      if (target && files.has(target)) {
        entry.imports.add(target);
        const t = files.get(target)!;
        (entry.test ? t.testedBy : t.importedBy).add(entry.file);
      } else if (
        !spec.startsWith('.') &&
        !spec.startsWith('@core/') &&
        !/^@(content|narrative|engine|app|ui)\//.test(spec)
      ) {
        entry.packages.add(packageName(spec));
      }
    }
  }

  // Pass 3: edges.
  type Owner = CodeNode | string;
  const record = (owner: Owner, target: CodeNode, inType: boolean) => {
    if (typeof owner === 'string') {
      target.testUsers.add(owner);
      return;
    }
    if (target === owner) return;
    if (inType || isTypeKind(target)) owner.typeUses.add(target.key);
    else owner.uses.add(target.key);
    target.usedBy.add(owner.key);
  };

  const link = (sym: ts.Symbol | undefined, owner: Owner, inType: boolean) => {
    if (!sym) return;
    const real = sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
    const targets = (real.declarations ?? []).map(d => declMap.get(d)).filter((n): n is CodeNode => !!n);
    const target = targets.find(t => isTypeKind(t) === inType) ?? targets[0];
    if (target) record(owner, target, inType);
  };

  const implRef = (owner: Owner) => (typeof owner === 'string' ? `test:${owner}` : owner.key);

  const isValueHeritage = (n: ts.Node) =>
    ts.isExpressionWithTypeArguments(n) &&
    ts.isHeritageClause(n.parent) &&
    n.parent.token === ts.SyntaxKind.ExtendsKeyword &&
    ts.isClassLike(n.parent.parent);

  const visit = (n: ts.Node, owner: Owner, inType: boolean): void => {
    const typed = inType || (ts.isTypeNode(n) && !isValueHeritage(n));
    if (ts.isIdentifier(n)) {
      const p = n.parent;
      if (ts.isShorthandPropertyAssignment(p) && p.name === n) {
        link(checker.getShorthandAssignmentValueSymbol(p), owner, typed);
        return;
      }
      if (isDeclarationName(n)) return;
      if (
        ((ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isQualifiedName(p) && p.right === n)) &&
        !memberNames.has(n.text)
      )
        return;
      link(checker.getSymbolAtLocation(n), owner, typed);
      return;
    }
    if (ts.isObjectLiteralExpression(n)) {
      // Only function-valued properties implement a member: `mult: 1.5` doesn't implement
      // `DamageEffect.mult`, but `mult: c => …` does.
      const isFunctionValued = (p: ts.ObjectLiteralElementLike) =>
        ts.isMethodDeclaration(p) ||
        ts.isGetAccessorDeclaration(p) ||
        ((ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) &&
          checker.getTypeAtLocation(ts.isPropertyAssignment(p) ? p.initializer : p.name).getCallSignatures()
            .length > 0);
      const names = n.properties
        .filter(p => capNames.has(memberName(p.name) ?? '') && isFunctionValued(p))
        .map(p => memberName(p.name)!);
      if (names.length) {
        const ct = checker.getContextualType(n);
        const parts = ct ? (ct.isUnionOrIntersection() ? ct.types : [ct]) : [];
        for (const nm of names)
          for (const t of parts)
            for (const d of t.getProperty(nm)?.declarations ?? []) {
              const m = declMap.get(d);
              if (m?.kind === 'member') m.implementedBy.add(implRef(owner));
            }
      }
    }
    ts.forEachChild(n, c => visit(c, owner, typed));
  };

  for (const node of nodes.values()) for (const w of node.walk) visit(w, node, false);
  for (const sf of sources) {
    const file = rel(sf.fileName);
    if (!isTestFile(file)) continue;
    for (const st of sf.statements) if (!ts.isImportDeclaration(st)) visit(st, file, false);
  }

  // Classes that implement or extend a capability interface.
  for (const { cls, file, test } of classes) {
    for (const h of cls.heritageClauses ?? [])
      for (const ht of h.types) {
        const t = checker.getTypeAtLocation(ht);
        for (const m of cls.members) {
          const nm = memberName(m.name);
          if (!nm || !capNames.has(nm)) continue;
          for (const d of t.getProperty(nm)?.declarations ?? []) {
            const target = declMap.get(d);
            if (target?.kind !== 'member') continue;
            target.implementedBy.add(
              test ? `test:${file}#${cls.name!.text}` : `${file}#${cls.name!.text}.${nm}`,
            );
          }
        }
      }
  }

  // File-level "tested by" also counts tests that reach a file's symbols through a barrel.
  for (const node of nodes.values()) for (const t of node.testUsers) files.get(node.file)!.testedBy.add(t);

  return { files, nodes };
}

/** `describe('…')` titles in a test file (string literals only), for the tests page. */
function suiteTitles(sf: ts.SourceFile): string[] {
  const out: string[] = [];
  const visit = (n: ts.Node, depth: number) => {
    if (depth > 3) return;
    if (ts.isCallExpression(n)) {
      const callee = n.expression.getText(sf);
      const arg = n.arguments[0];
      if (/^(describe|test\.describe)(\.\w+)?$/.test(callee) && arg && ts.isStringLiteralLike(arg))
        out.push(arg.text);
    }
    ts.forEachChild(n, c => visit(c, depth + (ts.isCallExpression(n) ? 1 : 0)));
  };
  for (const st of sf.statements) visit(st, 0);
  return out;
}

// ---------------------------------------------------------------------------------------------------
// Rendering

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const fileAnchor = (file: string) => slug(file);
const nodeAnchor = (n: CodeNode) => `${slug(n.file)}--${slug(n.name)}`;
const pageOf = (file: string) => `${areaOf(file)}.md`;
const shortFile = (file: string) => file.replace(/^src\//, '').replace(/\.(tsx?|cjs|mjs|js)$/, '');
const esc = (s: string) => s.replace(/</g, '&lt;').replace(/\|/g, '\\|');
const code = (s: string) => `\`${s.replace(/`/g, "'")}\``;

function href(fromPage: string, file: string, anchor: string): string {
  const page = pageOf(file);
  return page === fromPage ? `#${anchor}` : `${page}#${anchor}`;
}

/** Display name of a node inside its file: `enterPlace` for `GameApp.enterPlace`. */
const localName = (n: CodeNode) => (n.parent ? n.name.slice(n.name.lastIndexOf('.') + 1) : n.name);

function refList(model: Model, refs: Iterable<string>, fromFile: string, cap = REF_CAP): string {
  const fromPage = pageOf(fromFile);
  const byFile = new Map<string, Map<string, string>>();
  for (const r of refs) {
    let file: string;
    let label: string;
    let target: string;
    if (r.startsWith('test:')) {
      const [f, name] = r.slice(5).split('#') as [string, string | undefined];
      file = f;
      label = name ?? '';
      target = href(fromPage, f, fileAnchor(f));
    } else {
      const n = model.nodes.get(r);
      if (!n) continue;
      file = n.file;
      label = n.name;
      target = href(fromPage, n.file, nodeAnchor(n));
    }
    if (!byFile.has(file)) byFile.set(file, new Map());
    byFile.get(file)!.set(label, label ? `[${label}](${target})` : '');
  }
  const order = sorted(byFile.keys()).sort((a, b) => (a === fromFile ? -1 : b === fromFile ? 1 : cmp(a, b)));
  let shown = 0;
  let total = 0;
  const parts: string[] = [];
  for (const f of order) {
    const labels = byFile.get(f)!;
    const names = sorted(labels.keys())
      .map(k => labels.get(k)!)
      .filter(Boolean);
    total += Math.max(names.length, 1);
    if (shown >= cap) continue;
    const take = names.slice(0, Math.max(cap - shown, 0));
    shown += Math.max(take.length, 1);
    const head = f === fromFile ? 'here' : `**[${shortFile(f)}](${href(fromPage, f, fileAnchor(f))})**`;
    parts.push(take.length ? `${head} ${take.join(', ')}` : head);
  }
  const more = total - shown;
  return parts.join(' · ') + (more > 0 ? ` · … +${more} more` : '');
}

function testList(tests: Iterable<string>, fromFile: string): string {
  const fromPage = pageOf(fromFile);
  return sorted(tests)
    .map(t => `[${shortFile(t).replace(/^.*\//, '')}](${href(fromPage, t, fileAnchor(t))})`)
    .join(', ');
}

function fileLinks(fromFile: string, targets: Iterable<string>): string {
  const fromPage = pageOf(fromFile);
  const groups = new Map<string, string[]>();
  for (const t of sorted(targets)) {
    const area = areaOf(t);
    if (!groups.has(area)) groups.set(area, []);
    const a = AREAS.find(x => x.key === area)!;
    const label = t.startsWith(a.root) ? t.slice(a.root.length) : t;
    groups.get(area)!.push(`[${label.replace(/\.(tsx?)$/, '')}](${href(fromPage, t, fileAnchor(t))})`);
  }
  return AREAS.filter(a => groups.has(a.key))
    .map(a => `${a.key}: ${groups.get(a.key)!.join(', ')}`)
    .join(' · ');
}

function isUnreferenced(n: CodeNode): boolean {
  if (n.kind === 'module' || n.kind === 'constructor' || n.access.includes('private')) return false;
  if (!n.exported) return false;
  if (n.kind === 'member') return n.usedBy.size === 0 && n.implementedBy.size === 0 && n.testUsers.size === 0;
  return n.usedBy.size === 0 && n.testUsers.size === 0;
}

function renderNode(model: Model, n: CodeNode, depth: number): string[] {
  const pad = '  '.repeat(depth);
  const tags = [n.kind === 'member' ? 'interface member' : n.kind];
  if (n.capability) tags.push('capability');
  if (n.access) tags.push(n.access);
  if (!n.exported && !n.parent && n.kind !== 'module') tags.push('internal');
  const sig = n.signature ? ` ${code(n.signature)}` : '';
  const doc = n.doc ? ` — ${esc(n.doc).replace(/\\\|/g, '|')}` : '';
  const out = [`${pad}- <a id="${nodeAnchor(n)}"></a>**${localName(n)}** · *${tags.join(', ')}*${sig}${doc}`];
  const sub = `${pad}  - `;
  const parent = n.parent ? model.nodes.get(n.parent) : undefined;
  const sameClassProp = (k: string) => {
    const t = model.nodes.get(k);
    return !!t && !!n.parent && t.parent === n.parent && (t.kind === 'property' || t.kind === 'getter');
  };
  const uses = [...n.uses].filter(k => !sameClassProp(k));
  if (uses.length) out.push(`${sub}uses: ${refList(model, uses, n.file)}`);
  if (n.implementedBy.size) out.push(`${sub}implemented by: ${refList(model, n.implementedBy, n.file)}`);
  const users = [...n.usedBy].filter(k => {
    if (n.kind !== 'property' && n.kind !== 'getter') return true;
    const u = model.nodes.get(k);
    return !(u && u.parent && u.parent === n.parent);
  });
  const usersLabel = n.kind === 'member' ? 'called from' : 'used by';
  const tests = n.testUsers.size ? `tests: ${testList(n.testUsers, n.file)}` : '';
  if (users.length || tests)
    out.push(
      `${sub}${usersLabel}: ${[users.length ? refList(model, users, n.file) : '', tests].filter(Boolean).join(' · ')}`,
    );
  else if (isUnreferenced(n) && !(parent && parent.kind === 'class' && n.kind === 'property'))
    out.push(`${sub}*no references found*`);
  for (const c of n.children) out.push(...renderNode(model, model.nodes.get(c)!, depth + 1));
  return out;
}

function renderFile(model: Model, f: FileEntry): string[] {
  const out = [`<a id="${fileAnchor(f.file)}"></a>`, '', `### ${f.file}`, ''];
  if (f.purpose) out.push(esc(f.purpose).replace(/\\\|/g, '|'), '');
  const facts: string[] = [`Source: [${f.file}](${SRC_LINK}${f.file})`];
  if (f.imports.size) facts.push(`Imports: ${fileLinks(f.file, f.imports)}`);
  if (f.packages.size) facts.push(`Packages: ${sorted(f.packages).map(code).join(', ')}`);
  if (f.styles.size) facts.push(`Styles: ${sorted(f.styles).map(code).join(', ')}`);
  if (f.reexports.length) facts.push(`Re-exports: ${f.reexports.map(code).join(', ')}`);
  if (f.suites.length) facts.push(`Suites: ${f.suites.map(s => `“${esc(s)}”`).join(', ')}`);
  if (f.importedBy.size) facts.push(`Imported by: ${fileLinks(f.file, f.importedBy)}`);
  if (f.testedBy.size) facts.push(`Tested by: ${testList(f.testedBy, f.file)}`);
  const typeUses = new Set<string>();
  for (const k of f.nodes) {
    const n = model.nodes.get(k)!;
    const all = [n, ...n.children.map(c => model.nodes.get(c)!)];
    for (const x of all) for (const t of x.typeUses) if (model.nodes.get(t)?.file !== f.file) typeUses.add(t);
  }
  if (typeUses.size) facts.push(`Types used: ${refList(model, typeUses, f.file, 24)}`);
  out.push(...facts.map(x => `- ${x}`), '');
  const nodes = f.nodes.map(k => model.nodes.get(k)!).sort((a, b) => a.pos - b.pos);
  if (nodes.length) {
    out.push('Declarations:', '');
    for (const n of nodes) out.push(...renderNode(model, n, 0));
    out.push('');
  }
  return out;
}

function mermaidId(s: string): string {
  return `n_${s.replace(/[^A-Za-z0-9]/g, '_')}`;
}

/** File-level (or folder-level, for big areas) import graph of one area. Core edges are omitted outside core. */
function areaGraph(model: Model, area: Area): string[] {
  const files = sorted(
    [...model.files.values()].filter(f => f.area === area.key && !f.test).map(f => f.file),
  );
  if (files.length < 2) return [];
  const grouped = files.length > GRAPH_FILE_LIMIT;
  const label = (f: string) => {
    const local = f.startsWith(area.root) ? f.slice(area.root.length) : f.replace(/^src\//, '');
    if (!grouped) return local.replace(/\.(tsx?)$/, '');
    const slash = local.indexOf('/');
    return slash < 0 ? local.replace(/\.(tsx?)$/, '') : `${local.slice(0, slash)}/`;
  };
  const counts = new Map<string, number>();
  for (const f of files) counts.set(label(f), (counts.get(label(f)) ?? 0) + 1);
  const edges = new Set<string>();
  const external = new Set<string>();
  for (const f of files) {
    for (const imp of model.files.get(f)!.imports) {
      const ia = areaOf(imp);
      if (ia === area.key) {
        const a = label(f);
        const b = label(imp);
        if (a !== b) edges.add(`${mermaidId(a)} --> ${mermaidId(b)}`);
      } else if (ia !== 'core' || area.key === 'core') {
        external.add(ia);
        edges.add(`${mermaidId(label(f))} --> ${mermaidId(`ext_${ia}`)}`);
      }
    }
  }
  const lines = ['```mermaid', 'flowchart LR'];
  for (const g of sorted(counts.keys())) {
    const n = counts.get(g)!;
    lines.push(`  ${mermaidId(g)}["${g}${grouped && g.endsWith('/') ? ` (${n})` : ''}"]`);
  }
  for (const e of sorted(external)) lines.push(`  ${mermaidId(`ext_${e}`)}[["${e}"]]`);
  for (const e of sorted(edges)) lines.push(`  ${e}`);
  lines.push('```');
  const notes = [
    grouped ? 'Folders are collapsed into one box (file count in brackets).' : '',
    area.key === 'core' ? '' : 'Imports of src/core are left out: nearly every file has them.',
    external.size ? 'Double-bordered boxes are other areas.' : '',
  ].filter(Boolean);
  return [...lines, '', notes.length ? `*${notes.join(' ')}*` : '', ''];
}

function header(title: string): string[] {
  return [
    '<!-- Generated by tools/codemap.ts. Do not edit by hand: run `npm run docs:codemap`. -->',
    '',
    `# ${title}`,
    '',
  ];
}

function renderArea(model: Model, area: Area): string {
  const files = sorted([...model.files.values()].filter(f => f.area === area.key).map(f => f.file)).map(f =>
    model.files.get(f)!,
  );
  const out = header(`Code map: ${area.title}`);
  out.push(
    area.blurb,
    '',
    `Generated reference. Start with the [guide](${GUIDE_LINK}) for the flows, and the [index](README.md) for how to read these entries.`,
    '',
  );
  if (area.key !== 'tests') out.push('## Imports inside this area', '', ...areaGraph(model, area));
  out.push('## Files', '', '| File | Purpose |', '|---|---|');
  for (const f of files)
    out.push(
      `| [${f.file}](#${fileAnchor(f.file)}) | ${f.purpose ? esc(firstSentence(f.purpose, 160)) : '—'} |`,
    );
  out.push('', '## Details', '');
  for (const f of files) out.push(...renderFile(model, f));
  return `${out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()}\n`;
}

interface Rule {
  name: string;
  comment?: string;
  from: { path?: string; pathNot?: string };
  to: { path?: string; pathNot?: string; circular?: boolean };
}

function renderIndex(model: Model): string {
  const out = header('Code map: generated reference');
  const nodes = [...model.nodes.values()];
  const src = [...model.files.values()].filter(f => !f.test);
  const edgeCount = nodes.reduce((s, n) => s + n.uses.size, 0);
  out.push(
    `Every source file in \`src/\`, \`server/\`, \`tools/\` and \`tests/\`, with its declarations and who uses what, generated from the TypeScript program by [tools/codemap.ts](${SRC_LINK}tools/codemap.ts). **Don't edit these pages:** run \`npm run docs:codemap\` after changing code. A test (\`tools/codemap.test.ts\`) fails when they are out of date.`,
    '',
    `For how the pieces work together (boot, a story line, a battle, a save reaching Postgres), read the hand-written [guide](${GUIDE_LINK}) first.`,
    '',
    `**${src.length}** source files · **${model.files.size - src.length}** test files · **${nodes.filter(n => !n.parent && n.kind !== 'module').length}** top-level declarations · **${nodes.filter(n => n.parent).length}** members · **${edgeCount}** "uses" edges`,
    '',
    '## Pages',
    '',
    '| Page | Files | What lives there |',
    '|---|---|---|',
  );
  for (const a of AREAS) {
    const n = [...model.files.values()].filter(f => f.area === a.key).length;
    out.push(`| [${a.title}](${a.key}.md) | ${n} | ${esc(firstSentence(a.blurb, 200))} |`);
  }

  out.push('', '## Layers', '');
  out.push(
    'Import counts between areas (file-level imports, test files counted under tests). Arrows point from the importer to what it imports; in `src/` they only point down, which `npm run depcruise` enforces.',
    '',
  );
  const counts = new Map<string, number>();
  for (const f of model.files.values())
    for (const imp of f.imports) {
      const a = f.area;
      const b = areaOf(imp);
      if (a !== b) counts.set(`${a}>${b}`, (counts.get(`${a}>${b}`) ?? 0) + 1);
    }
  out.push('```mermaid', 'flowchart TD');
  for (const a of AREAS) out.push(`  ${a.key}["${a.title}"]`);
  for (const k of sorted(counts.keys())) {
    const [a, b] = k.split('>') as [string, string];
    out.push(`  ${a} -->|${counts.get(k)}| ${b}`);
  }
  out.push('```', '');

  const require = createRequire(import.meta.url);
  const rules = (require('../.dependency-cruiser.cjs') as { forbidden: Rule[] }).forbidden;
  out.push(
    '## Boundary rules',
    '',
    'The forbidden imports in [.dependency-cruiser.cjs](../../../.dependency-cruiser.cjs), checked by `npm run depcruise` (test files are excluded from the check).',
    '',
    '| Rule | From | Must not import | Why |',
    '|---|---|---|---|',
  );
  const pathCell = (p: { path?: string; pathNot?: string; circular?: boolean }) =>
    [
      p.path ? code(p.path).replace(/\|/g, '\\|') : '',
      p.pathNot ? `except ${code(p.pathNot).replace(/\|/g, '\\|')}` : '',
      p.circular ? 'a cycle' : '',
    ]
      .filter(Boolean)
      .join(' ') || 'anything';
  for (const r of rules)
    out.push(
      `| ${code(r.name)} | ${pathCell(r.from)} | ${pathCell(r.to)} | ${r.comment ? esc(r.comment) : ''} |`,
    );

  out.push(
    '',
    '## Capability interfaces (the seams)',
    '',
    'Interfaces with methods are where one part of the code calls into another without importing it. Each member on the detail pages lists what **implements** it (classes, or object literals checked against it) and where it is **called from**.',
    '',
    '| Interface | Members | Implemented in | Called from |',
    '|---|---|---|---|',
  );
  for (const n of nodes.filter(x => x.capability).sort((a, b) => cmp(a.key, b.key))) {
    const members = n.children.map(c => model.nodes.get(c)!);
    const implFiles = new Set<string>();
    const callFiles = new Set<string>();
    for (const m of members) {
      for (const i of m.implementedBy)
        implFiles.add(i.startsWith('test:') ? i.slice(5).split('#')[0]! : model.nodes.get(i)!.file);
      for (const u of m.usedBy) callFiles.add(model.nodes.get(u)!.file);
    }
    const fmt = (s: Set<string>) => {
      const list = sorted(s);
      const shown = list.slice(0, 6).map(f => `[${shortFile(f)}](${pageOf(f)}#${fileAnchor(f)})`);
      return list.length > 6 ? `${shown.join(', ')} … +${list.length - 6}` : shown.join(', ') || '—';
    };
    out.push(
      `| [${n.name}](${pageOf(n.file)}#${nodeAnchor(n)}) (${shortFile(n.file)}) | ${members.length} | ${fmt(implFiles)} | ${fmt(callFiles)} |`,
    );
  }

  out.push(
    '',
    '## How to read an entry',
    '',
    '```',
    '### src/engine/combat/player.ts             one section per file, in path order',
    '<purpose>                                    the file header comment',
    '- Imports / Imported by / Tested by          file-level links, grouped by area',
    '- Types used                                 types from other files that the code mentions',
    'Declarations:',
    '- playerAction · function `(b, intent, timing): void` — first sentence of its doc comment',
    '  - uses: here finishPlayerTurn · engine/combat/resolve resolveSkill',
    '  - used by: app/battleController runBattle · tests: combat.test',
    '```',
    '',
    '- **uses** lists functions, constants, classes and members the declaration refers to (calls, reads, JSX tags). Same-file names come first, after "here".',
    '- **used by** is the reverse. **tests:** lists test files that refer to it (directly or through a barrel).',
    '- **implemented by / called from** appear on capability-interface members: the classes or object literals that implement the member, and the code that calls it through the interface.',
    '- *internal* means not exported. *no references found* means nothing in `src/`, `server/`, `tools/` or `tests/` refers to it (it may be dead code, or used only from outside TypeScript).',
    '- Signatures show parameters as written. Inferred return types come from the checker and are shortened.',
    '- Barrels (`engine/index.ts`, `core/types/index.ts`, `content/data.ts`, `content/index.ts`) are shown as files with their re-exports, but edges always point at the real declaration.',
    '',
  );
  return `${out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()}\n`;
}

/** Every page, keyed by file name inside OUT_DIR. */
export function generateCodeMap(): Map<string, string> {
  const model = buildModel();
  const pages = new Map<string, string>();
  pages.set('README.md', renderIndex(model));
  for (const a of AREAS) pages.set(`${a.key}.md`, renderArea(model, a));
  return pages;
}

/** Pages whose committed copy differs from `pages`, plus stray pages that are no longer generated. */
export function staleCodeMapPages(pages: Map<string, string>): string[] {
  const dir = path.join(ROOT, OUT_DIR);
  const stale: string[] = [];
  for (const [name, text] of pages) {
    const p = path.join(dir, name);
    if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== text) stale.push(name);
  }
  if (fs.existsSync(dir))
    for (const f of fs.readdirSync(dir))
      if (f.endsWith('.md') && !pages.has(f)) stale.push(`${f} (no longer generated)`);
  return stale.sort(cmp);
}

export function writeCodeMap(pages: Map<string, string>): void {
  const dir = path.join(ROOT, OUT_DIR);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.md') && !pages.has(f)) fs.rmSync(path.join(dir, f));
  for (const [name, text] of pages) fs.writeFileSync(path.join(dir, name), text);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const started = Date.now();
  const pages = generateCodeMap();
  if (process.argv.includes('--check')) {
    const stale = staleCodeMapPages(pages);
    if (stale.length) {
      console.error(`${OUT_DIR} is stale (${stale.join(', ')}). Run \`npm run docs:codemap\`.`);
      process.exit(1);
    }
    console.log(`code map: up to date (${Date.now() - started} ms)`);
  } else {
    writeCodeMap(pages);
    console.log(`code map: wrote ${pages.size} pages to ${OUT_DIR}/ (${Date.now() - started} ms)`);
  }
}
