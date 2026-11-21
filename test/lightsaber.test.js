// lightsaber.js, run as YodaMan runs it: copied into a plugins/ folder beside a backend/
// with stub gitService, GraphFacts and ImpactAnalyzer. Ported from core's LightsaberAnalysis.test.js.
const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DAY = 24 * 60 * 60 * 1000;
let ws, tree;

/** A temporary YodaMan tree holding this repo's lightsaber.js. */
function loadPlugin({ withGit = true } = {}) {
  tree = fs.mkdtempSync(path.join(os.tmpdir(), 'yodaman-'));
  const write = (rel, text) => { fs.mkdirSync(path.dirname(path.join(tree, rel)), { recursive: true }); fs.writeFileSync(path.join(tree, rel), text); };
  write('plugins/lightsaber.js', fs.readFileSync(path.join(__dirname, '..', 'lightsaber.js')));
  write('backend/infrastructure/GraphFacts.js', 'module.exports = { coverageByFile: () => new Map(), load: () => null };');
  write('backend/infrastructure/ImpactAnalyzer.js', 'module.exports = { isTestFile: (f) => /\\.(test|spec)\\./.test(f) };');
  if (withGit) write('backend/services/gitService.js', 'module.exports = {};');
  const cwd = process.cwd();
  process.chdir(ws); // the cwd fallback must not find a gitService either
  try {
    return {
      plugin: require(path.join(tree, 'plugins/lightsaber.js')),
      git: withGit ? require(path.join(tree, 'backend/services/gitService.js')) : null,
      graph: require(path.join(tree, 'backend/infrastructure/GraphFacts.js'))
    };
  } finally { process.chdir(cwd); }
}

beforeEach(() => { ws = fs.mkdtempSync(path.join(os.tmpdir(), 'lightsaber-')); });
afterEach(() => { fs.rmSync(ws, { recursive: true, force: true }); fs.rmSync(tree, { recursive: true, force: true }); });

test('a workspace path is an argument, never shell text', async () => {
  const { plugin } = loadPlugin();
  const marker = path.join(ws, 'pwned');
  const hostile = path.join(ws, `x"; touch "${marker}`);
  await plugin.execute({ action: 'find-todos', workspacePath: hostile });
  await plugin.execute({ action: 'test-coverage', workspacePath: hostile });
  assert.equal(fs.existsSync(marker), false);
});

test('daysToAnalyze sets the heatmap window and the commits sampled for coupling', async () => {
  const { plugin, git } = loadPlugin();
  git.getHeatmapData = mock.fn(async () => []);
  git.getCommitHistory = async () => [
    { hash: 'new', date: new Date(Date.now() - 2 * DAY).toISOString() },
    { hash: 'old', date: new Date(Date.now() - 20 * DAY).toISOString() }
  ];
  git.getCommitDiff = mock.fn(async () => ({ files: [{ filePath: 'a.js' }, { filePath: 'b.js' }] }));
  const result = await plugin.execute({ action: 'coupling', workspacePath: ws, daysToAnalyze: 7 });
  assert.deepEqual(git.getCommitDiff.mock.calls.map((c) => c.arguments[1]), ['new']);
  assert.equal(result.couplingEdges[0].strength, 100);
  await plugin.execute({ action: 'find-hotspots', workspacePath: ws, daysToAnalyze: 7 });
  assert.deepEqual(git.getHeatmapData.mock.calls[0].arguments, [ws, 7]);
});

test('coupling strength reaches 100% when every diffed commit touches both files', async () => {
  const { plugin, git } = loadPlugin();
  const commits = Array.from({ length: 200 }, (_, i) => ({ hash: `c${i}`, date: new Date().toISOString() }));
  git.getCommitHistory = async (_ws, _file, limit) => commits.slice(0, limit);
  git.getCommitDiff = async () => ({ files: [{ filePath: 'a.js' }, { filePath: 'b.js' }] });
  const result = await plugin.execute({ action: 'coupling', workspacePath: ws });
  assert.equal(result.couplingEdges[0].strength, 100);
});

