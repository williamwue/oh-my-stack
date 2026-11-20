# Oh My Stack

OMS 为独立 Claude Code 和 Codex 分发 `pstack@oms`，为 T3 Code 分发 `t3-pstack@oms`。
T3 插件直接取自 [chhoumann/t3-pstack 2.5.2](https://github.com/chhoumann/t3-pstack/tree/6584ddba12e03b5ccd8453c7940dbe1a3b5c07d3)，保留其技能、角色集合和启动 hook。独立宿主继续使用基于 pstack-claude 0.9.138 的插件。

<a id="install"></a>

## 安装

使用已安装并登录的宿主原生插件机制，不需要 PowerShell 或 OMS 安装器。
已有 OMS 1.x 或其他 pstack 安装时，先阅读 [迁移说明](docs/oms-migration.md)，避免重复加载。

Claude Code：

```text
/plugin marketplace add williamwue/oh-my-stack
/plugin install pstack@oms
```

<a id="codex"></a>

Codex：

```sh
codex plugin marketplace add williamwue/oh-my-stack
codex plugin add pstack@oms
```

本地验证时，将 marketplace add 的仓库参数替换为此仓库的绝对路径。
测试安装须使用独立且预先创建的 `CODEX_HOME` 或 `CLAUDE_CONFIG_DIR`，不复用个人宿主目录。

### T3 Code

在 T3 实际使用的后端配置目录注册同一个 OMS marketplace，选择 `t3-pstack@oms`。Codex 使用 `codex plugin add t3-pstack@oms`，Claude Code 使用 `/plugin install t3-pstack@oms`。若同一配置目录已经启用 `pstack@oms`，切换时先停用旧插件，避免两个启动 hook 竞争。需要分别使用两种插件时，为 T3 配置独立的 provider 配置目录。

在新 T3 会话中运行 `t3-pstack:setup-pstack`。角色表位于 `~/.config/t3-pstack/models.md`（可通过 `XDG_CONFIG_HOME` 覆盖），角色名、provider 选项、默认值和 panel 席位由[随包 setup 技能](plugins/t3-pstack/skills/setup-pstack/SKILL.md)定义。旧 OMS 角色表不会自动迁入。需要自动路由时启用 session hook，并在宿主中信任该插件的 hook。

独立宿主使用 `pstack:setup-pstack`。早期 OMS 的 T3 映射与验证记录见[历史方案](docs/t3.md)。

## 更新与卸载

使用宿主的原生插件与 marketplace 命令。第三方 marketplace 的自动更新设置也由宿主管理。
Claude Code 可手动运行 `claude plugin update pstack@oms`；Codex 使用其当前版本的原生 marketplace 更新机制。
不要照抄上游文档中的 `pstack@pstack-claude` 来更新此发行版，按宿主选择 `pstack@oms` 或 `t3-pstack@oms`。

OMS 不再管理 AIHero、电子书、宿主安装或安装数据库。现有工具、文件和凭据保留原样。
历史文档与书籍授权见 [归档说明](docs/oms-history/README.md)。

## 开发与同步

```sh
bun install --frozen-lockfile
bun install --frozen-lockfile --cwd plugins
bun tools/generate.mjs --check
bun test tests/
```

修改生成源后运行 `bun tools/generate.mjs`。其余检查沿用 [上游贡献说明](CONTRIBUTING.md)。
上游同步和维护边界见 [T3 适配](docs/t3.md#维护与同步)。
2.0.0 的本地检查见 [验证记录](docs/oms-verification.md)，
2.0.1 的精简与真实调用见 [T3 验证记录](docs/oms-verification-t3-2.0.1.md)。
后续日常安装、自动加载及启动 hook 验收见 [安装记录](docs/oms-daily-install-2.0.1.md)。
独立工作区的后续通过结果见 [worktree 验证](docs/oms-worktree-verification-2.0.1.md)。
2.0.2 的跨模型配置、原生打包和真实 Claude 到 Codex 调用见 [模型配置验收](docs/oms-t3-models-verification-2.0.2.md)。
2.0.2 的日常安装、角色配置和 Opus/Sol/Astra 闭环验收见 [日常升级记录](docs/oms-daily-install-2.0.2.md)。
后续五模型分工及真实调用见 [五模型配置验收](docs/oms-five-model-profile-2026-11-16.md)。
可选角色表见 [T3 五模型示例](docs/examples/pstack-models-t3.md)，安装不会自动应用该示例。
只有 Codex 后端时使用 [T3 纯 Codex 示例](docs/examples/pstack-models-t3-codex-only.md)，无需安装 Claude。
<a id="other-harnesses"></a>

## 其他宿主

上游其他宿主支持保留，见 [上游安装说明](README.upstream.md#install)。
Pi 的最低版本要求沿用上游：Pi 1.5.1 or later。
在 OMS 中使用本仓库的本地路径；使用 marketplace 时以 `oms` 为名称，避免装到原版来源。
这些宿主不包含 T3 的独立调度器，也不因保留源码而视为已在 OMS 上验收。

<a id="license"></a>

## 许可

[上游许可证](LICENSE)、[作者声明](NOTICE.md)、[OMS 适配许可证](LICENSE-oms)和历史书籍授权分别保留。
书籍不适用代码的 MIT 许可。
