# OMS 2.0.0 本地验证

验证日期：2026-11-16。上游基线为 pstack-claude 0.9.138，提交
`a12b04786023e762f12f5de7bb5fafb8c23f8c36`。
此记录描述工作分支的本地结果，不表示远程仓库、Release 或个人插件安装已经更新。

## 源码与夹具

- Bun 1.4.4，Apple Silicon macOS。根目录与 plugins 的依赖均按上游锁文件安装。
- `bun tools/generate.mjs --check` 通过，56 个生成文件一致；技能链接、运行时包装、模型和 hooks 校验通过。
- 使用与上游 CI 对齐的 Node 24.22.1 运行 `bun test tests/`：2052 pass、160 skip、0 fail，64 个测试文件。
  包括三项 OMS 测试：两处读取入口丢失后的检测和重建、缺失映射的链接校验、marketplace 与技能命名空间一致性。
- 本机原有 Node 22.23.4 会在上游 SQLite 用例中输出 ExperimentalWarning，违反空 stderr 断言。
  使用官方归档的临时 Node 24.22.1 后完整测试通过，未更改系统 Node 或测试断言。
- pstack、cursor-team-kit、thermos 三个固定提交的 `tools/sync.mjs --dry-run` 均退出 0；`--check-rules` 退出 0。
- markdownlint-cli2 0.18.1 通过，0 error；当前及归档文档的相对文件链接目标均存在。
- 与基线逐字节比较：上游 models.json、hooks 和 poteto-mode/playbooks 没有变化。
  两个现有技能文件仅增加条件 T3 读取入口；其余新运行时内容为 T3 映射与适配许可证。
- 旧 docs 归档及书籍授权与改造前文件逐字节一致。旧配置说明及其引用目标作为历史材料保留。

Node 24.22.1 的 darwin-arm64 官方归档 SHA256 为
`89c682593d76cd44233fa53b1563264e7de9cbb189cad169135c5b4fadfbc0a7`，
下载时对照 nodejs.org 的 SHASUMS256.txt 校验。临时运行时不作为项目依赖提交。

## 原生宿主

Codex CLI 0.169.0 在独立临时 CODEX_HOME 中，从本仓库本地路径添加 marketplace `oms`，
安装 `pstack@oms` 成功，返回版本 2.0.0。未读取或复制个人登录凭据。
随后启动同一隔离目录下的 Codex app-server，仅执行 initialize 和 skills/list：
发现 67 个启用的 OMS pstack 技能，errors 为空。poteto-mode 和 bro 的实际路径属于
`plugins/cache/oms/pstack/2.0.0/`。未发起模型回合。

Claude Code 2.1.325 的 `claude plugin validate ./plugins/pstack` 通过。
此命令只做本地插件校验，不代表原生安装、完整目录扫描、模型行为或 T3/Claude 会话验收。

## 验证边界

上游按平台和可用依赖跳过的 160 项测试保留原行为；不把 skip 算作通过。
本轮未执行真实模型、子代理、T3 交互任务或个人宿主切换，未验证 Windows 原生安装。
CI 工作流沿用上游，但本轮没有推送或触发远程 CI。
原始测试、同步和本地校验日志位于本机临时目录，不能视为长期发布凭据。
