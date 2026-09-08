# Partner Center 隐私与审核字段

## Single Purpose Description

本扩展的唯一用途是把用户主动选择的 GIF 或动态 WebP 在本地转换、校验，并通过用户当前打开的知乎个人主页现有头像编辑流程设置为动态头像；同时提供自动执行和手动替换两种操作方式。

## Permission justification

### activeTab

仅在用户点击扩展工具栏图标后读取当时活动标签页的 URL 和标题，以确认页面属于知乎，并把用户发起的头像操作限定到该标签页。扩展不记录或上传浏览历史。

### scripting

用于在用户已授权的当前知乎标签页中注入随扩展打包的本地脚本，并在页面主世界临时替换头像裁剪 Canvas 的导出结果及调用页面现有头像按钮。脚本只在用户打开扩展并执行功能时注入，没有常驻脚本或远程代码。

### storage

用于在 Microsoft Edge 扩展本地存储中保存用户主动选择并处理的动态头像，以及文件名、大小、帧数和自动流程所需的本地 PNG 占位图。数据不发送给开发者，用户可在界面中删除。

### unlimitedStorage

GIF 或动态 WebP 经 Base64 编码后可能超过 storage.local 的默认配额。该权限避免较大动画保存失败；扩展自身仍将输入和输出限制为最大 20MB，并限制帧数和总像素量。

### host permissions

仅用于“作者与更新”页面读取公开 JSON：优先访问 Cloudflare Worker，失败时访问 GitHub Raw 备用源。请求不包含头像、知乎页面内容、账号数据或唯一用户标识；远程数据经过字段、长度和 HTTPS 链接校验后以纯文本显示。

## Remote code

选择：No, I am not using remote code.

全部可执行 JavaScript 均包含在扩展 ZIP 中。扩展不使用 `eval`、远程模块、远程脚本或 WebAssembly。作者页获取的远程 JSON 仅包含可显示的文字和 HTTPS 链接，不能执行代码。

## Data usage 建议

如表单把“用户主动选择并仅保存在本地的头像图片”计入收集数据，请选择与“用户提供的内容 / Website content”最接近的选项，并确保用途只选择“应用功能”。不要选择广告、分析、个性化或数据转售用途。

开发者不接收数据。扩展只在用户明确执行头像保存时，通过知乎页面原有 HTTPS 流程把该头像发送给知乎。当前标签页 URL 和标题仅在设备上即时用于站点与目标页确认，不保存为浏览历史。

Partner Center 的具体复选项可能更新；提交时必须按页面当时的定义如实选择，并保持与 `PRIVACY_POLICY.md` 一致。
