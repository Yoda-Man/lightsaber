// The reference routes in backend/. YodaMan does not load them, but they must load and be safe.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const backend = path.join(__dirname, '..', 'backend');

function mount(gitService = {}) {
  const handlers = {};
  require(path.join(backend, 'routes')).mountRoutes({ post: (route, fn) => { handlers[route] = fn; } }, { gitService });
  return handlers;
}
const call = (handler, body) => new Promise((resolve) => {
  const res = { status: () => res, json: resolve };
  handler({ body }, res);
});

test('the routes load with Node built-ins only and mount eleven routes', () => {
  assert.equal(Object.keys(mount()).length, 11);
});

test('GitAnalyzer uses the injected gitService, the window, anchored globs and diffed commits', async () => {
  const GitAnalyzer = require(path.join(backend, 'gitAnalyzer'));
  const calls = [];
  const git = {
    getHeatmapData: async (...args) => { calls.push(args); return [{ filePath: 'src/clock.js', changeCount: 1 }, { filePath: 'yarn.lock', changeCount: 1 }]; },
    getCommitDiff: async (_ws, hash) => { if (hash === 'bad') throw new Error('shallow'); return { files: [{ filePath: 'a.js' }, { filePath: 'b.js' }] }; }
  };
  const ga = new GitAnalyzer('/repo', { daysToAnalyze: 7 }, git);
  assert.deepEqual((await ga.analyzeChangeFrequency()).map((f) => f.path), ['src/clock.js']);
  assert.deepEqual(calls[0], ['/repo', 7]);
  const [edge] = await ga.analyzeChangeCoupling([{ hash: 'x' }, { hash: 'y' }, { hash: 'bad' }]);
  assert.equal(edge.strength, 100);
});

test('ComplexityCalculator counts branches instead of throwing', async () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'complexity-'));
  try {
    fs.writeFileSync(path.join(ws, 'a.js'), 'if (a && b) { x = c ? 1 : 2; } else if (d) {}\n');
    const ComplexityCalculator = require(path.join(backend, 'complexityCalculator'));
    const result = await new ComplexityCalculator(ws).calculateForFile('a.js');
    assert.equal(result.error, undefined);
    assert.equal(result.cyclomaticComplexity, 6); // 1 + if + if + else if + && + ?
  } finally { fs.rmSync(ws, { recursive: true, force: true }); }
});

test('the find-todos and test-coverage routes never run a shell', async () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
  try {
    const marker = path.join(ws, 'pwned');
    const hostile = path.join(ws, `x"; touch "${marker}`);
    const handlers = mount();
    await call(handlers['/api/lightsaber/find-todos'], { workspacePath: hostile });
    await call(handlers['/api/lightsaber/test-coverage'], { workspacePath: hostile });
    assert.equal(fs.existsSync(marker), false);
  } finally { fs.rmSync(ws, { recursive: true, force: true }); }
});
