# Codex 和 Claude Code 可选自动路由

此能力从 0.11.0 提供。安装或升级不会自动开启。
现有 `poteto-mode` 显式入口继续可用。当前源代码已增加 Claude Code 适配；
这不代表已发布或已更新本机安装。OMP 尚未接入此开关。

0.11.1 起提供以下选项式设置流程。

在 Codex 输入 `$`，选择 `oh-my-stack:setup-oh-my-stack`，提交默认的设置提示即可，
无需编写开启指令。设置会先显示当前生效模式，再提供明确选项：

- **开启自动路由**：普通工程任务自动选择 OMS 工作流。
- **关闭自动路由**：使用显式工作流入口。
- **保持当前设置**：不修改路由配置。

选择开启或关闭后，再选 **各项目默认（推荐）** 或 **仅当前项目**。
完成选择后直接保存；保持现状或取消不会写入配置。
已有项目设置仍优先于个人默认。界面和当前模式支持原生选择控件时使用控件；
否则显示文字选项，等待选择，不要求用户编写配置提示。

可以直接结束设置，不配置模型。路由设置保留模型映射，不读取模型清单或运行 worker 探测。
随后通过原生 `/hooks` 审阅并信任 OMS hook，再启动新会话验证自动路由。
仍支持直接指定模式与范围，或只查看状态、预览变更；已经明确的选择不会重复询问。

开关开启，并在新会话验证 hook 后，可以直接描述修复、功能或代码解释任务。
用户指定的 Skill 优先。聊天、翻译和工具用法问题不会进入工程执行。
小任务使用现有的主代理直接执行路径；明确要求的独立审阅仍保留完整契约。
自动选择入口不会扩大修改、委派、合并或部署权限。
开关控制新增的 `oms-auto` 入口和 hook 提示。原有部分 Skill 已允许隐式调用，
切换 manual 不会更改这些 Skill 的原生调用策略。

## 查看与关闭

辅助脚本需要 Node.js 20 或更高版本。将下列路径替换为实际安装的 Codex 插件根目录，
从目标项目运行；它们不读取应用 env、凭据或模型清单，不调用模型。

```bash
node /path/to/installed/oh-my-stack/scripts/routing.mjs status
node /path/to/installed/oh-my-stack/scripts/routing.mjs set --scope project --mode auto
node /path/to/installed/oh-my-stack/scripts/routing.mjs set --scope project --mode auto --apply
node /path/to/installed/oh-my-stack/scripts/routing.mjs set --scope project --mode manual --apply
```

没有 `--apply` 时仅预览。`--scope user` 设置个人默认。
个人配置位于 `$CODEX_HOME/oh-my-stack/routing.json`，未设置 `CODEX_HOME` 时位于
`~/.codex/oh-my-stack/routing.json`。项目配置位于 Git worktree 根目录的
`.oh-my-stack/routing.json`；查找时使用当前目录至该根目录之间最近的项目开关。
Git 之外只检查当前目录。项目 `manual` 可以关闭个人 `auto` 默认。
配置损坏时停用自动路由，不回退到已开启的个人默认。

开关与模型映射分开保存。脚本不会覆盖未归属 OMS、格式错误或符号链接配置。
卸载插件保留开关；删除经核对的项目配置后，恢复个人默认。
执行结果同时显示写入范围和当前有效模式，避免被更近的项目配置覆盖后误报启用。

## 验证 hook 与实际路由

插件自带短 `SessionStart` hook，只在 auto 模式注入入口提示。
Codex 包使用 `.codex-plugin/plugin.json` 显式声明 hook，移除会遮蔽原生 hook
的根目录 `plugin.json`；该行为已在 Codex 0.160.1 验证。
安装不等于 hook 已信任；支持的 Codex 界面中，通过原生 `/hooks` 审阅并信任当前定义。
不自动跳过信任。没有 hook 能力时保留显式入口。
`oms-auto` 自身在使用前再次检查开关，当前会话切换 manual 后该入口也停止路由。
这依赖模型执行入口契约，不是宿主对其他隐式 Skill 的强制禁用。

允许隐式选择不保证模型每次都会选中。需要分别检查：配置生效、hook 实际执行、
没有提 Skill 名称时的选择、真实改动与检查结果。CLI 验收不证明 Desktop 或 IDE 的行为。
CLI 跟进验收已观察到已安装插件在启动、恢复和压缩后执行 hook，
并验证 API 指定的 clear 来源。manual 模式不注入提示，翻译请求不调用工具。
这些是限定任务的观察，不代表每次都会选中。完整路径与支持边界见
[英文指南](../automatic-routing.md)。
本次 CLI 观察与未验证边界见
[验收记录](../codex-auto-routing-0.10.0-acceptance.md)。

## Claude Code 适配

加载含此适配的插件后，运行 `/oh-my-stack:setup-oh-my-stack`，选择开启、关闭
或保持现状，再选择个人默认或仅当前项目。完成选择后保存设置，无需另写开启指令。
路由设置不探测模型，不修改模型或推理强度配置；默认仍为手动模式。

命令行检查和预览必须显式选择 Claude 运行时：

```bash
node /path/to/installed/oh-my-stack/scripts/routing.mjs status --runtime claude-code
node /path/to/installed/oh-my-stack/scripts/routing.mjs set --runtime claude-code --scope user --mode auto
node /path/to/installed/oh-my-stack/scripts/routing.mjs set --runtime claude-code --scope user --mode auto --apply
```

个人设置位于 `$CLAUDE_CONFIG_DIR/oh-my-stack/routing.json`，未设置时使用
`~/.claude/oh-my-stack/routing.json`。配置目录必须是绝对路径。项目覆盖使用
`.oh-my-stack/routing.claude-code.json`，与 Codex 的 `routing.json` 分开，
互不覆盖；项目设置优先于个人默认，错误配置停用自动路由。

Claude 插件通过 `hooks/hooks.json` 注册 `SessionStart`。开启时，在启动、恢复、
清空和压缩后注入 `oms-auto` 入口提示；进入自动入口时再次检查开关。显式 Skill、
跳过 OMS、限定子任务和原有授权边界优先；闲聊、翻译及工具使用问答不进入工程执行。
通过 Claude 的 `/hooks` 检查插件 hook，遵守宿主权限设置，加载插件后启动新会话。
不绕过权限，也不自动改写宿主设置。
`--plugin-dir` 只验证本地包，不证明已安装版本更新。配置保存、hook 执行和实际选择
工作流需要分别验证。完整路径和验证方式见[英文说明](../automatic-routing.md)。
