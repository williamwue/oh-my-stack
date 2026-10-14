# Installation acceptance trail review

## Independent findings

**结论：有 5 项需要标记，没有实现缺陷。** 主要问题是部分表述比证据强：Claude 实际加载走的路径、几处"观察到"的结论其实来自协调者自述，以及请求参数没有记全。下面这些没有问题，可以不用再看：缓存一致性、76 个 Skills、两个测试 provider、普通插件设置的哈希、嵌套 explainer 的时间线、两次显式入口的回答内容，以及"T3 UI Skill picker 未验证"这条披露。

冻结目录里 13 个文件的 SHA-256 与 `manifest.json` 全部一致。

### 标记

1. **（中）Claude 的显式入口和 T3 工作流都没有经过原生管理器的那次注册。**
   - 显式入口：transcript 15:53:25 的 `activate-claude.py` 没有设置 `CLAUDE_CONFIG_DIR`。它直接在普通配置目录下用 `--plugin-dir <cache> --settings claude-session-settings.json` 运行。
   - T3 provider：15:34:17 只填了 binary path 和 launch args，`CLAUDE_CONFIG_DIR` 留空。
   - 所以 `claude-home` 里的 `oh-my-stack@oms-t3-claude-acceptance` 注册只被 `plugin list`、`plugin details`、`plugin validate` 用到过，没有任何会话通过它加载过包。
   - `installation.md` 第 29–31 行只对"Actual T3 execution"说明了这一点。第 36–37 行的"Explicit native entry"段落和第 3–5 行的总结都没有说明，读起来像是显式入口用的是原生安装的注册。receipt 里 `explicitEntry.method` 写了 `--plugin-dir`，但正文没有跟上。
   - 第 31 行的"to avoid duplication"只是意图。两个插件都叫 `oh-my-stack`，冻结证据里没有任何内容能证明 session settings 确实排除了原有的普通注册。

2. **（中低）两条结论写成了观察事实，实际来自协调者自述。**
   - 第 44–46 行写"Claude's Skill tool explicitly rejected"。receipt 里 `nativeModelInvocationBlock` 那段字符串，是 15:55:33 `curate-receipt.py` 里手写的字面量，抄自 Claude 协调者 15:52:30 的 `final.md`。
   - Codex 子会话"how absent"的依据，是 Codex 协调者自己 15:44:00 的 assistant 消息。
   - root 读取的 `nested-*-root-read.json` 是 explainer 线程，不是发生拒绝的协调者线程。这两条应标注为"协调者报告"。

3. **（低）请求的模型和参数记录不完整，测试 home 的配置写入也没有披露。**
   - 协调者请求的参数：Codex 是 `reasoningEffort: high`、`serviceTier: default`（catalog 里 `currentValue` 是 `low`）；Claude 是 `effort: high`（见 transcript 15:40:16、15:48:44）。
   - 隔离的 Codex `config.toml` 由 root 写入：15:30:57 写了 `model = "gpt-6.1-sol"` 和 `model_reasoning_effort = "high"`，15:39:26 又追加了本仓库 `trust_level = "trusted"`。
   - Codex 显式入口请求了 `effort: high`（见 `codex-entry.json`），但没有记录返回的模型。
   - 以上都没有写进 `installation.md` 或 receipt。receipt 只记了嵌套任务的 `reportedModel` 和 `requestedOptionsVerified: false`。第 76 行的免责说明本身成立，但"请求值和返回值"的对照不完整。`installation.md` 对测试 home 只提到了 auth 符号链接。

4. **（低）"original hashes"的基准时间没有说明。**
   - `configuration-before.json` 是 15:30:57 才采集的，晚于几次使用普通 home 的 CLI 调用，比如 15:23:50 的 `claude auth status` 和多条 `--help`。
   - 对 `~/.codex/config.toml` 和 `~/.claude/settings.json` 来说风险很低。
   - 但 `~/.claude.json` 那份变更键清单，比较的是"15:30:57 的快照"和"之后的状态"。期间的变化也包括 T3 Claude 协调者和 explainer 在普通 home 里的会话，不只是 receipt 里 `scope` 字段说的"after both explicit-entry probes"。

