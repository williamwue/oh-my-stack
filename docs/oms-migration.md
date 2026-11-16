# 从 OMS 1.x 迁移

OMS 2.x 使用宿主原生插件机制，选择器为 `pstack@oms`。
旧 OMS 管理的 pstack 选择器通常为 `pstack@pstack-claude`，来源可能是本地适配包。
新版源码没有安装、卸载或自动迁移副作用。

## 切换步骤

1. 在正在使用的 Codex 或 Claude 后端列出插件，确认旧插件的选择器、作用域、来源和配置目录。
   保留个人 `pstack-models.md`、AGENTS.md 或 CLAUDE.md，以及 hook 偏好。
2. 确认哪些 Codex、Claude 和 T3 会话共用该插件。先在隔离宿主目录验证新版，
   再通过旧宿主的原生禁用功能停用旧 pstack。不要同时启用两套同名技能。
3. 通过原生 marketplace 安装 `pstack@oms`。使用本地分支验证时注册其绝对路径；
   使用远程仓库时先确认该远程分支已包含新版。
4. 按宿主要求完成 hook 信任并新开会话，检查 poteto-mode 和 bro 等技能的实际路径。
   路径应属于 OMS 新来源；在 T3 中确认能够读取 t3-tools.md。
5. 分别记录安装、技能发现和代表性任务调用结果。只有新会话验证通过，才考虑清理旧插件。
   多个目标共用旧插件时，全部迁移前保留旧安装。

失败时停用新插件并重新启用旧插件。旧版管理记录和本地包保留，避免失去回退依据。
这份迁移说明不要求删除 marketplace、其他插件或个人文件。

## 保留的数据

- 个人模型表、全局指令、hook 信任、原生登录和其他插件保持原样。
- AIHero 不再由 OMS 管理，但其现有原生安装保留。
- 已下载的电子书、阅读入口和个人笔记保留。
- 旧版安装记录和适配包保留，新的插件不读取它们。

macOS 的旧默认数据目录为 `~/Library/Application Support/oh-my-stack/`，
Windows 为 `%LOCALAPPDATA%/oh-my-stack/`；历史或自定义安装可能使用其他目录。
修改源码不会删除这些目录，也不会改写 CODEX_HOME 或 CLAUDE_CONFIG_DIR。
书籍授权与旧版验收记录见 [归档](oms-history/README.md)，其中的旧安装命令仅作历史证据。
