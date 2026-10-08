# 为角色和审阅面板选择模型

[English](../model-configuration.md) | [简体中文](model-configuration.md)

需要为实现、探索或审阅选择不同模型和推理预算时，使用模型配置。
安装插件不会创建模型映射。未配置时，允许继承模型的工作流继续使用 agent 的模型。

## 预览映射

在 Codex 选择 `oh-my-stack:setup-oh-my-stack`，或在 Claude Code 调用 `/oh-my-stack:setup-oh-my-stack`，并发送：

```text
检查此工具当前可用的模型和子 agent 调度方式。
预览代码工作与审阅面板的模型映射。
说明推理预算、worker 数量，以及会消耗用量的探测。
这些步骤经我批准后再写入配置或执行付费探测。
```

Skill 会观察当前工具，不根据菜单名称或别的账号猜测可用模型。
模型出现在清单中，不代表子 agent 可以选择它。
缺少必要观察或调度能力时，setup 应先报告缺口，再决定配置能否应用。

## 审阅并应用

Codex 的 `pstack` 推荐使用 GPT-6 Luna、GPT-6.1 Sol 和 GPT-6 Astra。
OMP 的 `pstack-openai-codex` 备选使用相同模型及其供应商前缀 ID。
预设是经过核对的推荐；发现新版模型不会自动替换已配置模型。
推荐 ID 不可用时，setup 会要求明确选择已观察到的模型，不会静默回退。
重新运行模型设置会预览更新后的预设默认值，并保留显式模型覆盖、推理预算和面板顺序。

Claude Code 的动态 `pstack` 推荐会观察 `haiku`、`sonnet`、`opus` 别名实际对应的模型。
Haiku 用于快速探索，Sonnet 用于常规实现，Opus 用于深度分析；三人面板按 Opus／Sonnet／Haiku 排列。
预设使用已观察到的 ID，不固定模型版本。初始推理档位为 low／medium／high，再应用用户选择的预算。
重新运行同一预设会保留显式覆盖和预算；现有两模型配置在用户接受新映射前保持不变。
明确指定的探测子集会标为部分清单；缺少某个家族或对应多个 ID 时，三模型预设会停止并报告，
不会静默替换为别的模型。别名可能因供应商或本机配置而对应不同版本。
原生别名返回别的家族时，可以明确选择已核对的指定值，例如
`--claude-models haiku=claude-haiku-5-5,sonnet,opus`，无需改写全局设置。
指定型号与实际返回 ID 必须完全一致。
收集器识别 Opus、Sonnet、Haiku 5.5 的可配置推理档位；Haiku 4.5 没有原生档位覆盖。
未经核对的版本会停止收集，不会沿用旧型号的能力判断。
观察请求消耗账号用量，仍需用户批准。模型可用及文档支持的档位，
不代表账号实际档位或子代理执行已验证。
使用 Anthropic API 当前别名版本时，Claude Code 至少需要
2.1.280（Opus 5.5）、2.1.284（Sonnet 5.5）或 2.1.293（Haiku 5.5）。
选择 Haiku 前检查本机客户端版本；OMS 不会代替用户升级宿主工具。

上述推荐与能力规则于 2026-10-08 核对
[OpenAI 模型目录](https://developers.openai.com/api/docs/models)和
[Claude Code 模型配置文档](https://code.claude.com/docs/en/model-config)。

检查建议模型、推理等级、worker 数量和配置范围。
在支持的工具中，项目配置优先于用户默认值。
需要应用时，请求 Skill 写入已经审阅的具体映射。

配置与插件版本是两回事。升级插件保留模型映射；卸载插件不删除用户配置文件。
AIHero 原版技能继续使用原有调度指令，不注入 OMS 模型路由。

具体过程见 [setup Skill，英文](../../packages/codex/skills/setup-oh-my-stack/SKILL.md)。
实现细节见[发布流程，英文](../release-process.md)和[历史 setup 记录，英文](../maintainers/readme-0.9.0.md#development)。
