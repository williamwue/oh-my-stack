# 首版验证记录

2026-10-30，Windows PowerShell 5.1。

## 模拟宿主

`./tests/run.ps1` 在临时目录创建假的 Codex、Claude CLI，实际调用 OMS 入口。
覆盖独立组件清单、原生安装与状态、重复安装、默认更新、失败记录保护、
不接管已有插件、来源冲突、Claude 原生列表结构、保留数据卸载和书籍文件冲突。
它不读取个人宿主配置，不调用模型。

## 实际 Codex

使用独立的 `CODEX_HOME` 和 `-StateRoot`，调用本机真实 Codex CLI：

- 安装 T3 薄 fork 的 pstack 0.9.112，宿主报告 installed/enabled。
- 安装官方 AIHero 1.3.2，宿主报告 installed/enabled。
- 更新 pstack，确认安装目录中确有 T3 映射文件。
- 卸载 AIHero，并确认宿主列表与 OMS 记录不再包含它。

CLI 在临时 `CODEX_HOME` 下提示不创建 PATH 辅助程序；上述插件命令正常退出。
未启动真实代理会话、调用模型或迁移用户原有 OMS 聚合插件。

## 书籍与未覆盖环境

实际下载已发布的中英文 PDF、EPUB 四个文件，均通过目录中固定的 SHA256
校验。阅读入口保留原文、译本、发布页和授权记录链接。

本机未安装 Claude Code；其原生命令/JSON 契约有模拟测试，尚无本机真实安装
验收。其他操作系统和 Pi 安装不属于首版实现范围。
