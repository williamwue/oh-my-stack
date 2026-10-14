# Cursor different-family trail review

## Round one

Reported provider `cursor`, model `claude-opus-5-5`. The task completed with
`result_available` and no pending child runs. This fills the initial availability
gap for different-family review. Effective option enforcement is a separate claim.

### 独立决策记录审查（不同模型家族）

**结论：没有发现夸大或虚假的成功声明，但有 4 个需要处理的问题。** 其中 2 个是"仍按当前事实陈述的过时限制"，2 个是"中断和收尾阶段缺失的记录"。每一行的计数和状态都与 transcript 一致：404、27、30、434、lint 0 issues，Codex 和 Cursor 探针的 taskId 与状态也对得上。Cursor 部分的说法有保留，没有声称被拒的选项可用。

下文的行号按 `decisions.tsv` 的数据行计，不含表头。Cursor 那一行是 **row 18**（`14:52:05Z`）。

## 需要处理的问题

1. **`transcript-audit.md` 里的限制说明已经过时（row 14 的证据）。** 最后一句仍写着 "No … cross-provider execution was performed"。但 row 18、`cursor-probes.json`（`crossProviderLiveVerified: true`）和 `verification.json`（`crossProviderLive: true`）都已证明跨 provider 执行发生过。transcript #1521 在 14:52:05Z 只改了 `acceptance.md` 和 `verification.json`，这个文件没有同步更新。
   - 同类但较轻的两处："`trail-review.md`"的 Coordinator response 仍用现在时写 "different-family requirement remains unavailable"；`design.md` 末段写 "Cross-family review and Claude execution remain unavailable in this environment"。作为历史快照可以接受，但没有标注时间点。

2. **row 13 的证据文件被事后改写，row 18 没有说明。** `verification.json` 支撑的是 13:43:41Z 的验证结论，但在 14:52:05Z（#1521）被加上了 `crossProviderLive: true` 和 `cursorEvidence`，文件本身没有时间戳。row 13 的数字（434/2）不受影响，但这份证据现在混合了两个时间点的状态。
   - 同一时刻 `acceptance.md` 也被修改了。row 17 说的 "Final documentation validation and markdown lint passed" 只覆盖 13:48 的版本。transcript 在 14:52 这次编辑之后，到冻结（14:52:48）为止，没有重跑 `npm run validate` 或 `lint:markdown`。

3. **中断后丢失的 worktree 和分支没有记录。** row 6 记录了两个隔离单元。#534 在 12:36:17 创建了分支 `codex/t3-domain`、`codex/t3-generation`，worktree 都放在 `/tmp/oms-t3-implementation/`。#796 显示中断后整个 `/tmp/oms-t3-implementation` 已经不存在。row 9 只交代了 rows 2 和 4 的日志指针，没有交代这两个单元的收尾：补丁已在 #742/#754 应用，但 worktree 登记和两条本地分支可能还残留。transcript 里没有 `git worktree prune` 或删除分支的操作。按任务边界，我没有检查当前的 git 状态，这一点只依据 transcript。

4. **两个和安全/索引相关的操作没有决策行。**
   - 12:49:36Z（#709）把新脚本登记进了 `security/executables.json`（可执行安全清单），trail 里没有对应的行。
   - 13:48:18Z（#1239）执行了 `git add -N docs/acceptance/2026-10-13-t3`（intent-to-add，改动了 git 索引），也没有记录。这不是提交，可以撤销，不违反"禁止提交"，但属于未记录的仓库状态变化。

## 较弱但不构成问题的证据

- **row 7 和 row 10 的证据指针指向的是文档或测试文件，不是结果日志。** 结果由 transcript 支撑：#668 显示 11 个文件 0 issues，#962 显示 `# pass 27`。row 7 的 lint 日志放在 `/tmp`，同样已丢失，row 9 没有覆盖它，后来的全量检查包含 lint，可以替代。
- **row 11 的证据 `comment-review.md` 没记录审查者模型。** transcript #901 显示是 `gpt-6.1-sol`，角色为 `writes: true`。报告声明只写了 `.tmp` 下的报告文件，与 "report-only" 一致。
- **`cursor-probes.json` 里的 `retry` 只有布尔值 `sameTaskId`，没有 taskId。** `live-probes.json` 里有。transcript #1507 能佐证。
- **SDK 证据是手工抄录的。** `sdkError`、`sdkReportedParams`、`sdkReportedModel` 在 #1521 中是写死的字面量，来源是仓库外的 T3 provider 日志（#1473、#1491），与 transcript #1476、#1495 一致。读日志时用了临时正则做脱敏；在我看过的输出里没有凭据内容。
- **被拒的显式选项其实就是目录的默认值。** 请求的 `1m`、`true`、`high` 都等于目录里的 `currentValue` 或默认值（#1416），所以这次拒绝和"非默认值"无关。不固定选项的成功运行，SDK 只报告了 `model.id`，没有参数，因此实际生效的参数未知。现有记录正确地没有对此下结论。
- **中断证据只到 T3 状态这一层。** Cursor 取消探针在 30 秒 sleep 任务启动约 17 秒后被观察到 `interrupted`。子任务摘要只说"我会运行这一个探测命令"，无法证明命令已经开始执行或被终止。现有说法只涉及 T3 状态，没有越界。

