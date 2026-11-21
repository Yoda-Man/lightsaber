// Guards for two classes of bug: shell strings, and packages no one declared.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { isBuiltin } = require('module');

const root = path.join(__dirname, '..');
const skip = new Set(['node_modules', '.git', 'graphify-out', 'openspec', '.claude', '.agents', 'test']);
function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) return skip.has(e.name) ? [] : jsFiles(path.join(dir, e.name));
    return e.name.endsWith('.js') ? [path.join(dir, e.name)] : [];
  });
}
const files = jsFiles(root);

test('the guards scan real files', () => {
  for (const f of ['lightsaber.js', 'main.js', 'backend/routes.js']) assert.ok(files.includes(path.join(root, f)), f);
});

test('no file runs a command through a shell', () => {
  const shell = /\{[^}]*\bexec(Sync)?\b[^}]*\}\s*=\s*require\(['"](node:)?child_process['"]\)|child_process['"]\)\.exec(Sync)?\b|shell:\s*true/;
  assert.deepEqual(files.filter((f) => shell.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(root, f)), []);
});

test('every required package is a Node built-in or declared in package.json', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const declared = new Set(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies }));
  const missing = [];
  for (const f of files) {
    for (const [, spec] of fs.readFileSync(f, 'utf8').matchAll(/require\(['"]([^'".][^'"]*)['"]\)/g)) {
      const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      if (!isBuiltin(spec) && !declared.has(name)) missing.push(`${path.relative(root, f)}: ${spec}`);
    }
  }
  assert.deepEqual(missing, []);
});
