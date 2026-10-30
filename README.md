# Oh My Stack

OMS 是一个面向个人开发者的 Windows 开发环境启动包：选择认可的工具、Skills
和阅读资料，安装到本机已有宿主，并查看它们是否已安装、启用。

## 快速开始

需要 Windows PowerShell 5.1 或 PowerShell 7，以及已安装的 Codex 或 Claude Code
CLI。安装插件使用宿主的原生命令；OMS 不安装代理宿主、不处理账号密钥。

```powershell
git clone https://github.com/williamwue/oh-my-stack.git
cd oh-my-stack
./oms.ps1 list
./oms.ps1 install                   # 交互选择组件
./oms.ps1 status
```

如果本机执行策略阻止脚本，可只为这次进程指定执行策略：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./oms.ps1 list
```

明确指定安装内容，适合脚本或新机器配置：

```powershell
./oms.ps1 install pstack -Runtime codex -T3
./oms.ps1 install aihero -Runtime codex
./oms.ps1 install pstack-book
./oms.ps1 status -Runtime codex -Json
./oms.ps1 configure pstack
./oms.ps1 update pstack -Runtime codex
./oms.ps1 update                    # 更新所选宿主上由 OMS 管理的组件及书籍
./oms.ps1 uninstall aihero -Runtime codex
```

默认优先选择已有 Codex，其次 Claude Code；可用 `-Runtime` 明确选择。
安装后重启宿主，按 `configure` 输出完成模型或项目配置。已有插件会复用，
但不会自动纳入 OMS 管理；OMS 拒绝更新或卸载没有管理记录的插件。

## 收录内容

- **pstack-claude**：整体采用上游工作流、模型和配置规则。`-T3` 选择独立的
  [T3 薄 fork](https://github.com/williamwue/pstack-claude-t3)，不在安装缓存中打补丁。
- **AIHero**：[Matt Pocock Skills](https://github.com/mattpocock/skills) 官方插件，
  保留独立名称和命名空间，不抽取并混入 pstack。
- **pstack 书籍**：安装本地 `reading.md` 阅读入口。需要离线文件时，加
  `-DownloadBooks` 下载中英文 PDF、EPUB 并验证固定 SHA256。
  书籍保留独立授权、译文说明和历史校审记录，不套用 OMS 的 MIT 许可证。

```powershell
./oms.ps1 install pstack-book -DownloadBooks
./oms.ps1 configure pstack-book -Open
```

书籍是已发布的历史阅读版本，与当前 pstack 实现并非逐项对应。

## 管理边界

组件清单在 `catalog/`；原生安装适配在 `installers/`。OMS 不携带第三方 Skill
源码，不重写工具的工作流、角色、模型策略或触发规则，也不自动修改
`AGENTS.md`、`CLAUDE.md`、个人模型表及项目配置。

安装记录与书籍位于 `%LOCALAPPDATA%/oh-my-stack/`。`-StateRoot` 可以指定独立目录，
它只改变 OMS 自身的记录和书籍位置，不隔离宿主配置。测试插件安装时还需使用
宿主原生的隔离目录，例如 Codex 的 `CODEX_HOME`。

安装、更新和卸载调用宿主原生 CLI。卸载保留市场注册，OMS 不直接编辑个人模型表
或项目配置；插件缓存及宿主内部记录按原生卸载规则处理。Claude 使用
`--keep-data` 保留插件数据。更新遵循原生宿主语义，实际版本由 `status` 查询，
目录中的审核提交不代表宿主已锁定该版本。若需从原版切换到 T3 版，请显式卸载
已管理的 pstack 后再安装；不会静默替换来源。

旧 `oh-my-stack` 聚合插件不会自动删除。迁移时先检查是否有重复的 Skills，
自行确认卸载旧插件，再使用各组件的原生命名空间。

## 开发与验证

```powershell
./tests/run.ps1
```

测试使用临时目录和假的宿主 CLI，覆盖安装、状态、重复执行、配置保护、更新、
卸载和命令失败。真实宿主验证与模拟测试分开记录；不支持的平台不要求验证，
也不为此安装 WSL 或其他运行环境。

首版本机实测范围见 [验证记录](docs/verification.md)。

OMS 自有代码采用 MIT 许可证。各组件的许可证和内容授权归其作者。
