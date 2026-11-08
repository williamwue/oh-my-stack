# pstack 的 Codex / T3 个人配置

OMS 1.1.1 提供一个可选的单人配置示例：常规实现与探索使用工作模型，复杂判断使用强模型；
arena、architect 各使用两个候选；默认推理强度为 high，部分常规角色使用 medium。
示例针对 pstack 0.9.133，独立于上游源码，不会在安装、更新或 `configure` 时自动写入个人配置。

## 应用前

1. 在当前宿主中确认模型和推理强度可用。示例中的名称不是所有账号的通用模型列表。
   T3 使用 `orchestrator_capabilities`；原生 Codex 以当前会话实际提供的模型为准。
2. 读取已有的 `pstack-models.md` 和 `AGENTS.md`，备份后合并。保留已有 hook 设置、
   个人规则和未打算修改的角色，不要直接覆盖整份 `AGENTS.md`。
3. 通过宿主调用 `pstack:setup-pstack`。Codex 可输入 `$` 选择对应技能，或直接要求代理使用它。
   T3 在技能可用时也可直接用自然语言调用；需要重启的安装先新开会话确认技能已加载。

可直接发送：

> 使用 pstack:setup-pstack，参考 OMS 的 docs/examples/pstack-models-codex.md。
> 先核对当前可用模型，合并到现有配置并保留我的其他设置。
> 常规实现与探索用 gpt-6.1-sol，疑难修复、性能分析、复杂判断用 gpt-6-astra。
> arena 和 architect 默认两个不同模型；其他评审面板保留原规模。
> 默认 high，示例中标注的常规角色用 medium。模型不可用时明确说明，不静默替换。

完整角色表见 [配置示例](examples/pstack-models-codex.md)。这是角色的起始设置，
复杂任务仍遵循上游的难度调整；主对话的模型和强度继续由宿主选择。

## 配置保存与加载

Codex 配置目录优先使用当前进程的 `CODEX_HOME`，否则使用 `~/.codex`；Windows、macOS 相同。
T3 使用 Codex 后端时，应核对该后端实际使用的目录，不根据 T3 名称另建一份配置。

- `<codex-home>/pstack-models.md` 保存角色与默认推理强度。
- 按 pstack 的 Codex 接入方式，把角色行和 `default effort` 同步到 `<codex-home>/AGENTS.md`。
  建议用明确的起止标记管理这一段，保留文件中的其他指令；以后修改时同步两处。
- `session hook` 由插件从模型表读取，不复制到 `AGENTS.md`。本示例不修改它；
  合并时保留已有值。没有该行时插件默认开启路由，但实际执行仍取决于宿主的 hook 支持与信任。
- `panel vendors: any` 仅用于允许上游校验器接受同一供应商的模型面板。
  它不提供跨供应商多样性，也不绕过独立审查要求。

Claude Code 后端使用自己的模型名称、配置目录与加载方式。不要把此 Codex 示例直接复制到 Claude 配置。
其他宿主遵循所安装 pstack 的 `setup-pstack` 平台说明。

## 两个候选的含义

`arena runners`、`architect runners` 各列两个模型，表示两个候选，不是整条工作流只调用两个代理。
Arena 后续仍可能调用一个独立裁判；`arena cross-judge pool` 是裁判候选池，不会同时运行池中的所有模型。
`interrogate reviewers` 在本示例中仍保留四个模型；它和其他工作流必须遵守宿主实际容量，不能把配置人数当成可用槽位。

在 T3 中，派发方式仍由宿主规则决定：继承设置且无需独立 checkout 的同供应商任务使用原生代理；
指定不同设置、独立工作区或后台任务使用 T3 委派工具。配置文件不会创建额外的调度器。

## 验证与恢复

应用后核对两处的角色行一致，并在新会话中确认代理读取到了角色和强度。
配置解析通过、模型出现在目录中，不代表实际子代理已经运行成功；实际派发应另外记录证据。
需要实测时选择小型任务，检查实际使用的模型、强度和候选数量。

恢复时使用合并前备份，或移除个人覆盖段和模型表中对应角色行以回退到上游默认值。
保留其他个人设置及 hook 偏好。不要编辑插件缓存中的技能来保存个人偏好，更新可能替换这些文件。

## 来源

- [原版配置教程](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/01-setup.md)
- [移植版 setup-pstack](https://github.com/michael-denyer/pstack-claude/blob/v0.9.133/plugins/pstack/skills/setup-pstack/SKILL.md)
- [移植版平台配置说明](https://github.com/michael-denyer/pstack-claude/blob/v0.9.133/plugins/pstack/skills/setup-pstack/references/runtimes.md)
- [OMS T3 映射](../integrations/pstack/t3/t3-tools.md)
