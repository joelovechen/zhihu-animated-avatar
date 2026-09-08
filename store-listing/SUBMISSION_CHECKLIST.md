# Edge 加载项发布清单

## 已准备

- Manifest V3、版本 2.2.0、简体中文本地化名称与短描述
- 16/32/48/128px 扩展 PNG 图标
- 最小权限：`activeTab`、`scripting`、`storage`、`unlimitedStorage`
- host permissions 仅用于读取 Cloudflare 与 GitHub 的作者页 JSON；无常驻 content script、无后台脚本、无远程代码
- 商店详细说明、搜索词、审核员说明和权限理由
- 300×300 徽标、440×280 和 1400×560 推广图、三张 1280×800 截图
- 隐私政策 Markdown 与可托管的 HTML 页面
- 生产 ZIP 只包含运行必需文件和图标，不包含测试、工具或商店素材

## 在 Partner Center 中填写

1. 上传根目录含 `manifest.json` 的 `zhihu-animated-avatar-edge-v2.2.0.zip`。
2. Availability：选择 Public 和目标市场。
3. Properties：选择“社交与通信”（无该项时选“生产力”）；Mature content 不勾选；按需要填写你自己的官网和支持邮箱。
4. Privacy：从 `STORE_SUBMISSION_FIELDS_zh-CN.md` 复制单一用途、权限说明和作者页网络请求说明；远程代码选择 No。
5. 将 `privacy-policy.html` 部署到你控制的公开 HTTPS 地址，把该地址填入 Privacy Policy URL。提交前从无登录窗口确认可访问。
6. Store listing 只添加 `zh-CN`，复制 `STORE_LISTING_zh-CN.md` 的详细说明和搜索词，上传徽标、推广图和截图。
7. 将 `REVIEWER_NOTES_zh-CN.txt` 内容粘贴到审核备注/测试说明区域（如果页面提供）。
8. 预览商店页面，确认发布者名称、支持联系方式、图片和“非官方”声明正确，再提交审核。

## 必须由发布者完成

- 使用自己的 Microsoft Partner Center 开发者账户；核对公开显示的发布者名称。
- 提供有效的支持邮箱或支持网页。
- 把隐私政策发布到自己控制的公开 HTTPS URL。包内文件不能代替公开 URL。
- 最终确认你有权分发扩展代码、图标和商店素材，并确认目标功能符合知乎当前服务条款。