test('a complex, churning file is reported as a hotspot', async () => {
  const { plugin, git } = loadPlugin();
  fs.writeFileSync(path.join(ws, 'hot.js'), Array.from({ length: 150 }, (_, i) => `if (a${i} && b || c ? d : e) { x?.y ?? z; }`).join('\n'));
  git.getHeatmapData = async () => [{ filePath: 'hot.js', changeCount: 50, lastChangeDate: new Date().toISOString(), authorCount: 1 }];
  const result = await plugin.execute({ action: 'analyze', workspacePath: ws });
  assert.equal(result.complexityData['hot.js'].cyclomaticComplexity, 200);
  assert.deepEqual(result.hotspots.map((h) => h.path), ['hot.js']);
});

test('exclude globs match whole names, so *.lock keeps src/clock.js', async () => {
  const { plugin, git } = loadPlugin();
  git.getHeatmapData = async () => ['src/clock.js', 'yarn.lock', 'node_modules/pkg/i.js', 'pkg/node_modules/q/i.js']
    .map((filePath) => ({ filePath, changeCount: 1, lastChangeDate: new Date().toISOString(), authorCount: 1 }));
  const result = await plugin.execute({ action: 'analyze', workspacePath: ws });
  assert.deepEqual(result.changeData.map((c) => c.path), ['src/clock.js']);
});

test('test-coverage ignores the tests that ship inside node_modules', async () => {
  const { plugin } = loadPlugin();
  fs.writeFileSync(path.join(ws, 'app.js'), 'x');
  fs.mkdirSync(path.join(ws, 'node_modules', 'dep'), { recursive: true });
  for (let i = 0; i < 5; i++) fs.writeFileSync(path.join(ws, 'node_modules', 'dep', `t${i}.test.js`), 'x');
  const result = await plugin.execute({ action: 'test-coverage', workspacePath: ws });
  assert.equal(result.method, 'file-count-fallback');
  assert.deepEqual([result.testFiles, result.sourceFiles, result.ratio], [0, 1, 0]);
});

test('find-todos and test-coverage run without git', async () => {
  const { plugin } = loadPlugin({ withGit: false });
  fs.writeFileSync(path.join(ws, 'a.js'), '// TODO: one\n');
  await assert.rejects(plugin.execute({ action: 'coupling', workspacePath: ws }), /gitService/);
  assert.equal((await plugin.execute({ action: 'find-todos', workspacePath: ws })).total, 1);
  assert.ok('ratio' in await plugin.execute({ action: 'test-coverage', workspacePath: ws }));
});

test('graph coverage and TODO counts reach the health score', async () => {
  const { plugin, git, graph } = loadPlugin();
  fs.writeFileSync(path.join(ws, 'a.js'), '// TODO one\n// FIXME two\n');
  git.getHeatmapData = async () => [{ filePath: 'a.js', changeCount: 1, lastChangeDate: new Date().toISOString(), authorCount: 1 }];
  graph.coverageByFile = () => new Map([['a.js', ['a.test.js']]]);
  const { scores } = await plugin.execute({ action: 'analyze', workspacePath: ws });
  assert.equal(scores['a.js'].coveringTests, 1);
  assert.equal(scores['a.js'].todoCount, 2);
  assert.equal(scores['a.js'].penalties.test, 0);
  assert.equal(scores['a.js'].penalties.todo, 1);
});

test('test-coverage reads the knowledge graph when there is one', async () => {
  const { plugin, graph } = loadPlugin();
  const facts = { files: new Set(['a.js', 'b.js', 'a.test.js']), dependedOnBy: new Map([['b.js', new Set(['a.js'])]]) };
  graph.load = () => facts;
  graph.coverageByFile = () => new Map([['a.js', ['a.test.js']]]);
  const result = await plugin.execute({ action: 'test-coverage', workspacePath: ws });
  assert.equal(result.method, 'knowledge-graph');
  assert.equal(result.percentCovered, 50);
  assert.deepEqual(result.leastCoveredHighTraffic, [{ file: 'b.js', dependents: 1 }]);
});