5. **（低）decisions 缺少重大转向，也没写出覆盖了宿主的指令。**
   - 第 26–27 行都在 15:56:49 补记，覆盖 15:30–15:55 的全部操作。
   - 中间有一次实质转向没有单独成行：15:46 Codex 协调者报告 `how` 不在已加载列表里，root 随后在 15:48:44 的 Claude 任务说明里预先授权了手动回退，又在 15:53 补做了两次显式入口探测。
   - Claude 的 Skill 工具返回了"Do not replicate this skill's workflow by other means"，手动回退是有意覆盖这条宿主指令。第 27 行和 `installation.md` 第 46–48 行只写了"authorized"，没有说明这一点。

### 证据可用性

- **Transcript：** 可用。`own-installation-transcript.jsonl` 共 533 行，时间范围 15:10:39Z 到 15:58:08Z，只包含 root 会话 `01a13502…`。15:52:11 有一次 compaction，但 compaction 之前的原始条目也保留在文件里。reasoning 条目是加密的，没有检查。
- **子会话：** 协调者和 explainer 的原始 transcript 不在范围内，只能看到 root 对它们的读取和协调者的报告。
- **哈希：** cache 和 config 的哈希是协调者算出来的。我没有访问含密钥的文件，也没有联系任何 provider。

### 模型元数据

- **审查者：** 我的模型身份只来自宿主注入的 runtime_info（Cursor harness 下的 `claude-opus-5-5`），没有可独立核验的 runtime 元数据。
- **被审对象：** root 是 `gpt-6.1-sol`，见 `turn_context` 和 `thread_settings_applied`。协调者和嵌套任务的模型是 T3 报告的 `gpt-6.1-sol` 和 `claude-sonnet-5-5`。实际生效的 effort 和 service tier 都没有验证。

ROLE_POLICY=frozen-trail-review-only

## Coordinator judgments and corrections

All five findings are accepted. They concern the evidence record; the reviewer
reported no implementation defect. The review covered the frozen files before
these corrections, and did not verify the corrected revision.

| Finding | Response | Remaining limit |
| --- | --- | --- |
| Claude sessions did not load through the isolated manager registration. | State in the summary and explicit-entry section that both Claude sessions used `--plugin-dir` to the installed cache with the normal native account/home. Describe the duplicate-exclusion setting as a request, not proven behavior. | Registration-to-session loading and duplicate exclusion remain unverified. |
| Discovery absence and tool rejection were coordinator-reported. | Attribute the automatic inventory claim to each coordinator. The root subsequently read the actual Claude coordinator tool item and retained `claude-entry-block.json`, independently corroborating its rejection. | Codex's injected inventory was not independently inspected. |
| Requested parameters and isolated config writes were missing. | Record both coordinator targets/options, native entry model/effort requests, Codex thread-start reported model, nested omitted options, and test-home model/effort/trust writes. | Reported models and accepted requests do not prove effective backend options. |
| Configuration baseline and comparison span were unclear. | Date the baseline at 15:30:57Z, after CLI preflight. Describe the comparison as spanning manager setup, T3 child sessions and explicit-entry probes. | No claim of a baseline before all native CLI activity or attribution of every bookkeeping change to one command. |
| Entry fallback pivot was missing from the trail. | Append a retrospective row for the 15:46–15:53 pivot: reported missing discovery, parent-authorized manual loading, deliberate continuation despite Claude's tool instruction, and separate explicit-entry probes. Preserve the original rows. | The fallback is a pipeline test, not successful model invocation of an explicit-only Skill. |

The root retained the review task identity and terminal result in
`installation-trail-receipt.json`. It reports Cursor `claude-opus-5-5`, completed,
with no pending child runs. Effective reviewer effort remains unverified.
Documentation validation after the corrections is recorded separately from
the earlier frozen-snapshot checks.
