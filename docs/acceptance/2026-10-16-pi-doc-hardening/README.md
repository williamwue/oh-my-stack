# Pi 与文档事实检查：2026-10-16

本记录验证 [pstack-claude 研究](../../maintainers/pstack-claude-assessment-2026-10-16.md)
建议的第一批改进。基线为 OMS `233519e`，源码候选仍为0.19.0，官方 pstack
仍固定为0.15.25 / `99743e9c151c8537cbbf1f98bb38f34ef3368453`。
官方 pstack 仍是唯一工作流语义来源；本批未引入 pstack-claude 源码或工作流政策。

## 改动与机制

- [Pi transport](../../../tools/pi-delegation.mjs) 在分发前验证 RPC 对象、已消费的响应和
  assistant 内容。异常消息返回失败，不再逃出事件回调或静默完成。
- 观察到直属子进程退出后，最多等待250ms排空管道。超时记录失败并关闭本地句柄。
  停止仍等待直属子进程实际退出；重复停止或终止只产生一次失败。后代进程不在此次终止范围内。
- [文档检查器](../../../tools/check-doc-facts.mjs) 只读核对六份文档中的明确当前摘要，
  事实来自项目版本、有效来源清单与收据、官方快照和默认生成目录。
  缺失或重复的必要事实失败；历史章节、已安装版本与已发布版本不被改写。
- 修正 Pi 安装页与中文 README 的旧版本说明，并将检查接入 `npm run docs:check`。
  四个目标中的 Pi helper 均通过生成器更新。

本批没有修改 `src/core`、`upstream`、`src/adapters` 或生成器，也没有推进来源 pin。
官方更新规划器、工作树审计与 PR 分页仍是后续独立单元。

## 失败到通过

父任务在修复前、修复后均运行研究报告内的原始进程复现。修复前输出：

```json
{"probe":"null","exitCode":1,"error":"TypeError: Cannot read properties of null (reading 'type')"}
{"probe":"descendant","directAlive":false,"descendantAlive":true,"stopResolved":true}
{"probe":"inherited-pipes","directAlive":false,"descendantAlive":true,"stopResolved":false}
```

修复后原复现退出码为0，输出如下。该脚本只在 null 子进程失败时打印 null 行：

```json
{"probe":"descendant","directAlive":false,"descendantAlive":true,"stopResolved":true}
{"probe":"inherited-pipes","directAlive":false,"descendantAlive":true,"stopResolved":true}
```

父任务另外读取 null 探针的 transport 结果，确认它产生明确失败且父进程可继续：

```json
{"probe":"null","parentUsable":true,"code":null,"signal":"SIGTERM","failure":"Pi emitted invalid RPC message"}
```

测试先于修复提交：`1692fa1c9d9663931b994556a5beaaea9ce31d4d`。
父任务把该提交的 transport 与三个测试文件复制到临时目录重跑，退出码1：

```text
# tests 35
# suites 0
# pass 5
# fail 30
# cancelled 0
# skipped 0
# todo 0
```

最终实现中，Pi adapter22项、RPC robustness35项、文档事实13项全部通过。
测试包括异常 envelope、响应和文本片段、父进程恢复、分段 UTF-8、尾部不完整 JSON、
继承 stdout/stderr、直属子进程延迟退出、重复停止、取消状态和启动失败。
测试 fixture 在 finally 中清理自身创建的后代和临时目录。

父任务将两份文档恢复为基线字节到临时目录，新检查器给出以下失败；当前文档通过：

```text
before: exit=1
docs/pi-install.md: Pi source scope is 0.15.0; expected current source
README.zh-CN.md: Pi installation row must link to current source scope without a release version
after: exit=0
Current documentation facts agree with source 0.19.0, pstack 0.15.25, and 78 public Skills.
```

## 本机 Pi 与完整检查

环境：macOS arm64，Node22.23.3，zlib1.2.12，已安装 Pi1.2.0。
父任务执行以下命令，全部退出码0：

```sh
npm run generate
npm run check
node tools/pi-native-acceptance.mjs --binary pi --package packages/pi
```

实际 Pi 验收使用本机 `pi` 可执行文件的绝对路径、临时独立配置和 localhost 模拟 provider，
没有使用真实账号或远程模型服务。结果保存在 [native-result.json](native-result.json)：
原生扩展发现、start/collect、子任务正常完成、取消后进程退出、父会话关闭清理、
隐藏重试拦截均通过；模拟服务只收到一次重试场景请求。
选择与观察均为 `oms-local/child`、thinking `off`，原生临时设置保持原字节。

完整检查通过生成一致性、文档事实、12份 conformance 记录、8个可复现发布输出、
仓库校验、书籍校验、Markdown lint 和测试：713项，711通过，0失败，2跳过。
两项跳过要求固定发布运行时；本机 zlib 与发布 pin 不同。此处不声称已通过这两项。

Windows 未实测，真实 Pi bash 后代继承管道的可达性未证实，真实账号/模型归因未测试。
本记录不构成安装、发布或生产验收。

## 独立审阅与归因

独立审阅结论为 **PASS — No findings**，独立运行70项相关测试全部通过。
审阅前后14份实现文件的 SHA256 均匹配 [冻结清单](reviewed-files.json)。
审阅没有修改文件；本机 Pi 模拟服务验收由父任务执行，未当作审阅者独立执行的证据。

三个委派任务均使用现有配置及准备器选择。T3 报告的 provider/model 与请求一致：

| 单元 | 请求 provider/model | 请求 reasoning | T3 报告 provider/model |
| --- | --- | --- | --- |
| 文档实现 | codex / gpt-6.1-sol | low | codex / gpt-6.1-sol |
| Pi 实现 | codex / gpt-6.1-sol | xhigh | codex / gpt-6.1-sol |
| 独立审阅 | codex / gpt-6-astra | high | codex / gpt-6-astra |

实现任务还请求 standard service tier。reasoning 与速度选项未取得独立运行时证明，
准备器的观察结果为 `requestedOptionsVerified:false`；模型名称一致不代表这些选项已被证实。
