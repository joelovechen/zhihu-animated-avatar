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
const PRIVACY_PAGE = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>隐私政策｜知乎动态头像助手</title><style>body{margin:0;background:#f5f7fb;color:#1b2b40;font:16px/1.85 system-ui,sans-serif}main{max-width:820px;margin:36px auto;padding:40px 48px;background:#fff;border:1px solid #e2e8f1;border-radius:16px}h1{margin:0}h2{font-size:19px;margin-top:30px}p,li{color:#46566c}.meta{font-size:14px;color:#708096}@media(max-width:700px){main{margin:0;padding:28px 22px;border:0}}</style></head><body><main><h1>隐私政策</h1><p class="meta">知乎动态头像助手（非官方）｜生效日期：2026 年 9 月 8 日｜适用版本：2.2.0 及以上</p><p>本扩展的单一用途是在用户主动选择图片后，帮助用户通过知乎现有的头像设置流程更换动态头像。</p><h2>处理的数据</h2><ul><li>用户主动选择的 GIF 或 WebP 在浏览器本地解析、转换、校验和保存。</li><li>当前标签页 URL、标题及头像编辑页面状态只在设备上用于用户发起的操作。</li><li>打开“作者与更新”时会从 Cloudflare 请求公开 JSON，失败时请求 GitHub Raw；常规网络连接信息由相应托管服务处理。请求不包含头像、知乎账号信息或唯一用户标识。</li></ul><p>本扩展不读取或收集密码、Cookie、私信、联系人、完整浏览历史、位置、支付信息或设备标识，不使用分析、追踪或广告。</p><h2>数据使用与保存</h2><p>头像仅在用户明确保存时通过知乎页面原有流程发送给知乎。准备好的头像和作者页缓存保存在 Edge 扩展本地存储中，可由用户删除；卸载扩展会删除这些本地数据。</p><h2>安全与远程代码</h2><p>全部可执行代码都包含在扩展包中。作者页只解析字段和长度受限的 JSON，以纯文本显示，并只接受 HTTPS 链接；远程内容不能注入 HTML 或 JavaScript。</p><h2>政策更新与联系</h2><p>功能或数据处理方式变化时会更新本政策。隐私或支持问题请使用 Edge 加载项商店页面中的发布者联系方式或 GitHub 仓库。</p><p><a href="https://github.com/joelovechen/zhihu-animated-avatar">GitHub 项目</a></p><p>本扩展是独立开发的非官方工具，与知乎没有隶属、合作或认可关系。</p></main></body></html>`;
addEventListener('fetch', event => event.respondWith(handle(event.request)));
async function handle(request) {
  const url = new URL(request.url);
  const common = {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60, s-maxage=300',
    'X-Content-Type-Options': 'nosniff'
  };
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: common });
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: common });
  if (url.pathname === '/privacy-policy') {
    return new Response(PRIVACY_PAGE, { status: 200, headers: { ...common, 'Content-Type': 'text/html; charset=utf-8' } });
  }
  if (['/', '/author-content.json'].includes(url.pathname)) {
    return new Response(JSON.stringify(CONTENT), { status: 200, headers: { ...common, 'Content-Type': 'application/json; charset=utf-8' } });
  }
  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...common, 'Content-Type': 'application/json; charset=utf-8' } });
}
