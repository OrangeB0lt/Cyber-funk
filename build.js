/* Assembles the single-file game. Not part of the game: the game itself has no build step. */
const fs = require('fs'); const path = require('path');
const src = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const js = ['01_data_core.js', '02_data_enemies.js', '03_data_items.js', '04_data_world.js', '05_engine.js', '06_ui_core.js', '07_ui_combat.js', '08_world.js', '09_story.js', '10_main.js'].map(src).join('\n\n');
const css = src('style.css');
const head = `<title>Cyber Funk</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Monoton&family=Share+Tech+Mono&display=swap">
<style>
${css}
</style>`;
const body = `<div id="app">
  <div id="topbar" hidden></div>
  <div id="screen"></div>
  <div id="actions"></div>
  <div id="timing" hidden></div>
  <div id="sheet" hidden></div>
  <div id="popup" hidden></div>
  <div id="toast"></div>
</div>
<script>
${js}
</script>`;
// Artifact version: page content only; the publish skeleton wraps it.
fs.writeFileSync(path.join(__dirname, 'dist', 'artifact.html'), head + '\n' + body + '\n');
// Standalone version: a complete HTML document for the person to keep.
const standalone = `<!doctype html>
<html lang="en" class="standalone">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Cyber Funk</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Monoton&family=Share+Tech+Mono&display=swap">
<style>
${css}
</style>
</head>
<body>
${body}
</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, 'dist', 'cyberfunk.html'), standalone);
console.log('built', (standalone.length / 1024).toFixed(0) + 'KB');
