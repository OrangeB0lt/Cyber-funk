/* Layer rules for CYBER FUNK. Imports only point downward:

     ui  →  app  →  engine  →  content  →  narrative  →  core

   - core      types, ids, rng, pure helpers. Imports no other layer.
   - narrative scene runtime contracts. Imports core only.
   - content   data + rules functions; *.scene.ts files (prose) may also import narrative.
   - engine    game systems. Imports core and content data/rules (via content/data.ts), never
               *.scene.ts or content/index.ts (keeps prose out of the sim's module graph).
   - app       stores, commands, presenters, persistence. Imports everything below, never React/ui.
   - ui        React. May import everything below.

   server/ (the cloud-save API) is not a game layer. It shares only the save format and the API
   contract (app/save/format.ts, app/save/protocol.ts, and the core ids they use), and src/ never
   imports it. See docs/adr/0006-server-and-cloud-saves.md.
   See docs/architecture/overview.md and docs/adr/0002-layering.md. */
module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    {
      name: 'core-is-the-floor',
      comment: 'core/ must not import any other layer.',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { path: '^src/(narrative|content|engine|app|ui)/' },
    },
    {
      name: 'narrative-only-core',
      severity: 'error',
      from: { path: '^src/narrative/' },
      to: { path: '^src/(content|engine|app|ui)/' },
    },
    {
      name: 'content-below-engine',
      severity: 'error',
      from: { path: '^src/content/' },
      to: { path: '^src/(engine|app|ui)/' },
    },
    {
      name: 'content-data-has-no-prose-runtime',
      comment:
        'Only *.scene.ts files (and the content/index.ts scene registry) may import narrative/. Data and rules stay scene-free.',
      severity: 'error',
      from: { path: '^src/content/', pathNot: '(\\.scene\\.ts$)|(^src/content/index\\.ts$)' },
      to: { path: '^src/narrative/' },
    },
    {
      name: 'content-no-barrel-inside',
      comment: 'Files inside content/ import each other directly, never the barrels (avoids cycles).',
      severity: 'error',
      from: { path: '^src/content/', pathNot: '^src/content/(index|data)\\.ts$' },
      to: { path: '^src/content/(index|data)\\.ts$' },
    },
    {
      name: 'sprites-ui-and-tools-only',
      comment:
        'Character art is for the UI and tools. The engine, app, scenes and other content never load it (docs/adr/0007-character-sprites.md).',
      severity: 'error',
      from: { path: '^src/(core|narrative|engine|app)/|^src/content/(?!sprites/)' },
      to: { path: '^src/content/sprites/' },
    },
    {
      name: 'engine-no-scenes',
      severity: 'error',
      from: { path: '^src/engine/' },
      to: { path: '(^src/(narrative|app|ui)/)|(\\.scene\\.ts$)|(^src/content/index\\.ts$)' },
    },
    {
      name: 'app-has-no-react',
      severity: 'error',
      from: { path: '^src/app/' },
      to: { path: '(^src/ui/)|(^node_modules/(react|react-dom)/)' },
    },
    {
      name: 'src-does-not-import-tooling',
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '^(tools|tests|legacy)/' },
    },
    {
      name: 'src-does-not-import-server',
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '^server/' },
    },
    {
      name: 'server-shares-only-the-save-format',
      comment: 'The server may use core and the save format/protocol, nothing else from the game.',
      severity: 'error',
      from: { path: '^server/' },
      to: { path: '^src/', pathNot: '^src/(core/|app/save/(format|protocol)\\.ts$)' },
    },
    {
      name: 'save-format-stays-portable',
      comment: 'format.ts and protocol.ts run in the browser and on the server: core and Zod only.',
      severity: 'error',
      from: { path: '^src/app/save/(format|protocol)\\.ts$' },
      to: { path: '(^src/(?!core/|app/save/(format|protocol)\\.ts$))|(^node_modules/(?!zod/))' },
    },
    {
      name: 'tools-headless',
      comment: 'Tools (sim, validators) run in Node and never load the React UI.',
      severity: 'error',
      from: { path: '^tools/' },
      to: { path: '^src/ui/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^legacy/)|(\\.test\\.tsx?$)' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
