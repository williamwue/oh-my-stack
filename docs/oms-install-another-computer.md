# 在另一台电脑安装 OMS 2.0.2

先安装并登录要在 T3 使用的 Codex 或 Claude Code 后端。
新电脑不需要原电脑的绝对路径、OMS 1.x 数据目录或 PowerShell 安装器。
不要复制登录凭据、插件缓存或 hook 信任数据库。

## 安装固定版本

有 Git 时，使用同一标签取得源码：

```sh
git clone --branch v2.0.2 --depth 1 https://github.com/williamwue/oh-my-stack.git oms-2.0.2
cd oms-2.0.2
```

也可以下载 [Release](https://github.com/williamwue/oh-my-stack/releases/tag/v2.0.2) 中的 ZIP，
核对 `SHA256SUMS.txt` 后解压。将源码放在长期保留的位置。

在源码根目录选择需要的后端安装。两个都使用时分别执行。
只有 Codex 的电脑只执行 Codex 安装段，不需要安装 Claude。

Codex：

```sh
codex plugin marketplace add .
codex plugin add pstack@oms
codex plugin list
```

Claude Code：

```sh
claude plugin marketplace add ./
claude plugin install pstack@oms
claude plugin list
```

已有名为 `oms` 的 marketplace 时，先用宿主命令查看其来源，不要直接覆盖或删除。
旧 pstack 已启用时，按[迁移说明](oms-migration.md)先备份并确认共享范围，再切换。
安装后按宿主提示完成 pstack hook 信任并新开 T3 会话。
本地路径安装不会跟随远程自动更新，后续升级须主动切换到新的已校验目录。

Codex 也可以直接使用固定远程标签：

```sh
codex plugin marketplace add williamwue/oh-my-stack --ref v2.0.2
codex plugin add pstack@oms
```

固定版本安装与跟踪 main 二选一。README 中不带标签的远程安装命令跟踪仓库默认分支，
后续更新可能取得更高版本。

## 恢复个人模型分工

插件安装不会自动带上原电脑的角色表或 T3 项目默认模型。
新电脑的 T3 会话运行 `pstack:setup-pstack`，让它读取当前 catalog，
参考[五模型示例](examples/pstack-models-t3.md)或[纯 Codex 示例](examples/pstack-models-t3-codex-only.md)配置所需角色。

只有 Codex 后端时选择纯 Codex 示例。
它保留 Sol 常规实现、Astra 疑难诊断与评审，架构候选改为 Sol 与 Astra。
裁判池按顺序列出 Astra、Sol，并排除父会话同模型家族。
因此 Astra 主控时通常由 Sol 裁判，Sol 主控时通常由 Astra 裁判。
Terra 仍为显式专项调用，须先确认目标电脑 catalog 提供该模型。
不能原样复制含 Opus、Sonnet 的五模型表并期待自动回退；不可用条目须修正。

希望多项目共用时保存到用户表 `~/.t3/pstack-models.md`。
只想应用到一个项目时，保存到该仓库根目录的 `.agents/pstack-models.t3.md`。
已有项目表会整体覆盖用户表，不能把未命中的行当作用户表补充。
保存前核对所有 provider 实例 ID、完整模型 ID 和 effort；不可用时修正并报告，不能静默替换。

在 T3 的目标项目中单独选择 Astra/high 作为新会话默认模型。
这一选择不是模型表的作用；现有会话不会自动切换。
不需要为了使用 T3 配置而覆盖原生 Codex 或 Claude 的个人模型表。

可以把下面这段交给新电脑的 T3 会话：

```text
请从已经安装的 OMS 2.0.2 读取 setup-pstack 和 T3 映射，
核对当前 provider catalog，并参考仓库 docs/examples/pstack-models-t3.md，
如果只有 Codex provider，则改用 docs/examples/pstack-models-t3-codex-only.md。
将选定分工配置到用户级 ~/.t3/pstack-models.md。
先检查并备份已有配置，保留其他插件、原生模型表、全局指令、登录和 hook 偏好。
provider、模型或 effort 不可用时报告，不静默替换。
我允许按配置启动一个有明确边界的代表性子任务，核对真实执行型号、effort 和结果。
不要创建顶层线程、修改生产项目、部署或发布。
```

以上角色表示例用于 T3。只运行原生 Codex CLI 时，使用该宿主的 setup-pstack 配置机制，
不要把带 provider 前缀的 T3 表粘贴到原生 Codex 模型表。

## 检查新会话

1. 在宿主插件列表确认 `pstack@oms` 为 2.0.2 且已启用。
2. 新会话中确认可以发现并读取 `pstack:poteto-mode` 和 `pstack:bro`，记录实际安装路径。
3. 让代理读取 T3 映射，确认生效表的路径、项目表优先级及 catalog 有效性。
4. 执行一个范围明确的代表性任务，允许使用子代理，并核对宿主最终执行记录和实际产物。

安装、技能发现、启动提示和真实派发是不同检查项。
不能把原电脑的通过记录当作新电脑已经验收。
