# OMS 1.1.2

汇总 1.1.1 发布后的 macOS、Codex/T3 与跨平台回归验收，随安装包提供完整记录。
这是发布文档补丁，安装器、组件目录、T3 映射及上游工作流和模型默认值与 1.1.1 相同。

## 改动

- 纳入 [1.1.1 后续验收](verification-1.1.1.md)，分别说明 Mock、原生宿主与真实会话证据。
- 补充仓库级 Actions 总开关关闭导致 CI 未启动的原因及启用记录。
- 保留发布时验证范围与后续验收的时间边界，不改写旧 Release 或安装包。

pstack 默认安装仍锁定 `91ab921ab92d9ccfe503c93c3524410277f012e1`，
对应上游 manifest 0.9.133；AIHero 保留宿主原生安装方式。
个人配置示例仍是可选参考，安装、更新不会自动应用。

## 安装与升级

下载 `oms-1.1.2.zip` 和 `SHA256SUMS.txt`，校验后解压到新的长期目录。
Windows 和 macOS 使用同一份源码包，依赖要求与 1.1.1 相同。

macOS：

```sh
shasum -a 256 -c SHA256SUMS.txt
unzip oms-1.1.2.zip
cd oms-1.1.2
pwsh -NoProfile -File ./oms.ps1 list
```

Windows 使用 `Get-FileHash ./oms-1.1.2.zip -Algorithm SHA256` 对照清单。
校验清单仅包含 ZIP。PowerShell 和 Agent 宿主仍需自行安装。

已有 1.1.1 用户无需重新安装插件。`oms.ps1 update` 更新的是组件，
不替换 OMS 脚本；要使用新文档与版本信息，请使用新的解压目录。
pstack 的 `update` 继续跟踪上游 main，运行时可能取得比默认提交更新的版本。

电子书内容和授权不变，组件目录继续指向 v1.1.0 的四份书籍资产，本版不重复上传。

## 验证与限制

- 代码基线 `4c4fb146` 纳入了 [PR #41](https://github.com/williamwue/oh-my-stack/pull/41)
  的验证记录。该 PR 的 Windows PowerShell 5.1 / 7、macOS arm64 / Intel
  四项 Mock 作业均通过，见 [对应 CI](https://github.com/williamwue/oh-my-stack/actions/runs/42571114476)。
- 已记录的本机验收为 macOS 27.2 / Apple Silicon、PowerShell 7.6.9。
  49 项 Mock 断言、10 份脚本语法/BOM 检查、真实上游适配及旧安装包校验均通过。
- Codex 原生安装和更新 0.9.133、pstack 67 项与 AIHero 27 项 skills 发现通过。
  原生 Codex 和 T3 新子会话均完成一次 `pstack:bro` 代表性真实调用。
  这些是 2026-11-09 的后续验收，不意味着运行过全部 pstack 工作流。
- Claude 真实宿主与会话验证按要求排除。未验证 arena / architect 多候选及跨供应商派发。
  CI 中的假 Claude 夹具不等于真实 Claude 验收。
- 1.1.2 发布候选还须通过本版本 PR 的 CI、从已提交源码生成 ZIP、校验清单及包内文件核对。
  这些发布门槛以对应 PR 检查和草稿 Release 资产为准，不能用 1.1.1 记录替代。
