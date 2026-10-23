# pstack-claude 增量借鉴评估：2026-10-23

## 范围与结论

研究参考仓 `michael-denyer/pstack-claude` 的 **0.9.86 → 0.9.102**，固定区间为
[`1dba27e50e8f18f146bb80f137f0690f8d773c2e…356c6e0f978df729eb16f227d795f34d221c5aad`](https://github.com/michael-denyer/pstack-claude/compare/1dba27e50e8f18f146bb80f137f0690f8d773c2e...356c6e0f978df729eb16f227d795f34d221c5aad)。
对照对象是 OMS **当前工作树**，不是仅看 HEAD `00fb1ff5365ce7f9a325c9be7fe0dae715c5590a`。
工作树已升级官方 pstack **0.15.30 / `4ec7ffa173eaa70d3d9467a627baf0954645a353`**，默认公开目录为81项。
官方已有的形式化验证技能等不计作参考仓创新。本报告延续[上次评估](pstack-claude-assessment-2026-10-16.md)，但不沿用已修复缺口。

值得借鉴，优先级如下。所有建议均未实施。

| 建议 | 判断与用途 |
| --- | --- |
| **adapt：修复 Markdown 角括号目标解析** | 父任务已证明 OMS 拒绝合法链接；采用正负控制修复具体解析缺陷。 |
| **adapt：工作树 reflog 保留分类** | 父任务实际 Git fixture 证明，仅 HEAD reflog 可达的提交仍可能得到 advisory candidate。补保留原因，保持人工清理边界。 |
| **recommend：会话身份优先的 transcript 定位** | 新增可执行 helper，解决 shell 切换目录及自定义配置路径；适合作为原生 Claude 适配后续。 |
| **adapt：比较工具 known-bad 校准** | 明确要求语义负控；应落到具体比较器，不能把增加提示词称为强制校准。 |
| **adapt，低优先级：原生 Claude 单次 effort** | 参考仓删掉 effort 包装 agent；当前 T3 已传 options，跟进范围是原生适配及有效值证据。 |
| **skip：复制整套策略或自动清理** | 不引入参考仓作为第二工作流语义来源，不引入自动删工作树/强删分支。 |

## 新增实现：transcript 目录、会话身份与自定义路径

0.9.98–0.9.101 连续修复硬编码路径及“当前 cwd 等于会话起点”的假设。
[新 helper][ref-dir] 首先在配置目录的 `projects/` 下按 `CLAUDE_CODE_SESSION_ID` 查找
`<id>.jsonl` 或 `<id>/<id>.jsonl`；只有空的 `<id>/` 不算命中。
它枚举目录和检查文件名，不读取其他项目的聊天内容。显式 workspace 参数则跳过当前会话身份，定位指定起点。

回退实现包括 `CLAUDE_CONFIG_DIR`、受约束的 `CLAUDE_CODE_PROJECT_DIR_NAME`、ASCII 字母数字以外字符替换、长路径200字符截断和哈希；精确目录缺失时只接受唯一前缀匹配。
这比旧版手工将 `/` 替换为 `-` 更完整。[测试][ref-dir-tests]覆盖切换到另一项目、嵌套 transcript、Workflow 空目录诱饵、无效会话 ID、长路径歧义和显式起点。

**证据边界：**哈希与命名规则注明来自 Claude Code 2.1.296 的观察，不是本轮独立验证的稳定宿主 API。
同一 session ID 如果出现在多个目录，源码取首个命中，没有歧义拒绝；ID 无命中则回退 cwd，仍不能证明结果属于原会话。
OMS 若适配，应输出定位依据与未确认状态，优先使用宿主直接提供的 transcript 路径；避免把回退目录当成已验证会话身份。

[替换清单][ref-substitutions]同时把用户技能路径改为 `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills/`，
插件路径改为 `${CLAUDE_CODE_PLUGIN_CACHE_DIR:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins}/`。
这些主要是提示词路径修正；[路径一致性测试][ref-config-tests]验证文本不再出现旧拼法，不能证明所有真实安装方式可用。
OMS 已在 [model-resolution](../../tools/model-resolution.mjs#L33) 和 routing/configuration 中支持 `CLAUDE_CONFIG_DIR`，不是全面缺失自定义配置目录。
本轮定向搜索未找到 OMS 对应的 session-ID transcript 定位器或 plugin-cache 环境变量映射。
当前[原生 Claude 绑定](../../packages/claude-code/docs/runtime-binding.md)也未声明该 helper；不能直接运行 reference helper 就声称安装产物已支持。

## 原生 Claude effort：值得简化，但要区分来源

参考 0.9.95 的[生成器][ref-effort]改为 `Agent.effort`，保留原 `subagent_type`，删除十个 effort 包装 agent；
其[变更记录][ref-changes]报告最低版本2.1.292，并记录2.1.296子 agent transcript 的实测。
本轮只核对源码与记录，没有重跑真实模型。

父任务已验证[Claude 官方文档](https://code.claude.com/docs/en/sub-agents#choose-an-effort-level)：
单次 `Agent` effort 从2.1.292起支持，`CLAUDE_CODE_EFFORT_LEVEL` 可覆盖它。
这是 Claude 运行时功能，不能归功于参考仓。
官方 pstack 的 canonical `poteto-mode/SKILL.md` 仍以调整模型 slug 表述；但固定0.15.30的
[Claude harness 第34、38行][official-harness]已明确写出 `model` 与 `effort` 的字段映射。
所以“原生字段映射”也不是该固定版本相对官方 pstack 的独有创新；参考仓的具体增量是移除自己的包装方案并同步生成约束。

OMS 当前以[生成 agent frontmatter](../../tools/generate.mjs#L1080)表达保存的 effort，
[适配说明](../../tools/generate.mjs#L918)要求依据宿主实际能力调整，
[诊断 hook](../../tools/claude-effort-hook.mjs)可记录有效值。
后续可明确原生每次调用的 effort 合同、最低版本、环境覆盖和 requested/observed 区别。
T3 已传 `target.options`，无需增加另一套 effort agent 或将原生 Claude 字段套到 T3。

## known-bad 校准：新增原则，不是现成执行门禁

0.9.91新增[比较工具规则][ref-controls]：对每个声明比较的输出分别植入已知错误，
既改总量，也在总量相同下交换项目归属；必要输入缺失时拒绝或返回 inconclusive；保留控制并在信任结果前重跑。
[fork 清单][ref-forks]明确标为 `policy` / `since: 0.9.91` / `upstream: not-proposed`。
对应提交没有新增校准执行器或行为测试。

当前 OMS [原则正文](../../src/core/skills/principle-build-the-lever/SKILL.md#L16)和0.15.30官方快照均无这条增量。
建议把该思想用于具体比较器验收，保存控制输入和预期失败结果；不要只加关键词断言。
本轮没有全面审计 OMS 的每个比较器，因此不能据此断言它们全都缺少负控。

## 决策轨迹与跨家族审阅：有 helper，整体仍靠提示词执行

参考仓 [poteto-mode 第41行][ref-mode]要求长任务创建 trail，
[show-me-your-work][ref-trail]要求交付前核对 transcript、追加纠错，并由不同模型家族的子 agent 审阅。
这些要求在旧基线已经存在；本轮主要更新 transcript 定位和 Muse 入口。

它不是完全没有结构：[log.sh][ref-log]会写表头、时间、清理单行字段、转义电子表格危险前缀并追加行。
但 helper 只在被调用时工作，不检查任务是否创建日志、证据是否成立、审阅者是否不同家族或审阅是否完成。
[Claude hooks manifest][ref-hooks]仅声明 SessionStart；本轮定向检查 hooks、工具和 orchestration scripts，未找到缺日志或缺跨家族复核时阻止交付的运行时门禁。
Copilot PreToolUse 的脚本放行/保存模型检查也不等于 trail 审核。
因此准确判断是：**日志格式有可执行支持，创建时机、真实性审核和跨家族交付要求仍主要是提示词规则。**

OMS 已有同源 [show-me-your-work](../../src/core/skills/show-me-your-work/SKILL.md)，
另有只读 [trail-reviewer](../../src/core/roles/trail-reviewer/instructions.md)，
且 [T3 目标选择](../../tools/t3-orchestration.mjs#L597)在调用该角色时拒绝未知或相同家族。
这是具体选择路径的强制检查，不等于所有任务都会自动创建 trail 或自动经过它。
因此不能将参考仓措辞误报为更强运行时机制。

## 父任务交叉核验：工作树与链接解析

以下实际探针由父任务执行，本报告未重复运行。

- **已覆盖 ignored 保护。** OMS `tools/worktree-audit.mjs` 显式使用 `--untracked-files=all --ignore-submodules=none --ignored=matching`，且任意 ignored 内容均保持保留。参考仓的 ignored 防丢失修复不再列为缺口。
- **reflog-only 提交尚未覆盖。** 父任务在临时真实 Git 仓创建 detached commit 后恢复任务分支 HEAD；无分支包含该提交，HEAD reflog 仍包含它。完整合成 host/PR 证据下，当前 assess 返回 `verdict: candidate, reasons: [], advisoryOnly: true`。探针为 `/tmp/oms-reflog-assessment-probe-20261023.mjs` 和 `.json`；没有删除工作树。参考[审计分类与 reflog 观察][ref-reflog]值得适配到 advisory 分类，不能复制其 Pi 自动清理。
- **合法 Markdown 链接误拒绝。** 父任务用直接 Node imports 证明 OMS `validateLocalMarkdownLinks` 将 `[guide](<guide (draft).md>)` 报为 `index.md: missing local link <guide (draft`；参考解析器接受该合法 fixture，并拒绝缺失目标。[新增解析规则][ref-links]保留 `<...>` 中括号。建议加入合法/缺失目标的正负控制，保留 OMS 的仓库边界约束，不能整段替换不同职责的验证器。

父任务还确认 OMS 已有 schema2 更新规划器、文档事实检查、原生 Pi malformed-RPC/drain 修复、工作树 helper，以及完整有界 GitHub 分页与共享 deadline。
这些不再作为上次报告遗留缺口。

## 本轮验证与限制

本研究只新增本文件，未安装依赖、修改代码、执行参考提示词中的工作流、提交或发布。
保留现有未提交的0.15.30升级及其他改动。

主要命令为 `git rev-parse HEAD`、`git remote -v`、固定区间的 `git log / diff`，以及 `rg / rg --files / nl / sed / cat` 定向源码检查。
在参考 checkout 使用现有 Bun 1.4.2 执行：

```sh
bun test tests/claude-project-dir.test.mjs tests/claude-config-dir.test.mjs
# 15 pass, 0 fail，2 files；只使用临时 fixture，未读取真实聊天。
```

父任务尝试的 `worktree-audit`、`pi/worktree-status-config`、`skill-references` Bun 测试因缺少 `typebox` 无法加载，未安装依赖，也不计为通过。
日志为 `/tmp/oms-reference-worktree-tests-20261023.log`、`/tmp/oms-reference-link-tests-20261023.log`。
直接 Node 的链接解析正负控制是单独证据，不代表上述整套测试通过。
本轮没有真实 Claude/Pi 模型、安装产物、Windows 或生产验收；参考仓 changelog 的实测仍是作者记录。

## 最终取舍与后续范围

优先修复已复现的链接解析和 reflog 候选分类，再为原生 Claude 设计可核验的会话证据定位。
比较器负控落实到具体工具测试，不修改固定上游原则正文。以上均为后续建议，本轮没有实施。

参考 Pi 的 `list_agents` 会给出当前工具活动和 sessionFile；OMS 原生 Pi 目前主要提供
start/collect/cancel 与有限结果快照。这是可选可观察性扩展，不是本轮复现的正确性缺陷。
当前 T3 已提供子任务、状态与会话读取，不应为 T3 再引入另一套后台代理或轮询器。
不采纳参考仓自动删除无修改工作树、强删分支或整体工作流策略。官方 pstack 继续作为唯一语义基准。

[ref-dir]: https://github.com/michael-denyer/pstack-claude/blob/356c6e0f978df729eb16f227d795f34d221c5aad/plugins/pstack/skills/reflect/scripts/claude-project-dir.mjs#L27-L99
[ref-dir-tests]: https://github.com/michael-denyer/pstack-claude/blob/356c6e0f978df729eb16f227d795f34d221c5aad/tests/claude-project-dir.test.mjs#L29-L146
[ref-substitutions]: https://github.com/michael-denyer/pstack-claude/blob/356c6e0f978df729eb16f227d795f34d221c5aad/tools/substitutions.json#L371-L401
[ref-config-tests]: https://github.com/michael-denyer/pstack-claude/blob/356c6e0f978df729eb16f227d795f34d221c5aad/tests/claude-config-dir.test.mjs#L9-L53
[ref-effort]: https://github.com/michael-denyer/pstack-claude/blob/356c6e0f978df729eb16f227d795f34d221c5aad/tools/generate.mjs#L683-L710
[ref-changes]: https://github.com/michael-denyer/pstack-claude/blob/356c6e0f978df729eb16f227d795f34d221c5aad/CHANGES.md#L53-L59
[official-harness]: https://github.com/cursor/plugins/blob/4ec7ffa173eaa70d3d9467a627baf0954645a353/pstack/docs/harness/claude-code.md#L30-L38
[ref-controls]: https://github.com/michael-denyer/pstack-claude/blob/356c6e0f978df729eb16f227d795f34d221c5aad/plugins/pstack/skills/principle-build-the-lever/SKILL.md#L15
[ref-forks]: https://github.com/michael-denyer/pstack-claude/blob/356c6e0f978df729eb16f227d795f34d221c5aad/tools/forks.json#L213-L217
[ref-mode]: https://github.com/michael-denyer/pstack-claude/blob/356c6e0f978df729eb16f227d795f34d221c5aad/plugins/pstack/skills/poteto-mode/SKILL.md#L41
[ref-trail]: https://github.com/michael-denyer/pstack-claude/blob/356c6e0f978df729eb16f227d795f34d221c5aad/plugins/pstack/skills/show-me-your-work/SKILL.md#L58-L77
[ref-log]: https://github.com/michael-denyer/pstack-claude/blob/356c6e0f978df729eb16f227d795f34d221c5aad/plugins/pstack/skills/show-me-your-work/scripts/log.sh#L19-L58
[ref-hooks]: https://github.com/michael-denyer/pstack-claude/blob/356c6e0f978df729eb16f227d795f34d221c5aad/plugins/pstack/hooks/hooks.json
[ref-reflog]: https://github.com/michael-denyer/pstack-claude/blob/356c6e0f978df729eb16f227d795f34d221c5aad/plugins/pstack/skills/poteto-mode/scripts/worktree-audit.mjs#L48-L62
[ref-links]: https://github.com/michael-denyer/pstack-claude/blob/356c6e0f978df729eb16f227d795f34d221c5aad/tools/validate-skills.mjs#L26-L62
