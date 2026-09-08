# Cloudflare 主源

Worker 名称：`zhihu-avatar-author`

公开地址：`https://zhihu-avatar-author.qxzcmd.workers.dev/author-content.json`

隐私政策：`https://zhihu-avatar-author.qxzcmd.workers.dev/privacy-policy`

`worker.js` 返回与 `author-content/author-content.json` 相同的数据，并设置 CORS、短缓存及 `nosniff` 响应头。发布顺序是先更新 GitHub，再部署 Worker。
