// YodaMan core ships the same plugin as core/plugins/lightsaber.js. The two must not drift.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const here = path.join(__dirname, '..', 'lightsaber.js');
const core = path.join(__dirname, '..', '..', 'core', 'plugins', 'lightsaber.js');

test('lightsaber.js is byte-identical to core/plugins/lightsaber.js', (t) => {
  if (!fs.existsSync(core)) return t.skip(`no core checkout at ${core}`);
  assert.ok(fs.readFileSync(here).equals(fs.readFileSync(core)), `${here} differs from ${core}; port the change to both`);
});
