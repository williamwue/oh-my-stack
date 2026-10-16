# 官方 pstack 更新规划器验收：2026-10-16

本批实现 [研究建议](../../maintainers/pstack-claude-assessment-2026-10-16.md)中的官方更新规划入口。
开发基线为上一批提交 `5c55311`，实现冻结于
`dba7f9ebd1d022311062d6ede754e910b6e503d0`；文档说明修正于
`e184d84708c33b7bfa1c1338350f2a9fb76a0127`。
源码候选仍为0.19.0，官方 pstack pin 仍为0.15.25 / `99743e9`。

## 实现范围

- [规划器](../../../tools/plan-pstack-update.mjs) 读取 schema-2 imports、完整官方收据、
  精确派生与本地已提交 Git 对象，输出 JSON 预览。
- [派生工具](../../../tools/derive-pstack.mjs) 提取共享的只读准备过程，使规划器复用
  现有来源、路径、hash 与替换规则校验。原派生写入/检查接口及生成内容保持一致。
- 规划列出增删、模式变化、source-only/derived 所有权、顺序替换锚点计数、拟生成 hash、
  本地输出状态、新 Skill/role 元数据待审项、分发目标与必要检查。
- 锚点失配、本地输出变化/缺失、删除冲突、路径碰撞和不支持的 Git 项产生阻断。
  参考 fork 不能作为官方输入；候选必须是当前官方 pin 的后代。

该工具没有 fetch、应用、合并、接受更新、安装或发布入口，未推进来源 pin。
未修改 `src/core`、`upstream`、`src/adapters` 或生成包的字节。
使用方法与状态含义见 [维护指南](../../maintainers/pstack-update-planner.md)。

## 父任务检查

macOS arm64，Node22.23.3。以下检查退出码均为0：

```sh
node --test tests/pstack-update-plan.test.mjs tests/parity-contract.test.mjs
npm run generate
npm run check
```

相关测试36项全部通过，其中规划器新增25项。完整检查738项：736通过、0失败、2跳过。
两项跳过要求固定发布运行时；本机 zlib1.2.12不符合该 pin。
生成一致性、文档事实、conformance、发布可复现、仓库校验、书籍校验及 Markdown lint 均通过。
最后的文档说明修正与本验收记录另外运行 Markdown lint、文档事实和仓库校验。

行为 fixture 使用本地 Git 仓库、真实旧/新提交、schema-2收据和精确派生，覆盖：

- 同 pin 的确定性预览，官方文本及二进制资源变化，Git 模式变化。
- 锚点缺失/重复与顺序替换，新 Skill/role 自动列入元数据待审项。
- 删除已派生来源与本地编辑冲突，本地输出修改/缺失。
- 候选和本地路径的大小写/Unicode 碰撞，候选符号链接、submodule 和非 UTF-8 派生文本。
- 未提交候选字节不进入计划，参考 fork、无关历史、不完整收据、历史快照漂移、路径逃逸被拒绝。
- CLI JSON、0/1/2退出状态、未知/重复/缺值参数被拒绝，且不存在 apply 参数。

预览或拒绝前后比较整个 fixture 的文件 hash，包括 OMS、历史材料、候选工作文件及 `.git`。
这些断言验证零写入，不只验证 pin 未变化。

## 官方 Git 对象实跑

父任务另在临时 Git 根目录中，从官方 `https://github.com/cursor/plugins.git`
单独取得当前 pin 的对象，再调用规划器。网络获取发生在准备阶段，规划器本身没有获取对象。
候选 revision 与当前 pin 相同；结果为 `unchanged`，169份完整官方文件、167份精确派生、
零问题与零元数据待审项，四个目标均列出。

[实际观察记录](actual-observation.json)绑定实现提交、输入 revision、结果摘要、计划 hash，
以及运行前后3551个 OMS 已跟踪文件和23个官方 Git 输入文件的聚合 hash。
两侧字节均无变化，且连续两次输出 JSON 相同。

该实跑验证当前 pin 的完整来源及真实 Git 读取路径；新版本升级和故障分支由 fixture 验证。
没有查询或声称最新远端版本，没有实际更新候选、原生模型执行、安装或发布。
Windows/Linux 未实测。

## Standards

第一轮规范审阅独立跑通25项新测试，提出1项 P3 文档问题：指南声称会拒绝冲突标记，
但规划器只验证已声明锚点，不提供通用冲突标记扫描。父任务接受该意见并在 `e184d84`
明确预览不合并或接受更新，锚点匹配不证明周围正文正确。
第二轮独立确认该意见已解决、无新问题，并核对实现字节未变。剩余问题0项。

## Spec

需求审阅独立核对固定七文件 diff、研究建议及维护指南，独立运行25项规划器测试全部通过。
未发现需求缺失、实现错误或范围扩张问题。问题0项。

## 委派归因

[审阅记录](reviews.json)分别保留两条轴及规范复核，未把父任务的完整检查或官方对象实跑
记作审阅者独立执行。记录中仅移除本机仓库绝对路径前缀，保留意见、任务身份和角色政策。
三次请求和 T3 报告均为 `codex / gpt-6-astra`，请求 reasoning `high`，没有替换。
选项未取得独立运行时证明，观察结果均为 `requestedOptionsVerified:false`。
