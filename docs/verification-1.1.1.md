# OMS 1.1.1 后续验收

验收日期为 2026-11-09，代码基线为 `0d9893d2`。本轮排除 Claude Code。
Mock 夹具中的假 Claude CLI 仍作为共享安装保护的回归用例执行，
不运行真实 Claude CLI、不修改 Claude 配置。

## 范围与复现

本机为 Apple Silicon macOS。使用 Microsoft PowerShell Release v7.6.9
的 osx-arm64 归档，SHA256 为
`a1c7e98ac403da4be5ba75c1c5855af272de7787a91d478c4267466fe58fc1af`。
归档解压到临时目录，不安装全局 PowerShell、不改写 PATH 配置。

```sh
pwsh -NoProfile -File ./tests/run.ps1
```

此命令运行本地 Git、模拟宿主和模拟下载，不调用模型，不修改个人宿主配置。
跨平台结果以本次 PR 的四项 GitHub Actions 作业为准，不能沿用 1.1.0 的成功记录。

## 证据边界

发布时未执行的验证见 [1.1.1 发布说明](release-1.1.1.md)。
2026-11-09 查询时 OMS lifecycle 已为 active，但基线提交没有 workflow run。
本次用验收文档 PR 触发当前版本矩阵，不改变仓库 Actions 设置。

真实宿主安装、skills 发现和模型实际执行分别记录。隔离配置中的安装结果
不等于个人宿主已升级；T3 的 `restart-required` 不等于真实会话成功。
本轮不修改个人模型、hook 信任、书籍授权或其他插件。
