'use strict';
const SOURCES = [
  { name: 'Cloudflare', url: 'https://zhihu-avatar-author.qxzcmd.workers.dev/author-content.json' },
  { name: 'GitHub 备用源', url: 'https://raw.githubusercontent.com/joelovechen/zhihu-animated-avatar/main/author-content/author-content.json' }
];
const CACHE_KEY = 'authorContentV1';
const LOCAL = {
  schemaVersion: 1,
  updatedAt: '2026-09-08',
  title: '知乎动态头像助手',
  intro: '一个在浏览器本地准备 GIF / 动态 WebP，并通过知乎原有上传流程更换头像的非官方扩展。',
  author: { name: 'joelovechen', bio: '独立开发者，关注实用浏览器工具。' },
  notices: [{ date: '2026-09-08', title: '2.2.0 发布准备', text: '新增可远程更新的作者与消息页面，并提供 Cloudflare 与 GitHub 双源容错。' }],
  links: [
    { label: 'GitHub 主页', url: 'https://github.com/joelovechen', description: '查看作者的公开项目' },
    { label: '原理文章', url: 'https://zhuanlan.zhihu.com/p/2020557080537384238', description: 'Archimon 的知乎文章' }
  ]
};
const text = (value, max) => typeof value === 'string' && value.trim() && value.length <= max ? value.trim() : null;
function safeUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; }
  catch { return null; }
}
function validateContent(raw) {
  if (!raw || raw.schemaVersion !== 1) throw new Error('内容版本不受支持');
  const title = text(raw.title, 80), intro = text(raw.intro, 500);
  const name = text(raw.author?.name, 80), bio = text(raw.author?.bio, 300);
  if (!title || !intro || !name || !bio) throw new Error('内容字段不完整');
  const notices = Array.isArray(raw.notices) ? raw.notices.slice(0, 8).map(item => ({
    date: text(item?.date, 20), title: text(item?.title, 100), text: text(item?.text, 600)
  })).filter(item => item.date && item.title && item.text) : [];
  const links = Array.isArray(raw.links) ? raw.links.slice(0, 8).map(item => ({
    label: text(item?.label, 60), url: safeUrl(item?.url), description: text(item?.description, 160)
  })).filter(item => item.label && item.url && item.description) : [];
  return { schemaVersion: 1, updatedAt: text(raw.updatedAt, 30) || '', title, intro, author: { name, bio }, notices, links };
}
async function fetchJson(url, timeout = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.text();
    if (body.length > 50000) throw new Error('内容过大');
    return validateContent(JSON.parse(body));
  } finally { clearTimeout(timer); }
}
function render(data) {
  document.getElementById('title').textContent = data.title;
  document.getElementById('intro').textContent = data.intro;
  document.getElementById('authorName').textContent = data.author.name;
  document.getElementById('bio').textContent = data.author.bio;
  document.getElementById('avatar').textContent = data.author.name.slice(0, 1).toUpperCase();
  const notices = document.getElementById('notices'); notices.replaceChildren();
  for (const item of data.notices) {
    const article = document.createElement('article'); article.className = 'notice';
    const time = document.createElement('time'); time.textContent = item.date;
    const h3 = document.createElement('h3'); h3.textContent = item.title;
    const p = document.createElement('p'); p.textContent = item.text;
    article.append(time, h3, p); notices.append(article);
  }
  const links = document.getElementById('links'); links.replaceChildren();
  for (const item of data.links) {
    const a = document.createElement('a'); a.href = item.url; a.target = '_blank'; a.rel = 'noreferrer noopener';
    const label = document.createTextNode(item.label); const small = document.createElement('small'); small.textContent = item.description;
    a.append(label, small); links.append(a);
  }
}
async function load() {
  const source = document.getElementById('source');
  for (const remote of SOURCES) {
    try {
      const data = await fetchJson(remote.url);
      render(data); await chrome.storage.local.set({ [CACHE_KEY]: data });
      source.textContent = `内容来源：${remote.name} · 更新于 ${data.updatedAt || '近期'}`;
      source.className = remote === SOURCES[0] ? 'source ok' : 'source fallback'; return;
    } catch { /* Continue to the next trusted source. */ }
  }
  try {
    const cached = (await chrome.storage.local.get(CACHE_KEY))[CACHE_KEY];
    const data = validateContent(cached); render(data);
    source.textContent = '远程源暂不可用，正在显示上次缓存'; source.className = 'source fallback'; return;
  } catch { /* Use the immutable bundled copy. */ }
  render(LOCAL); source.textContent = '远程源暂不可用，正在显示内置内容'; source.className = 'source fallback';
}
if (typeof globalThis !== 'undefined') globalThis.__authorContent = { validateContent, safeUrl };
if (typeof document !== 'undefined') load();
