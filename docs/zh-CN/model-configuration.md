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

检查建议模型、推理等级、worker 数量和配置范围。
在支持的工具中，项目配置优先于用户默认值。
需要应用时，请求 Skill 写入已经审阅的具体映射。

配置与插件版本是两回事。升级插件保留模型映射；卸载插件不删除用户配置文件。
AIHero 原版技能继续使用原有调度指令，不注入 OMS 模型路由。

具体过程见 [setup Skill，英文](../../packages/codex/skills/setup-oh-my-stack/SKILL.md)。
实现细节见[发布流程，英文](../release-process.md)和[历史 setup 记录，英文](../maintainers/readme-0.9.0.md#development)。
