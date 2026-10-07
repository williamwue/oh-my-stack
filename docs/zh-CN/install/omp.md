# 在 OMP 中安装 Oh My Stack

[English](../../install/omp.md) | [简体中文](omp.md)

OMP 使用独立安装检查。完整命令和前置条件见[发布流程，英文](../../release-process.md#omp-preflight-and-isolated-native-acceptance)。

## 在独立 profile 中检查安装包

1. 下载同一版本的 OMP 压缩包、`release-manifest.json` 和 `SHA256SUMS`。
2. 校验压缩包。
3. 使用源码仓库的 `tools/install-release.mjs`，解压到 Oh My Stack 专属的新目录。
4. 对该安装包和清单运行 `tools/check-omp-install.mjs`。

这些工具需要源码仓库和 Node.js，具体命令见链接中的发布流程。
原生检查会在临时 profile 中执行真实安装、检查发现情况并卸载，不是零写入的 dry run。

在已观察的 OMP 18.3.0 中，`plugin link --dry-run` 会写入状态；本地路径的 `--scope=project` 也不能隔离安装。
测试时使用独立 profile。已有核心工作流证据不能证明 0.9.0 新增的五项 AIHero 原版技能在 OMP 中完成实跑。

## 安装到自己的 profile

独立检查通过后，先查看已有插件，再执行：

```bash
omp plugin install /absolute/owned/path/oh-my-stack
omp plugin list --json
omp plugin doctor --json
omp read skill://prove-it-works
```

将示例路径替换为已校验的安装包目录。同名插件可能被替换。保留旧版目录供回退。
读取 `skill://prove-it-works` 只能证明资源可访问，不能证明所有工作流已执行。

模型配置是独立步骤。使用未实测的工作流或模型组合前，查看[支持范围，英文](../../support-policy.md)。
