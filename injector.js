// 原理来源：Archimon https://zhuanlan.zhihu.com/p/2020557080537384238
// MAIN world. Explicit activation on one tab; no storage broadcasts.
(() => {
  'use strict';
  const KEY = '__animatedAvatarV2';
  if (window[KEY]) return;
  let rawData, rawBlob, originals, timer, running = false, generation = 0;
  let state = { active: false, hits: 0, message: '尚未启用替换', phase: 'idle' };
  const snapshot = () => ({ ...state, running });
  function stop(message = '已停止替换，页面恢复正常') {
    generation++;
    clearTimeout(timer);
    if (originals) {
      const proto = HTMLCanvasElement.prototype;
      if (proto.toBlob === wrappedBlob) proto.toBlob = originals.toBlob;
      if (proto.toDataURL === wrappedURL) proto.toDataURL = originals.toDataURL;
    }
    rawData = rawBlob = originals = null;
    state = { ...state, active: false, phase: 'idle', message };
    return snapshot();
  }
  function wrappedBlob(callback) {
    if (typeof callback !== 'function') throw new TypeError('callback must be a function');
    const blob = rawBlob;
    state.hits++;
    setTimeout(() => callback(blob), 0);
  }
  function wrappedURL() { state.hits++; return rawData; }
  function arm(data) {
    if (running) throw new Error('自动替换正在进行，请等待或停止');
    if (typeof data !== 'string' || !/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(data)) throw new Error('需要有效的 WebP 数据');
    const bytes = Uint8Array.from(atob(data.split(',')[1]), c => c.charCodeAt(0));
    if (bytes.length < 20 || bytes.length > 20 * 1024 * 1024 ||
        String.fromCharCode(...bytes.subarray(0, 4)) !== 'RIFF' ||
        String.fromCharCode(...bytes.subarray(8, 12)) !== 'WEBP' ||
        new DataView(bytes.buffer).getUint32(4, true) + 8 !== bytes.length) throw new Error('WebP 文件无效或超过 20MB');
    stop();
    rawData = data;
    rawBlob = new Blob([bytes], { type: 'image/webp' });
    const proto = HTMLCanvasElement.prototype;
    originals = { toBlob: proto.toBlob, toDataURL: proto.toDataURL };
    proto.toBlob = wrappedBlob;
    proto.toDataURL = wrappedURL;
    state = { active: true, hits: 0, phase: 'armed', message: '当前页面已就绪：请按知乎正常流程更换头像并保存', expiresAt: Date.now() + 600000 };
    timer = setTimeout(() => stop('替换已在 10 分钟后自动停止'), 600000);
    return snapshot();
  }
  const visible = el => el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const unique = list => { const items = [...new Set(list)]; return items.length === 1 ? items[0] : null; };
  const label = el => (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim();
  const avatarRoot = () => unique([...document.querySelectorAll('.UserAvatarEditor, .ProfileHeader-avatar')].filter(visible).filter(el => !el.parentElement?.closest('.UserAvatarEditor, .ProfileHeader-avatar')));
  function avatarDialog() {
    return unique([...document.querySelectorAll('[role="dialog"], .Modal')].filter(visible).filter(el =>
      /头像/.test(el.querySelector('h1,h2,h3,.Modal-title')?.textContent || el.getAttribute('aria-label') || '') ||
      el.querySelector('.AvatarEditor, .AvatarUploader')
    ).filter(el => !el.parentElement?.closest('[role="dialog"], .Modal')));
  }
  function inputIn(root) {
    if (!root) return null;
    return unique([...root.querySelectorAll('input[type="file"]')].filter(el => !el.disabled && !el.multiple &&
      (!el.accept || /image|\.png|\.jpg|\.jpeg|\.webp/i.test(el.accept))));
  }
  async function waitFor(fn, ms, token) {
    const end = Date.now() + ms;
    do {
      if (token !== generation || !state.active) throw new Error('操作已停止');
      const result = fn();
      if (result) return result;
      await new Promise(resolve => setTimeout(resolve, 150));
    } while (Date.now() < end);
    throw new Error('等待页面响应超时');
  }
  async function automatic(data, placeholder) {
    if (running) throw new Error('自动替换正在进行');
    if (!/^\/people\/[^/]+\/?(?:edit\/?)?$/.test(location.pathname)) throw new Error('请先打开知乎「我的主页」，再使用自动替换');
    if (!/^data:image\/png;base64,/.test(placeholder || '')) throw new Error('缺少占位图片，请重新选择动图');
    arm(data);
    const token = generation;
    running = true;
    state.phase = 'opening';
    state.message = '正在定位头像上传入口…';
    try {
      let input = inputIn(avatarDialog()) || inputIn(avatarRoot());
      if (!input) {
        const opener = unique([...(avatarRoot() || document).querySelectorAll('button, [role="button"], label')]
          .filter(visible).filter(el => /^(修改头像|更换头像|编辑头像|上传头像)$/.test(label(el))));
        if (!opener) throw new Error('没有找到唯一的头像上传入口；请打开自己的主页，或使用手动模式');
        // Catch the site's synchronous input.click without opening the OS chooser.
        const nativeClick = HTMLInputElement.prototype.click;
        let captured;
        HTMLInputElement.prototype.click = function (...args) {
          if (this.type === 'file') { captured = this; return; }
          return nativeClick.apply(this, args);
        };
        try { opener.click(); } finally { HTMLInputElement.prototype.click = nativeClick; }
        input = await waitFor(() => captured || inputIn(avatarDialog()) || inputIn(avatarRoot()), 6000, token);
      }
      const bytes = Uint8Array.from(atob(placeholder.split(',')[1]), c => c.charCodeAt(0));
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], 'avatar.png', { type: 'image/png' }));
      input.files = transfer.files;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      state.phase = 'cropping';
      state.message = '已填入图片，等待头像裁剪窗口…';
      const dialog = await waitFor(avatarDialog, 10000, token);
      const save = await waitFor(() => {
        const button = unique([...dialog.querySelectorAll('button')].filter(visible)
          .filter(el => /^(保存|确定|确认|完成|保存头像)$/.test(label(el)) && !el.disabled && el.getAttribute('aria-disabled') !== 'true'));
        const imageReady = [...dialog.querySelectorAll('img')].some(img => img.complete && img.naturalWidth > 0);
        const canvasReady = [...dialog.querySelectorAll('canvas')].some(canvas => canvas.width > 0 && canvas.height > 0);
        return button && (imageReady || canvasReady) ? button : null;
      }, 10000, token);
      const beforeSave = state.hits;
      save.click();
      state.phase = 'submitting';
      state.message = '已点击保存，等待页面处理…';
      await waitFor(() => state.hits > beforeSave, 10000, token);
      await waitFor(() => !dialog.isConnected || !visible(dialog), 20000, token);
      stop('已替换动图数据并完成页面保存流程；请在知乎确认头像效果');
      state.phase = 'submitted';
    } catch (error) {
      if (token === generation && state.active) {
        state.phase = 'manual';
        state.message = `${error.message}。替换仍已启用，可在知乎手动选图并保存；无需重新转换。`;
      }
    } finally { running = false; }
    return snapshot();
  }
  window[KEY] = { arm, stop, automatic, status: snapshot };
})();
