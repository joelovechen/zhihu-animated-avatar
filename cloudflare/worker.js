'use strict';
const CONTENT = {
  schemaVersion: 1,
  updatedAt: '2026-09-08',
  title: '知乎动态头像助手',
  intro: '一个在浏览器本地准备 GIF / 动态 WebP，并通过知乎原有上传流程更换头像的非官方扩展。',
  author: { name: 'joelovechen', bio: '独立开发者，关注实用浏览器工具。' },
  notices: [
    { date: '2026-09-08', title: '2.2.0 发布准备', text: '新增可远程更新的作者与消息页面，并提供 Cloudflare 与 GitHub 双源容错。' }
  ],
  links: [
    { label: 'GitHub 主页', url: 'https://github.com/joelovechen', description: '查看作者的公开项目' },
    { label: '原理文章', url: 'https://zhuanlan.zhihu.com/p/2020557080537384238', description: 'Archimon 的知乎文章' }
  ]
};
addEventListener('fetch', event => event.respondWith(handle(event.request)));
async function handle(request) {
  const url = new URL(request.url);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60, s-maxage=300',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff'
  };
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'GET' || !['/', '/author-content.json'].includes(url.pathname)) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
  }
  return new Response(JSON.stringify(CONTENT), { status: 200, headers });
}