## Transcript 与模型验证

- **Transcript：** 冻结文件 `.tmp/t3-verification/cursor-trail-transcript.jsonl` 可读，共 1532 行，覆盖 11:25:32Z–14:52:48Z（session `01a13502…`）。我只读了它和这个验收目录。原生子任务消息和 `send_message` 是加密的，无法审计。
- **本次审查者的模型：** #1531 请求的是 `cursor` / `claude-opus-5-5`，并显式设置 `options: {effort:'high'}`。前一次 Haiku 显式选项刚被拒，这里仍然固定了选项。本会话能够运行，说明请求被接受了。
  - 宿主注入的 runtime metadata 显示本审查者为 `claude-opus-5-5`，与请求一致，属于 Claude 家族，与 GPT 家族的实现者和代码审查者不同。
  - 但这是上下文里的宿主元数据，不是独立的执行凭据。`effort=high` 是否生效无法验证。

ROLE_POLICY=frozen-trail-review-only

## Coordinator judgments and responses

| Finding | Verdict | Response |
| --- | --- | --- |
| Current wording in historical audits is stale after Cursor verification. | ActOn. | Mark the earlier audits and design limitations as snapshots, and link the later Cursor evidence. |
| Source verification was edited to combine later live evidence. | ActOn. | Restore the source-check snapshot, timestamp it, and keep subsequent live evidence in separate timestamped files. Revalidate the updated documentation. |
| Missing worktree and branch disposition. | ActOn. | Record that patches were integrated before interruption, directories disappeared, and two prunable registrations and local branches remain. Preserve those refs; perform no unrequested cleanup. |
| Missing executable-inventory and intent-to-add log entries. | ActOn. | Append retrospective rows with their observed source and index evidence. Preserve all earlier rows. |

The weaker evidence notes are retained. Add the comment reviewer's reported model,
the retry task ID, and extracted SDK observations with source hashes. The
cancellation evidence establishes T3 interruption, not OS process termination.
Haiku's rejected option values match catalog defaults; the successful unpinned
run does not establish which options actually took effect. The Opus review's
SDK terminal event reports model and `effort=high`, while backend enforcement
remains outside this evidence.

## Round two

**结论：四个问题里有三个已解决，第 4 个只解决了一部分。** 剩下的问题是：13:22:44Z 有一次 `git add -N`，作用于 8 个源码和文档路径，至今没有记录。在我核对的范围内，没有其他重大的事实矛盾。

## 四个问题逐项复核

1. **历史快照里的过时限制说明：已解决。**
   - `transcript-audit.md` 已标注"2026-10-13T13:43:41Z snapshot, before Cursor was authenticated"，结尾也改成了"at that snapshot … the earlier limitation is historical"。
   - `trail-review.md` 的 Coordinator response 标注为 13:47:56Z 时的状态，并链接到 `cursor-trail-review.md`。
   - `design.md` 改为"At the 2026-10-13T12:40:39Z design decision…"，同时把 Claude 安装宿主的验收单独列为未验证。

2. **`verification.json` 混入了两个时间点的状态，文档改动后也没重新校验：已解决。**
   - transcript #1599（15:00:10Z）删除了 `cursorEvidence`，把 `crossProviderLive` 改回 `false`，并加上 `recordedAt: 13:43:41Z`。
   - 其余字段与 #1155（13:43:41Z）的原始写入一致。只有 `scope` 从 `local source candidate` 改成了快照说明，属于事后标注，不改变任何结论。
   - 第二次校验发生在最终编辑之后：validate 在 15:01:48Z，markdown lint 在 15:02:27Z。
   - 我重新计算了 `cursor-documentation-checks.json` 里 12 个文件和 2 份日志的 sha256，都与当前文件一致。

3. **worktree 和分支的收尾没有记录：已解决。**
   - transcript #1585（14:58:35Z）的 `git worktree list --porcelain` 显示，两个 registration 都是 `prunable`，两条分支的 HEAD 都是 `d81145e`。
   - #1607 用 `rev-list --count` 算出两条分支在基线之后都是 0 个提交，说明没有丢失任何提交。
   - 这两处登记被保留，没有执行 prune 或删除分支，与 row 19 一致。

