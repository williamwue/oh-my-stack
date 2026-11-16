# Oh My Stack

OMS 是 [pstack-claude](https://github.com/michael-denyer/pstack-claude) 的轻量派生版，只增加 T3 Code 工具适配。
技能、工作流、模型默认值、hooks 和其他宿主支持沿用上游。原作者为 Lauren Tan，移植版作者为 Michael Denyer。

当前源码基线为 pstack-claude **0.9.138**，OMS 插件版本为 **2.0.1**。
源码准备完成不代表已经发布；远程安装需要所选远程分支包含新版，发布前可用本地路径验证。
完整上游说明保留在 [README.upstream.md](README.upstream.md)，OMS 差异见 [T3 适配](docs/t3.md)。

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

T3 使用其 Codex 或 Claude 后端的同一份原生插件。只在需要的后端安装，无需额外注册 T3 插件。
原生 hooks 的信任与新会话加载仍按宿主要求完成；安装成功不等于真实会话验证通过。

## 使用与配置

新会话中选择 `pstack:poteto-mode`，模型配置使用 `pstack:setup-pstack`。
Codex 可输入 `$` 选择技能，Claude Code 使用 `/pstack:poteto-mode`。
个人模型表和全局指令继续由上游机制加载，OMS 不写入或覆盖它们。

只有会话提供 T3 Code 工具时才读取 T3 映射；其他会话继续使用上游宿主映射。
T3 的调用方式服从当前宿主工具和权限，插件不会创建额外的调度器。

## 更新与卸载

使用宿主的原生插件与 marketplace 命令。第三方 marketplace 的自动更新设置也由宿主管理。
Claude Code 可手动运行 `claude plugin update pstack@oms`；Codex 使用其当前版本的原生 marketplace 更新机制。
不要照抄上游文档中的 `pstack@pstack-claude` 来更新此发行版，本发行版的选择器是 `pstack@oms`。

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
