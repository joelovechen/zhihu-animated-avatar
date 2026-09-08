# 作者页远程内容

`author-content.json` 是扩展作者页的数据源。扩展按以下顺序读取：Cloudflare Worker、GitHub Raw、浏览器缓存、扩展内置内容。

远程数据只允许显示短文本与 `https:` 链接。扩展不执行远程脚本，也不使用 HTML 字符串渲染内容。

更新时保持 `schemaVersion` 为 `1`，先运行 `python tools/build_release.py` 校验，再把同一个 JSON 同步到 Cloudflare Worker 与 GitHub。
