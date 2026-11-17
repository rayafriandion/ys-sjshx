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
    // 反斜杠在 Windows 上是分隔符、在 POSIX 上只是普通字符：前者越界被 403 拦截，
    // 后者根本没有同名文件而返回 404。两者都不允许真正读出文件内容。
    const escape = await fetch(base + '/%2e%2e%5cpackage.json');
    assert.ok([403, 404].includes(escape.status), `路径穿越必须被拒，实际 ${escape.status}`);
    assert.equal((await fetch(base + '/unknown')).status, 404);
    assert.equal((await fetch(base + '/', { method: 'HEAD' })).status, 200);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
