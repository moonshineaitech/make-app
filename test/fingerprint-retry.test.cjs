const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const { open } = require('../src/fingerprint-cache.cjs');
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'make-app-hash-retry-')), file = path.join(root, 'source.txt');
  t.after(() => fs.rm(root, { recursive: true, force: true })); await fs.writeFile(file, 'project source'); return { root, file };
}
test('a first-read metadata change triggers a fresh complete read before accepting a hash', async t => {
  const { root, file } = await fixture(t), original = fs.stat; let samples = 0;
  fs.stat = async function (name, options) {
    const stat = await original.call(this, name, options);
    if (name === file && options?.bigint) return { ...stat, ctimeNs: stat.ctimeNs + (samples++ ? 1n : 0n) };
    return stat;
  };
  t.after(() => { fs.stat = original; });
  const cache = await open(root), value = await cache.digest(file, 'source.txt');
  assert.equal(value, crypto.createHash('sha256').update('project source').digest('hex'));
  assert.equal(cache.stats.files, 1); assert.equal(cache.stats.bytesRead, Buffer.byteLength('project source') * 2);
});
test('persistently changing source fails after three reads instead of accepting an unstable hash', async t => {
  const { root, file } = await fixture(t), original = fs.stat; let samples = 0;
  fs.stat = async function (name, options) {
    const stat = await original.call(this, name, options);
    if (name === file && options?.bigint) return { ...stat, ctimeNs: stat.ctimeNs + BigInt(samples++) };
    return stat;
  };
  t.after(() => { fs.stat = original; });
  const cache = await open(root); await assert.rejects(cache.digest(file, 'source.txt'), /Source changed while hashing/);
  assert.equal(cache.stats.bytesRead, Buffer.byteLength('project source') * 3);
});
