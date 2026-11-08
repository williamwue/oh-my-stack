# OMS 1.1.1

更新默认安装的 pstack，并提供可选的 Codex/T3 单人配置示例。

## 改动

- pstack 默认安装提交从 `22b5e137e945cb65dd29dac5fc703c13d83a00aa` 更新为
  `91ab921ab92d9ccfe503c93c3524410277f012e1`，对应上游 manifest 版本 0.9.133。
  这是经过本机检查的上游 main 提交，不承诺与 v0.9.133 标签逐字相同。
- 新增个人配置指南与完整角色示例：常规实现/探索与复杂判断分工；arena、architect 各两个候选；
  默认 high，常规角色按示例使用 medium。模型名称必须在当前宿主核对后使用。
- `configure pstack` 增加配置指南入口，仍提供原生设置指引，不自动重写个人配置。
- 保留上游工作流、模型默认值和 OMS T3 适配。个人覆盖独立保存，安装、更新不自动套用示例。

## 安装和升级

下载 `oms-1.1.1.zip` 与 `SHA256SUMS.txt`，校验后解压到新的长期目录。
Windows 与 macOS 使用同一份源码包；依赖要求与 1.1.0 相同。

```powershell
Get-FileHash ./oms-1.1.1.zip -Algorithm SHA256
```

macOS 可执行 `shasum -a 256 -c SHA256SUMS.txt`。本版校验清单只包含 ZIP。
进入解压后的 `oms-1.1.1` 目录，运行 `./oms.ps1`；macOS 使用 `pwsh -NoProfile -File ./oms.ps1`。

已有安装可运行 `./oms.ps1 update -Component pstack -Yes`。
`update` 继续跟踪上游 main，因此执行时可能取得比默认安装提交更新的版本。
个人配置示例需按 [配置指南](pstack-configuration.md) 主动合并，更新不会改变已有模型偏好。

电子书内容及授权未变化，目录继续使用 v1.1.0 的下载资产；本版不重复上传电子书。

## 验证与限制

- Windows PowerShell 5.1 隔离生命周期回归通过 47 项断言；10 份 PowerShell 文件通过语法及
  非 ASCII 脚本的 UTF-8 BOM 检查。夹具使用假的宿主 CLI，不调用模型。
- 真实上游 0.9.133 提交的适配检查与配置模板校验；模型及强度按当前 T3 能力目录核对。
- 模板角色与本机个人配置一致，已在当前 T3 会话收到更新后的全局指令。
- 不把配置校验或指令加载等同于实际子代理派发成功。本版未新增真实子代理运行验收。
- 发布时仓库 GitHub Actions 为禁用状态，本次推送未触发远端 CI；未更改该仓库设置。
  本机未安装 PowerShell 7，也未在 macOS 执行本次验收，因此这些环境本版未验证。
  Claude Code 本版未重新实测。
