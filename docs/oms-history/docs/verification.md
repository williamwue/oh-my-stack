# 首版本机验证

验证环境：Windows PowerShell 5.1、Git、Codex CLI。首次生命周期测试使用隔离目录；
后续实际宿主安装及发现验证单独记录如下。

## 自动化回归

`./tests/run.ps1` 创建本地 Git 上游夹具、假的 Codex/Claude CLI 和独立状态目录。
覆盖工具/环境选择、安装计划的自定义分支、默认 T3 适配、多运行时覆盖、
共享安装、重复安装、来源切换、注册失败后的旧安装恢复、缓存修改、禁用状态、混合成功/失败
报告、最后一个环境的卸载和书籍文件归属。测试不联网、不调用模型。
发布前新增书籍下载失败后的归属记录、临时文件清理与重试覆盖，共 33 项断言通过。

## 实际安装

使用独立且已创建的 `CODEX_HOME` 和 `-StateRoot`，调用真实 Codex CLI：

- pstack 原版提交 `22b5e137` 在本地准备，自动加入 T3 映射；原生版本为 0.9.112。
- Codex 和 T3 共用一份 pstack 安装。原始模型文件未改，两个读取入口只有适配插入。
- AIHero 原生插件 1.3.2 安装成功。
- 原生列表报告 Codex 插件已启用；T3 行保留“待重启验证”，不宣称真实会话已加载。
- `update pstack -Environment t3` 成功切换到新的适配包路径，再次查询原生列表确认来源和版本。
- 取消 AIHero 的 T3 关联后，Codex 仍启用同一插件；T3 显示未独立配置。

临时 Codex 目录会触发“不创建 PATH 辅助程序”提示，不影响上述插件命令。

## 当前真实宿主验证（2026-10-30）

原生插件列表与 OMS 状态最初均确认 pstack、AIHero 未安装，当前会话的 skills
目录也未列出两者。之前的隔离安装不等于当前宿主已安装。

随后执行 `./oms.ps1 install -Component pstack,aihero -Environment codex,t3 -Yes`，
安装到实际 `CODEX_HOME=G:\AIData\codex`，使用默认 OMS 状态目录。
没有移除其他插件；本次操作增加了两个插件的原生安装配置。

使用临时 Codex app-server 连接进行只读协议检查，不创建对话、不调用模型：

- `initialize`：clientInfo 为 `oms-skill-verification` / `1.0.0`，experimentalApi 为 true。
- `skills/list`：`{"cwds":["G:/Projects/oh-my-stack"],"forceReload":true}`。
- 返回 pstack 67 项、AIHero 27 项，均 enabled，errors 为空。
- 可发现的实际名称包括 `pstack:poteto-mode`、`pstack:bro`、
  `mattpocock-skills:ask-matt` 和 `mattpocock-skills:wait-what`。
- 安装缓存中 T3 映射的 SHA256 与仓库文件一致，poteto-mode 和 codex-tools
  的读取入口均存在；本会话已读取安装缓存内的映射。

本会话手动读取 `pstack:bro`、`mattpocock-skills:wait-what` 的 SKILL.md，
按其要求完成只读改写试用。该结果证明指令可读取和执行，不证明旧会话自动发现。
临时协议原始证据位于 `G:\DevCaches\Temp\oms-native-skills-evidence.json`。

发布前在正式 OMS 数据目录重新运行安装，pstack 和 AIHero 复用现有管理记录，
并成功下载中英文 PDF、EPUB 共四个文件。四个文件逐一通过目录中的 SHA256。
Codex 原生列表没有旧 `oh-my-stack` 聚合插件，缓存目录也没有旧市场；没有删除其他插件。

验收须区分：真实安装和新运行时发现已通过；当前既有 T3 会话的 skills 目录
刷新及自动调用尚未通过。不能把读取磁盘文件、调用 orchestrator_capabilities，
或在 ALL_TOOLS 中查找插件名称当作自动加载验收。

## 未覆盖范围

本机未安装 Claude Code，其命令及 JSON 结构使用模拟验证。尚未在新启动的 T3
会话中调用模型或验证派发。其他操作系统和其他 Agent 不属于首版验收范围；
没有安装 WSL。除本次明确记录的两个插件安装外，未主动改写个人模型设置、
移除其他插件或修改远端仓库历史。
