'use strict';
const output = document.getElementById('results');
const fixture = document.getElementById('fixture');
const api = window.__animatedAvatarV2;
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const equalBytes = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
document.getElementById('run').onclick = async () => {
  document.getElementById('run').disabled = true;
  output.textContent = '';
  let count = 0;
  async function test(name, fn) { await fn(); count++; output.textContent += `PASS ${name}\n`; }
  try {
    const gif = await (await fetch('/tests/fixtures/animated.gif')).arrayBuffer();
    const original = new Uint8Array(await (await fetch('/tests/fixtures/animated.webp')).arrayBuffer());
    const prepared = await convertGifToWebp(gif);
    const blob = new Blob([prepared.buf], { type: 'image/webp' });
    const data = await blobToDataURL(blob);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 48;
    const placeholder = canvas.toDataURL('image/png');
    await test('GIF 转换：3 帧、完整 RIFF、透明度和逐帧时长', async () => {
      assert(await verifyWebp(blob) === 3, '帧数不符');
      validateRiff(prepared.buf);
      const dec = new ImageDecoder({ data: prepared.buf, type: 'image/webp' });
      try {
        await dec.tracks.ready;
        for (let i = 0; i < 3; i++) {
          const { image } = await dec.decode({ frameIndex: i });
          assert(image.duration === [80000, 130000, 210000][i], '帧时长不符');
          const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 48, 48); ctx.drawImage(image, 0, 0); image.close();
          assert(ctx.getImageData(45, 45, 1, 1).data[3] === 0, '透明背景丢失');
          assert(ctx.getImageData(i * 12 + 5, 20, 1, 1).data[3] > 240, '当前帧图形缺失');
          if (i > 0) assert(ctx.getImageData((i - 1) * 12 + 5, 20, 1, 1).data[3] === 0, '上一帧残影');
        }
      } finally { dec.close(); }
    });
    await test('原始 WebP 校验后不改变字节', async () => {
      const originalBlob = new Blob([original], { type: 'image/webp' });
      assert(await verifyWebp(originalBlob) === 3, 'WebP 解码失败');
      api.arm(await blobToDataURL(originalBlob));
      const exported = await new Promise(resolve => canvas.toBlob(resolve));
      assert(equalBytes(new Uint8Array(await exported.arrayBuffer()), original), '字节发生改变');
      api.stop();
    });
    await test('手动模式：异步完整动图、toDataURL、停止恢复', async () => {
      const native = HTMLCanvasElement.prototype.toBlob;
      api.arm(data);
      let sync = true;
      const promise = new Promise(resolve => canvas.toBlob(value => { assert(!sync, '回调必须异步'); resolve(value); }));
      sync = false;
      assert(equalBytes(new Uint8Array(await (await promise).arrayBuffer()), prepared.buf), '首帧替代了动图');
      assert(canvas.toDataURL() === data, '旧导出路径失败');
      api.stop(); assert(HTMLCanvasElement.prototype.toBlob === native, '未恢复');
    });
    history.replaceState(null, '', '/people/local-test');
    async function autoScenario({ dynamic = false, cancel = false, saveError = false } = {}) {
      fixture.innerHTML = '<div class="ProfileHeader-avatar"><button>修改头像</button></div><button id="unrelated">保存</button>';
      let unrelated = 0, saved, input;
      document.getElementById('unrelated').onclick = () => unrelated++;
      function makeInput() {
        input = document.createElement('input'); input.type = 'file'; input.accept = 'image/png'; input.hidden = true;
        fixture.querySelector('.ProfileHeader-avatar').append(input);
        input.onchange = () => {
          assert(input.files[0].type === 'image/png', '占位图类型不符');
          const dialog = document.createElement('div'); dialog.className = 'Modal'; dialog.role = 'dialog';
          dialog.innerHTML = '<h2>修改头像</h2><canvas width="48" height="48"></canvas><button disabled>保存</button>';
          fixture.append(dialog);
          const button = dialog.querySelector('button');
          button.onclick = () => dialog.querySelector('canvas').toBlob(async value => {
            saved = new Uint8Array(await value.arrayBuffer());
            if (!saveError) dialog.remove(); else dialog.append('服务端拒绝');
          });
          setTimeout(() => { button.disabled = false; }, 250);
        };
      }
      if (!dynamic) makeInput();
      fixture.querySelector('button').onclick = () => { if (!input) makeInput(); input.click(); };
      const operation = api.automatic(data, placeholder);
      if (cancel) setTimeout(() => api.stop(), 30);
      const result = await operation;
      assert(unrelated === 0, '点击了无关保存按钮');
      if (cancel) assert(!saved && !result.active, '停止后仍然提交');
      else if (saveError) assert(result.phase === 'manual' && result.active, '服务端拒绝被标记成功');
      else {
        assert(result.phase === 'submitted' && !result.active, result.message);
        assert(equalBytes(saved, prepared.buf), '自动提交丢帧');
      }
      api.stop(); fixture.innerHTML = '';
    }
    await test('自动模式：填图、等待可保存、完整导出、恢复；不点击无关保存', () => autoScenario());
    await test('自动模式：点击入口创建隐藏 file input', () => autoScenario({ dynamic: true }));
    await test('自动模式：停止后不再保存', () => autoScenario({ cancel: true }));
    await test('自动模式：缺失头像入口回退手动', async () => {
      fixture.innerHTML = '<button>更换封面</button><button>保存</button>';
      const result = await api.automatic(data, placeholder);
      assert(result.phase === 'manual' && result.active, '没有回退手动'); api.stop(); fixture.innerHTML = '';
    });
    await test('自动模式：保存窗口未关闭不报成功（约 20 秒）', () => autoScenario({ saveError: true }));
    output.textContent += `\n全部 ${count} 项浏览器测试通过。`;
  } catch (error) { output.textContent += `FAIL ${error.stack}`; }
  finally { api.stop(); document.getElementById('run').disabled = false; }
};
