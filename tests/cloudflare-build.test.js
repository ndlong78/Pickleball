const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {build} = require('../scripts/build-cloudflare.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pickleup-static-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  function write(file, bytes = file) {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), bytes);
  }
  for (const file of ['_redirects', 'index.html', 'manifest.webmanifest', 'sw.js', 'app.js', 'style.css', 'modules/auth-config.js', 'modules/data/core.js', 'pages/settings.html', 'icons/icon.svg', 'vendor/supabase.js', 'vendor/SUPABASE-LICENSE']) write(file);
  return {root, write};
}

test('static build preserves runtime bytes and excludes repository and private inputs', t => {
  const {root, write} = fixture(t);
  write('modules/auth-config.js', 'window.PICKLEUP_AUTH_CONFIG={enabled:true,url:"https://example.supabase.co",publishableKey:"sb_publishable_fixture"};');
  for (const file of ['.env', 'package.json', 'docs/guide.html', 'scripts/private.js', 'tests/private.js', 'supabase/private.sql', 'node_modules/private.js', 'modules/.env', 'modules/private.json', 'vendor/README.md']) write(file, 'excluded');
  assert.equal(build(root), 12);
  for (const file of ['index.html', 'sw.js', 'modules/auth-config.js', 'modules/data/core.js', 'vendor/SUPABASE-LICENSE']) assert.deepEqual(fs.readFileSync(path.join(root, 'dist', file)), fs.readFileSync(path.join(root, file)));
  for (const file of ['.env', 'package.json', 'docs', 'scripts', 'tests', 'supabase', 'node_modules', 'modules/.env', 'modules/private.json', 'vendor/README.md']) assert.equal(fs.existsSync(path.join(root, 'dist', file)), false);
});

test('rebuild removes stale generated assets without changing source files', t => {
  const {root, write} = fixture(t);
  build(root);
  write('dist/old.js');
  write('app.js', 'updated');
  build(root);
  assert.equal(fs.existsSync(path.join(root, 'dist/old.js')), false);
  assert.equal(fs.readFileSync(path.join(root, 'dist/app.js'), 'utf8'), 'updated');
  assert.equal(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), 'updated');
});

test('missing required input fails before replacing the previous artifact', t => {
  const {root, write} = fixture(t);
  write('dist/previous.js');
  fs.unlinkSync(path.join(root, 'sw.js'));
  assert.throws(() => build(root));
  assert.equal(fs.existsSync(path.join(root, 'dist/previous.js')), true);
});

test('asset symlinks cannot publish files outside the selected runtime', t => {
  const {root, write} = fixture(t);
  write('.private', 'private');
  write('dist/previous.js');
  fs.symlinkSync(path.join(root, '.private'), path.join(root, 'modules/leak.js'));
  assert.throws(() => build(root), /symbolic links/);
  assert.equal(fs.existsSync(path.join(root, 'dist/previous.js')), true);
});

test('Wrangler targets a static staging Worker without server secrets or custom routes', () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../wrangler.jsonc'), 'utf8'));
  assert.deepEqual(Object.keys(config).sort(), ['$schema', 'assets', 'compatibility_date', 'name', 'previews', 'workers_dev']);
  assert.deepEqual(config.previews, {});
  assert.equal(config.name, 'pickleup-staging');
  assert.equal(config.workers_dev, true);
  assert.deepEqual(config.assets, {directory: './dist'});
});