4. **可执行清单和 intent-to-add 操作没有决策行：部分解决。**
   - 可执行清单已解决。`repository-operations.json` 里两条 `network: false` 的条目，与 #711（12:49:36Z）写入 `security/executables.json` 的内容逐字一致。
   - intent-to-add 的记录不完整。`repository-operations.json` 只记录了 `git add -N docs/acceptance/2026-10-13-t3` 这一次。row 20 写着"Recorded the … intent-to-add operations"，暗示已经记全，但 transcript 里还有：
     - **#855（13:22:44Z），本轮主要的标记：** `git add -N tools/t3-orchestration.mjs tools/t3-binding.mjs tests/t3-orchestration.test.mjs tests/t3-generation.test.mjs tests/fixtures/t3-catalog.json src/schemas/t3-resolution.schema.json docs/t3-orchestration.md docs/zh-CN/t3-orchestration.md docs/acceptance/2026-10-13-t3`。它把 8 个验收目录以外的源码和文档路径也标记成了 intent-to-add，记录里完全没有提到。
     - **#1556（14:53:57Z）和 #1619（15:01:47Z）：** 都在验收目录内，可以算作已有记录覆盖。
   - 这几次都没有暂存内容（#1612 和 #1638 的 `git diff --cached --name-only` 输出为空），也没有提交，所以没有越权。缺的只是记录。
   - 第一轮我只指出了 #1239，漏掉了 #855。

## 不构成问题的观察

- **lint 中途失败过一次，TSV 没写。** #1625 的 lint 先失败了一次（`cursor-trail-review.md:9` MD025），#1636 修好后重跑通过。row 22 说"markdown lint passed"，对最终结果是正确的。
- **validate 早于最后一次编辑。** validate 在 15:01:48Z，早于 15:02:26Z 对 `cursor-trail-review.md` 的标题修改。但 validate 只检查 targets、profiles 和 Skills，不涉及这份文档，所以不影响结论。
- **SDK 记录的提取方式已修正。** #1587 第一次提取时，按 `explicit` 匹配到了一条 14:55:05Z 的空记录。#1599 改成匹配 `providerSessionId`，并只取 `direction == incoming` 的记录，还断言恰好 3 条。最终 `cursor-sdk-observations.json` 里的三条记录，与第一次提取中的有效值一致。
- **TSV 确实只是追加。** transcript 里对 `decisions.tsv` 的写入全部通过 `log.sh` 追加，其他事件只是读取。rows 1–18 都保留着原来的历史措辞，包括 row 16 的"different-family audit unavailable"。

## Transcript 和模型的证据限制

- **Transcript：** 冻结文件 `.tmp/t3-verification/cursor-trail-round-2-transcript.jsonl` 可读，共 1648 行，覆盖 11:25:32Z 到 15:03:25Z，session 为 `01a13502…`。我只读了它和验收目录，没有读取 `~/.t3` 下的 provider 日志。SDK 记录的哈希只能确认 JSON 内部自洽，无法对照原始日志行。原生子任务的消息是加密的，无法审计。
- **本轮审查者的模型：** 宿主的 runtime metadata 显示我是 Cursor 上的 `claude-opus-5-5`，与 GPT 家族的实现者不同。但这轮的委派请求不在冻结 transcript 里（transcript 结束于 15:03:25Z 的 TSV 追加），所以这次请求了什么选项，我看不到。
- **选项是否生效：** 第一轮 Opus 的 SDK 结束事件报告了 `effort=high`。被拒的 Haiku 请求和成功的不固定选项请求，记录都与实际观察相符。但后端是否真的执行了这些选项，三次都无法验证，记录也正确地标为 `effectiveBackendOptionsVerified: false`。

ROLE_POLICY=frozen-trail-review-only

## Final coordinator response

The remaining partial finding is accepted. The own-run transcript was checked
for actual `exec_command` invocations of `git add -N`. The 13:22:43.825Z call
included eight source/document paths and the acceptance directory. Its exact
scope and the later directory-only calls are now recorded in
`repository-operations.json`. A new decision row supersedes row 20's incomplete
operation scope. No content was staged and no commit was created.

The four original findings are addressed. Round two independently verified the
first three; the coordinator corrected and checked the remaining indexing
record against the transcript. No third delegation is needed for this bounded
record addition. Post-edit documentation validation is recorded separately in
`cursor-final-documentation-checks.json`. The earlier documentation hash set
remains a snapshot of the revision reviewed in round two.
