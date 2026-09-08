const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const media = vm.createContext({ Uint8Array, DataView, Blob });
vm.runInContext(fs.readFileSync(path.join(root, 'media.js'), 'utf8'), media);
const sample = fs.readFileSync(path.join(__dirname, 'fixtures/animated.webp'));
const data = `data:image/webp;base64,${sample.toString('base64')}`;
function injector() {
  class Canvas { toBlob(cb) { cb(new Blob(['native'])); } toDataURL() { return 'native'; } }
  const deadlines = [];
  const sandbox = { HTMLCanvasElement: Canvas, Uint8Array, DataView, Blob, atob, Date,
    setTimeout: (fn, ms) => { if (ms === 600000) { deadlines.push(fn); return -1; } return setTimeout(fn, ms); }, clearTimeout };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const source = fs.readFileSync(path.join(root, 'injector.js'), 'utf8');
  vm.runInContext(source, sandbox);
  return { api: sandbox.__animatedAvatarV2, Canvas, deadlines, sandbox, source };
}
test('RIFF accepts a valid file and rejects trailing/truncated bytes', () => {
  media.validateRiff(sample);
  assert.throws(() => media.validateRiff(sample.subarray(0, sample.length - 1)));
  assert.throws(() => media.validateRiff(Buffer.concat([sample, Buffer.alloc(4)])));
});
test('animated mux length, even padding, dimensions, durations and flags', () => {
  const chunk = media.webpChunk('VP8 ', new Uint8Array([1, 2, 3]));
  assert.equal(chunk.length, 12);
  assert.equal(chunk[11], 0);
  const out = media.muxAnimatedWebp([{ chunks: [chunk], duration: 130, hasAlpha: true }], 48, 64);
  media.validateRiff(out);
  assert.equal(out[20], 0x12);
  assert.equal(out[24], 47);
  assert.equal(out[27], 63);
  assert.equal(out[64], 130);
  assert.equal(out[67], 2);
});
test('lossless alpha is detected, malformed chunk lengths rejected', () => {
  const lossless = fs.readFileSync(path.join(__dirname, 'fixtures/static.webp'));
  const result = media.extractFrameChunks(lossless.buffer.slice(lossless.byteOffset, lossless.byteOffset + lossless.length));
  assert.equal(result.hasAlpha, true);
  const broken = Buffer.from(lossless); broken.writeUInt32LE(0xffffffff, 16);
  assert.throws(() => media.extractFrameChunks(broken.buffer.slice(broken.byteOffset, broken.byteOffset + broken.length)));
});
test('manual hook returns exact original animated bytes asynchronously', async () => {
  const { api, Canvas } = injector();
  api.arm(data);
  let sync = true;
  const output = new Promise(resolve => new Canvas().toBlob(blob => { assert.equal(sync, false); resolve(blob); }));
  sync = false;
  const blob = await output;
  assert.equal(blob.type, 'image/webp');
  assert.deepEqual(Buffer.from(await blob.arrayBuffer()), sample);
  assert.equal(new Canvas().toDataURL(), data);
  assert.equal(api.status().hits, 2);
  api.stop();
  assert.equal(new Canvas().toDataURL(), 'native');
});
test('pending callback survives stop; rearming and reinjection are idempotent', async () => {
  const { api, Canvas, sandbox, source } = injector();
  api.arm(data);
  const output = new Promise(resolve => new Canvas().toBlob(resolve));
  api.stop();
  assert.deepEqual(Buffer.from(await (await output).arrayBuffer()), sample);
  api.arm(data); api.arm(data);
  vm.runInContext(source, sandbox);
  assert.equal(sandbox.__animatedAvatarV2, api);
  assert.equal(api.status().hits, 0);
  api.stop(); assert.equal(new Canvas().toDataURL(), 'native');
});
test('invalid data does not replace an armed image; expiry restores canvas', () => {
  const { api, Canvas, deadlines } = injector();
  api.arm(data);
  assert.throws(() => api.arm('data:image/webp;base64,broken'));
  assert.equal(new Canvas().toDataURL(), data);
  deadlines.at(-1)();
  assert.equal(api.status().active, false);
  assert.equal(new Canvas().toDataURL(), 'native');
});
test('separate tabs do not share activation; restore preserves later site patches', () => {
  const a = injector(), b = injector();
  a.api.arm(data);
  assert.equal(b.api.status().active, false);
  const newer = () => 'site';
  a.Canvas.prototype.toDataURL = newer;
  a.api.stop();
  assert.equal(a.Canvas.prototype.toDataURL, newer);
});

test('author content accepts bounded text and only HTTPS links', () => {
  const sandbox = { URL };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'author.js'), 'utf8'), sandbox);
  const input = JSON.parse(fs.readFileSync(path.join(root, 'author-content/author-content.json'), 'utf8'));
  input.links.push({ label: '危险链接', url: 'javascript:alert(1)', description: '不能显示' });
  const clean = sandbox.__authorContent.validateContent(input);
  assert.equal(clean.links.length, 2);
  assert.equal(clean.author.name, 'joelovechen');
  assert.equal(sandbox.__authorContent.safeUrl('http://example.com'), null);
  assert.throws(() => sandbox.__authorContent.validateContent({ schemaVersion: 2 }));
});
