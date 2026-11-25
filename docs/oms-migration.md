# 迁移到 OMS 3.0

OMS 3.0 只有一个插件 `pstack@oms`，T3 和原生宿主都安装它。`t3-pstack@oms` 已经移除。

## 从 OMS 2.x 迁移

1. 在 T3 使用的每个后端列出插件，记下 `pstack@oms` 和 `t3-pstack@oms` 的启用状态、作用域和配置目录。
2. 用宿主的原生命令停用 `t3-pstack@oms`。两个插件不要同时启用，否则两个 session-start hook 都会触发，同名技能也会冲突。
3. 运行 `npx -y oh-my-stack@latest install`，然后运行 `doctor`，确认每个后端都显示本次安装的版本 且所有检查通过。
4. 在新的 T3 会话中运行 `pstack:setup-pstack`，写入 `~/.config/t3-pstack/models.md`。OMS 2.x 的 `~/.t3/pstack-models.md` 和项目内的 `.agents/pstack-models.t3.md` 不再读取，也不会被删除。要沿用其中的选择，在 setup 询问时按新格式填写：`<provider>/<model> @<effort>` 改为 `<provider>/<model> <选项>=<值>`，选项名以 `orchestrator_capabilities` 列出的为准，例如 Claude 用 `effort`，Codex 用 `reasoningEffort`。
5. 在新会话中跑一个有明确范围的任务，核对子任务实际使用的 provider、模型和 effort。确认无误后，再用宿主命令卸载 `t3-pstack@oms`。

如果出现问题，停用 `pstack@oms`，重新启用 `t3-pstack@oms`。

## 从 OMS 1.x 或其他 pstack 迁移

旧 OMS 管理的选择器一般是 `pstack@pstack-claude`。先在隔离的宿主目录验证 `pstack@oms`，再用原生命令停用旧插件。共用旧插件的目标全部迁完之前，保留旧安装。

## 保留的数据

- 个人模型表、全局指令、hook 偏好、原生登录和其他插件保持原样。安装器只会移动 `t3-pstack-models.md`，并在原位置留下指向新路径的链接。
- AIHero 不再由 OMS 管理，已有的原生安装保留。
- 已下载的电子书、阅读入口和个人笔记保留。macOS 的旧数据目录为 `~/Library/Application Support/oh-my-stack/`，Windows 为 `%LOCALAPPDATA%/oh-my-stack/`。

书籍授权与旧版验收记录见[归档](oms-history/README.md)，其中的旧安装命令仅作为历史证据保留。
