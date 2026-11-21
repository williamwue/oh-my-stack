# Oh My Stack

OMS 只发布一个插件 `pstack@oms`。它由两个开源项目重新组合而成：

- [pstack-claude v0.9.145](https://github.com/michael-denyer/pstack-claude/tree/v0.9.145)：负责 Claude Code、Codex、OpenCode、Pi 等原生宿主的 pstack，基于上游 cursor/plugins `0b46ec3`。
- [t3-pstack 2.5.3](https://github.com/chhoumann/t3-pstack/tree/a9cd5ab33d370fa152dbdf5df6c04448f5ad90bc)：负责 T3 Code 的 `delegate_task` 跨模型派发、T3 模型表、PR 评审静默窗口和安装器。

同一套技能在原生宿主上使用宿主自带的子代理派发；在提供 T3 编排工具的会话中，先读取 [T3 映射](plugins/pstack/skills/poteto-mode/references/t3-tools.md)，改用 `delegate_task`，panel 可以混用 Claude、GPT、Gemini 和 Grok。没有 T3 工具时，行为与 pstack-claude 一致。

<a id="install"></a>

## 安装

已有 OMS 2.x 的 `t3-pstack@oms` 或其他 pstack 安装时，先阅读[迁移说明](docs/oms-migration.md)，避免两个插件同时加载。

### T3 Code

先安装并登录 T3 要使用的 Claude Code、Codex 或 Antigravity 后端，再运行：

```sh
npx -y github:williamwue/oh-my-stack install
```

安装器会找出 T3 管理的每个 Claude Code、Codex 和 Antigravity 实例，把 `pstack@oms` 装进去。它还会把 Codex marketplace 固定到当前发布 tag，信任 Codex 的 session-start hook，并把模型表迁移到 `~/.config/t3-pstack/models.md`。重复运行不会产生额外改动。`update` 与 `install` 相同，`doctor` 只做检查、不写入。用 `--source <目录>` 可以从本地检出安装。

装好后，在新的 T3 会话中运行 `pstack:setup-pstack`，按当前 provider catalog 为各角色选择模型。默认角色和 panel 席位见 [T3 角色默认值](plugins/pstack/skills/poteto-mode/references/t3-tools.md#role-defaults)。

<a id="codex"></a>

### 独立 Claude Code 与 Codex

Claude Code：

```text
/plugin marketplace add williamwue/oh-my-stack
/plugin install pstack@oms
```

Codex：

```sh
codex plugin marketplace add williamwue/oh-my-stack
codex plugin add pstack@oms
```

独立宿主用 `pstack:setup-pstack` 写入原生模型表 `pstack-models.md`。T3 模型表与原生模型表互不影响。

## 更新与卸载

T3 后端运行 `npx -y github:williamwue/oh-my-stack update`。独立宿主使用原生命令，例如 `claude plugin update pstack@oms`。不要照抄上游文档中的 `pstack@pstack-claude`。

OMS 不管理 AIHero、电子书或安装数据库，现有工具、文件和凭据保持原样。历史文档与书籍授权见[归档说明](docs/oms-history/README.md)。

## 开发与同步

```sh
bun install --frozen-lockfile
bun install --frozen-lockfile --cwd plugins
bun tools/generate.mjs --check
bun test tests/
```

修改生成源后运行 `bun tools/generate.mjs`。两个上游各自的同步方式、组合边界和检查方法见 [T3 适配](docs/t3.md)，其他检查沿用[上游贡献说明](CONTRIBUTING.md)。

<a id="other-harnesses"></a>

## 其他宿主

pstack-claude 支持的其他宿主全部保留，安装方式见[上游安装说明](README.upstream.md#install)。Pi 的最低版本要求沿用上游：Pi 1.5.1 or later。使用 marketplace 时名称写 `oms`，避免装到原版来源。

<a id="license"></a>

## 许可

[上游许可证](LICENSE)、[作者声明](NOTICE.md)、[t3-pstack 许可证](LICENSE-t3-pstack)、[OMS 适配许可证](LICENSE-oms)和历史书籍授权分别保留。书籍不适用代码的 MIT 许可。
