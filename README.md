# Oh My Stack

OMS 是 Windows 开发环境启动包：选择工具，检测本机环境，统一完成安装和管理。
不需要分别查找仓库、插件市场或手动复制 Skills。

## 开始使用

需要 Windows PowerShell 5.1 或 PowerShell 7；安装 pstack 还需要 Git。
对应开发宿主应已安装，账号登录及原生安全授权由用户完成。

```powershell
git clone https://github.com/williamwue/oh-my-stack.git
cd oh-my-stack
./oms.ps1
```

也可以下载 [1.0.1 安装包](https://github.com/williamwue/oh-my-stack/releases/tag/v1.0.1)，解压后运行脚本。
当前版本为 1.0.1；[发布与旧版迁移说明](docs/release-1.0.0.md)。

界面默认勾选 pstack 和 AIHero，可切换选项。随后自动检测已有环境，展示计划。
确认后安装；输入 `c` 可自定义目标环境。T3 Code 与 Codex、Claude Code 并列，
选择 T3 不要求额外勾选 Codex。OMS 覆盖本机可用的 Codex/Claude 运行时，
并与独立选择的环境复用安装，不重复注册共享插件。

明确指定内容，适合自动化：

```powershell
./oms.ps1 install -Component pstack,aihero -Environment codex,claude,t3 -Yes
./oms.ps1 install pstack-book -Yes
./oms.ps1 install pstack-book -DownloadBooks -Yes
./oms.ps1 install -Custom
./oms.ps1 list
./oms.ps1 status
```

执行策略阻止脚本时，可仅为本次进程指定策略：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./oms.ps1 list
```

## 收录工具与环境

- **pstack**：获取 pstack-claude 原版，在 OMS 管理的目录中自动加入 T3 映射及
  必要读取入口，再使用宿主原生插件机制注册。所有 pstack 安装默认包含适配，
  只有 T3 会话读取它；没有独立的 T3 仓库、安装开关或额外手动配置。
- **AIHero**：独立安装 Matt Pocock 官方插件，不裁剪或混入 pstack。
- **pstack 书籍**：独立安装阅读入口；可选下载中英文 PDF、EPUB 并验证 SHA256。
  保留原文、译本、授权记录及历史阅读版本说明，不注入代理上下文。

首版环境为 Codex、Claude Code、T3 Code。没有安装宿主的显式选择会报告失败，
其余独立任务仍继续，不把未完成的环境报告为成功。T3 注册后显示待重启/验证，
不把插件注册等同于真实代理会话验收。后续环境按各自可验证的安装方式增加。

## 日常管理

```powershell
./oms.ps1 status -Environment codex,t3 -Json
./oms.ps1 configure pstack
./oms.ps1 configure pstack-book -Open
./oms.ps1 update -Yes
./oms.ps1 uninstall pstack -Environment t3 -Yes
```

`configure` 提供各工具的原生设置指引，不自动重写个人模型表或项目说明。
更新先准备新包并应用、检查适配，然后切换注册；失败时尝试恢复原注册，
保留旧包及管理记录。切换 pstack 的本地市场路径时，先注销受管理的旧插件和市场，再注册新包；
如果该市场还有其他插件，停止切换。上游入口变化会明确报错，不强行修改。

OMS 不自动接管已有的同名插件；发现冲突时保留原安装并给出处理说明。
从旧 OMS 聚合插件迁移时，请先检查宿主插件列表，明确处理旧插件，避免重复
加载同类 Skills。旧插件和旧版管理记录不会自动迁移或删除。
插件卸载只处理受管理的安装，保留市场注册；Claude 使用 `--keep-data`。
多个目标共用一份插件时，取消一个目标只移除其管理关联，直到最后一个关联
被移除才执行原生卸载。共享底层插件仍可能在其他会话中可见。

## 文件与版本

组件目录在 `catalog/tools/`，目标环境在 `catalog/environments/`，T3 文件在
`integrations/pstack/`。仓库不保存整份第三方源码。pstack 默认安装目录中审核的
提交，`update` 获取上游 main 的新提交并重新适配；AIHero 遵循宿主原生更新方式。

准备好的包、安装记录、书籍保存在 `%LOCALAPPDATA%/oh-my-stack/`。
`-StateRoot` 可以改变 OMS 数据位置，但不隔离宿主配置。做真实安装测试还需
设置宿主原生隔离目录，例如独立且已创建的 `CODEX_HOME`。

本地适配包通过路径注册，因此由 `oms update` 管理更新。原始许可证与作者
声明保留在下载的包中；书籍不适用 OMS 自有代码的 MIT 许可证。

## 验证

```powershell
./tests/run.ps1
```

测试使用本地 Git 夹具和假的宿主 CLI，不联网、不调用模型、不修改个人配置。
真实宿主测试单独记录。不支持的环境明确跳过，不安装 WSL 来满足验证。
