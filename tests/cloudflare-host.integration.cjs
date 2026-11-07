// Actual local Workers Static Assets runtime; no Supabase calls or credentials.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const {setTimeout: delay} = require('node:timers/promises');

test('Workers serves the built app, redirects the Pages prefix and keeps repository files private', {timeout: 45000}, async t => {
  const reservation = net.createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const root = path.resolve(__dirname, '..');
  const child = spawn(process.execPath, [path.join(root, 'node_modules/wrangler/bin/wrangler.js'), 'dev', '--local', '--ip', '127.0.0.1', '--port', String(port), '--inspector-port', '0', '--config', 'wrangler.jsonc'], {
    cwd: root, env: {...process.env, WRANGLER_SEND_METRICS: 'false'}, stdio: ['ignore', 'ignore', 'ignore']
  });
  let stopped = false;
  child.on('exit', () => { stopped = true; });
  t.after(async () => {
    if (!stopped) {
      const closed = new Promise(resolve => child.once('exit', resolve));
      child.kill('SIGTERM');
      await closed;
    }
  });
  const origin = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 100 && !stopped; attempt++) {
    try { ready = (await fetch(origin, {signal: AbortSignal.timeout(500)})).ok; } catch {}
    if (ready) break;
    await delay(200);
  }
  assert.equal(ready, true, 'Local Workers runtime must start.');
  for (const file of ['index.html', 'manifest.webmanifest', 'sw.js', 'pages/settings.html', 'modules/auth-config.js', 'vendor/supabase.js']) {
    const response = await fetch(`${origin}/${file}?v=smoke`);
    assert.equal(response.status, 200, `Static asset must load: ${file}`);
    const sameBytes = Buffer.from(await response.arrayBuffer()).equals(fs.readFileSync(path.join(root, 'dist', file)));
    assert.equal(sameBytes, true, `Static bytes must be preserved: ${file}`);
  }
  for (const [source, destination] of [['/Pickleball?page=settings', '/?page=settings'], ['/Pickleball/?page=academy', '/?page=academy'], ['/Pickleball/modules/page-router.js?v=smoke', '/modules/page-router.js?v=smoke']]) {
    const response = await fetch(origin + source, {redirect: 'manual'});
    assert.equal(response.status, 302);
    assert.equal(new URL(response.headers.get('location'), origin).href, origin + destination);
  }
  const settings = await fetch(`${origin}/?page=settings`);
  assert.equal(settings.status, 200);
  assert.equal(Buffer.from(await settings.arrayBuffer()).equals(fs.readFileSync(path.join(root, 'dist/index.html'))), true);
  for (const file of ['AGENTS.md', 'package.json', 'scripts/serve_test.py', 'supabase/config.toml', '.env', 'tests/auth.spec.cjs']) {
    assert.equal((await fetch(`${origin}/${file}`)).status, 404, `Repository file must not be published: ${file}`);
  }
});
