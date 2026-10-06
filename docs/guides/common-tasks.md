# Choose an entry for your task

[English](common-tasks.md) | [简体中文](../zh-CN/guides/common-tasks.md)

In Codex, select `oh-my-stack:<entry>` with the Skill picker, then send the
request. In Claude Code, start the request with `/oh-my-stack:<entry>`.
The text blocks below contain requests. They are not terminal commands.

## Fix a bug

Select `poteto-mode` and replace the example with your reproduction:

```text
The export contains duplicate rows after a retry.
Reproduce the failure, identify the cause, fix it, and rerun the same check.
Keep the change limited to this defect. Do not publish or merge anything.
```

Expect reproduction evidence, a bounded code change, and verification.
This task can modify code and tests and run local checks. Mention any data,
service, or network restrictions before work starts.

## Build a feature

Select `poteto-mode`:

```text
Add a filter to the orders page that shows only unshipped orders.
Keep the existing default view. Verify both views using the app's usual checks.
Ask about unresolved product decisions before implementation.
Do not deploy or merge anything.
```

Expect scoped implementation and evidence that the intended behavior works.
The request authorizes project edits and relevant local verification.

## Clarify a requirement

Select `grill-with-docs`:

```text
Help me design partial order cancellation.
Ask about unresolved decisions and recommend answers.
Record terms and decisions only after we agree on them.
Do not implement code.
```

Expect question rounds and a pause for your answers. The Skill may update
`GLOSSARY.md` and architectural decision records as decisions become clear.
For an interview without those document updates, choose `grill-me`.

## Review a change

Select `interrogate`:

```text
Review the current diff against the main branch.
Look for reachable correctness problems and scope mismatches.
Read only. Return concrete findings with file references and evidence.
```

Expect a fixed review scope, independent findings, and a final judgment.
Review can run relevant checks within the read-only task boundary, but it does
not apply fixes. Tell the agent if executing checks is also out of scope.

## Find modules worth improving

Select `improve-codebase-architecture`:

```text
Inspect the order module for design improvements.
Generate the original architecture report, present the candidates,
and wait for me to choose one. Do not implement a refactor.
```

Expect read-only exploration and an HTML report in the operating system's
temporary directory. The original Skill attempts to open it in a browser.
If opening fails, use the reported file path. Full styling and diagrams need
network access to the upstream CDN dependencies.

## Ask which entry fits

Select `poteto-help`:

```text
I want to review this branch before making a pull request.
Which entry should I use, and what prompt should I send?
```

Expect an explanation and one suggested prompt. Send that prompt separately
when you want to start the task.

## Request publication separately

Building, reviewing, and creating a pull request are different requests.
Specify the repository, target branch, and intended external action when you
want publication or merging. Neither a model mapping nor a passing check
grants that authority.

[First task](../getting-started.md) · [AIHero originals](../aihero-original-skills.md) ·
[Complete Skill directory](../skill-directory.md)
