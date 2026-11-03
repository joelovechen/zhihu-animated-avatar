# AGENTS.md — 知乎动态头像助手 AI 协作与开发准则

本文件是 AI Agent 进入 `zhihu-animated-avatar` 仓库的首要引导说明，遵循 `github-index` 的 [项目开发实施准则](../../github-index/standards/docs/项目开发实施准则.md)。

## 1. 权威文档入口

- **产品目标与功能需求**：[docs/产品目标与功能需求.md](docs/产品目标与功能需求.md)
- **系统架构与关键决策**：[docs/系统架构与关键决策.md](docs/系统架构与关键决策.md)
- **开发环境与构建运行说明**：[docs/开发环境与构建运行说明.md](docs/开发环境与构建运行说明.md)
- **项目进度与任务状态**：[docs/项目进度与任务状态.md](docs/项目进度与任务状态.md)
- **参考资料登记**：[references/README.md](references/README.md)
- **任务交接记录**：[HANDOVER.md](HANDOVER.md)

## 2. 编码与合规红线

1. **零外部运行时依赖与按需注入**：保持原生 JS 免构建结构，不添加常驻内容脚本、远程可执行代码或遥测。
2. **尊重原作者版权**：保留对 Archimon 原文章的致谢引用，不复制原文受版权保护的图文。
3. **路径与凭据卫生**：严禁提交 `local-artifacts/`、`*.zip` 或本机绝对路径（不要在受跟踪文档中写入带盘符的本机路径）。

## 3. 合并前必跑检查

```powershell
npm test
```
