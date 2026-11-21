const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

for (const file of ['find-unused.js', 'Droid-Sweep.js']) {
  test(`${file}: a file another file imports is not reported unused`, async () => {
    // Each file used to search only ITSELF for its own name, so util.js, imported by index.js, was reported unused.
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'find-unused-'));
    try {
      fs.writeFileSync(path.join(ws, 'index.js'), "const util = require('./util');\nimport { x } from './lib';\n");
      fs.writeFileSync(path.join(ws, 'util.js'), 'module.exports = 1;\n');
      fs.mkdirSync(path.join(ws, 'lib'));
      fs.writeFileSync(path.join(ws, 'lib', 'index.js'), 'export const x = 1;\n');
      fs.writeFileSync(path.join(ws, 'orphan.js'), 'module.exports = 2;\n');
      const result = await require(path.join(__dirname, '..', file)).execute({ workspacePath: ws });
      assert.deepEqual(result.unusedFiles.map((f) => f.filePath), ['orphan.js']);
    } finally {
      fs.rmSync(ws, { recursive: true, force: true });
    }
  });
}
