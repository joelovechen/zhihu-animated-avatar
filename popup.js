'use strict';
const $ = id => document.getElementById(id);
const MATCH = /^https?:\/\/([\w-]+\.)*zhihu\.com\//;
let targetId, asset, busy = false, polling = false, pageRunning = false;
function status(text, kind = '') { $('status').textContent = text; $('status').className = kind; }
function buttons() {
  $('expand').disabled = busy;
  $('pick').disabled = busy || pageRunning;
  $('manual').disabled = busy || pageRunning || !asset || !targetId;
  $('auto').disabled = busy || pageRunning || !asset || !targetId;
  $('clear').disabled = busy || pageRunning;
  $('stop').disabled = !targetId;
}
function preview() {
  $('previewWrap').hidden = !asset;
  if (!asset) { $('preview').removeAttribute('src'); $('download').removeAttribute('href'); return; }
  $('preview').src = asset.data;
  $('download').href = asset.data;
  $('details').textContent = `${asset.name} · ${asset.frames} 帧 · ${(asset.size / 1024).toFixed(0)} KB`;
  $('sizeWarning').hidden = asset.size <= 2.5 * 1024 * 1024;
}
async function command(action, ...args) {
  const tab = await chrome.tabs.get(targetId);
  if (!MATCH.test(tab.url || '')) throw new Error('目标页面已离开知乎，请重新打开插件');
  // Idempotent injection also handles tabs opened before installation/reloading.
  await chrome.scripting.executeScript({ target: { tabId: targetId }, world: 'MAIN', files: ['injector.js'] });
  const results = await chrome.scripting.executeScript({
    target: { tabId: targetId }, world: 'MAIN',
    func: async (action, args) => {
      try { return { ok: true, state: await window.__animatedAvatarV2[action](...args) }; }
      catch (error) { return { ok: false, error: error.message }; }
    }, args: [action, args]
  });
  const result = results[0]?.result;
  if (!result?.ok) throw new Error(result?.error || '页面没有确认收到指令，请刷新知乎后重试');
  return result.state;
}
function showPage(state) {
  pageRunning = state.running;
  $('pageState').textContent = `${state.message}（拦截 ${state.hits} 次）`;
  $('pageState').className = state.active || state.phase === 'submitted' ? 'ok' : '';
  buttons();
}
async function poll() {
  if (!targetId || polling || (busy && !pageRunning)) return;
  polling = true;
  try { showPage(await command('status')); }
  catch { $('pageState').textContent = '无法连接目标页面，请回到知乎重新打开插件'; }
  finally { polling = false; }
}
async function placeholderFor(blob) {
  const decoder = new ImageDecoder({ data: await blob.arrayBuffer(), type: 'image/webp' });
  try {
    await decoder.tracks.ready;
    const { image } = await decoder.decode({ frameIndex: 0 });
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    try {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 256);
      const scale = Math.min(256 / image.displayWidth, 256 / image.displayHeight);
      const w = image.displayWidth * scale, h = image.displayHeight * scale;
      ctx.drawImage(image, (256 - w) / 2, (256 - h) / 2, w, h);
    } finally { image.close(); }
    return canvas.toDataURL('image/png');
  } finally { decoder.close(); }
}
$('pick').onclick = () => $('file').click();
$('file').onchange = async event => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  busy = true; buttons();
  try {
    if (file.size > 20 * 1024 * 1024) throw new Error('文件超过 20MB，请先压缩');
    const buffer = await file.arrayBuffer();
    const head = String.fromCharCode(...new Uint8Array(buffer).subarray(0, 6));
    let blob;
    if (head === 'GIF87a' || head === 'GIF89a') {
      const converted = await convertGifToWebp(buffer, (i, n) => status(`GIF 转换中：${i} / ${n} 帧，请保持窗口打开…`));
      blob = new Blob([converted.buf], { type: 'image/webp' });
    } else {
      validateRiff(new Uint8Array(buffer));
      blob = new Blob([buffer], { type: 'image/webp' });
    }
    if (blob.size > 20 * 1024 * 1024) throw new Error('转换结果超过 20MB，请缩小 GIF 后重试');
    status('正在逐帧校验动图…');
    const frames = await verifyWebp(blob);
    if (frames < 2) throw new Error('这张图片只有一帧，请选择真正的 GIF / 动态 WebP');
    const next = { data: await blobToDataURL(blob), placeholder: await placeholderFor(blob), frames, size: blob.size, name: file.name };
    // A newly selected asset must not leave an older image armed on the target.
    if (targetId) showPage(await command('stop'));
    await chrome.storage.local.set({ assetV2: next });
    asset = next; preview();
    status('动图已准备好，请选择手动或自动替换。', 'ok');
  } catch (error) { status(`准备失败：${error.message}${asset ? '。保留了上一张已准备的图片。' : ''}`, 'warn'); }
  finally { busy = false; buttons(); }
};
$('manual').onclick = async () => {
  busy = true; buttons();
  try { showPage(await command('arm', asset.data)); status('已启用。回到知乎更换头像，任选一张图片并保存。', 'ok'); }
  catch (error) { status(error.message, 'warn'); }
  finally { busy = false; buttons(); }
};
$('auto').onclick = async () => {
  busy = true; pageRunning = true; buttons();
  status('自动流程开始：将填入图片并点击知乎的保存按钮…');
  try { showPage(await command('automatic', asset.data, asset.placeholder)); status('自动流程已结束，请查看下方页面状态。'); }
  catch (error) { status(error.message, 'warn'); }
  finally { busy = false; pageRunning = false; buttons(); }
};
$('stop').onclick = async () => {
  try { showPage(await command('stop')); status('已停止。已发出的上传请求不会被撤回。'); }
  catch (error) { status(error.message, 'warn'); }
};
$('clear').onclick = async () => {
  busy = true; buttons();
  try {
    if (targetId) showPage(await command('stop'));
    await chrome.storage.local.remove(['assetV2', 'data', 'type', 'size', 'frames']);
    asset = null; preview(); status('已删除本地图片。');
  } catch (error) { status(error.message, 'warn'); }
  finally { busy = false; buttons(); }
};
$('expand').onclick = async () => {
  await chrome.tabs.create({ url: chrome.runtime.getURL(`popup.html${targetId ? `?tab=${targetId}` : ''}`) });
};
$('author').onclick = async () => {
  await chrome.tabs.create({ url: chrome.runtime.getURL('author.html') });
};
async function init() {
  busy = true; buttons();
  try {
    const param = new URLSearchParams(location.search).get('tab');
    const tab = param && /^\d+$/.test(param) ? await chrome.tabs.get(Number(param)) : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    if (tab && MATCH.test(tab.url || '')) {
      targetId = tab.id;
      $('site').textContent = `目标：${new URL(tab.url).hostname} · ${tab.title || '知乎'}`;
    } else { $('site').textContent = '请先打开知乎「我的主页」，再点击插件图标。'; }
    const saved = await chrome.storage.local.get('assetV2');
    asset = saved.assetV2;
    preview();
    status(asset ? '已载入上次准备的动图；启用状态以下方页面反馈为准。' : '选择一张 GIF 或动态 WebP 开始。');
    if (param) { document.body.classList.add('expanded'); $('expand').hidden = true; }
  } catch (error) { status(`初始化失败：${error.message}`, 'warn'); }
  finally { busy = false; buttons(); }
  await poll();
  setInterval(poll, 1800);
}
init();
