import test from 'node:test';
import assert from 'node:assert/strict';
import { server } from '../server.mjs';
test('static server serves modules with safe content types and rejects filesystem escape and writes', async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const home = await fetch(base); assert.equal(home.status, 200); assert.match(await home.text(), /lang="zh-CN"/);
    const module = await fetch(base + '/src/engine.js'); assert.match(module.headers.get('Content-Type'), /javascript/);
    assert.ok(module.headers.get('Content-Security-Policy').includes("default-src 'self'"));
    assert.equal((await fetch(base + '/src/engine.js', { method: 'POST' })).status, 405);
    assert.equal((await fetch(base + '/%2e%2e%5cpackage.json')).status, 403);
    assert.equal((await fetch(base + '/unknown')).status, 404);
    assert.equal((await fetch(base + '/', { method: 'HEAD' })).status, 200);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
