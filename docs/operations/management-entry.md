# oh-my-stack 管理入口

更新：2026-10-01。使用各平台官方工具及维护者现有登录。此次不新增 IAM、数据库角色或统一权限网关。

先读取 [云操作规范](official-cloud-operations.md) 与仓库 AGENTS.md；继续保留现有发布、迁移、候选 SHA、dry-run 和审批要求。[管理状态与非敏感坐标](../../scripts/ops/targets/management.json) 区分已绑定平台与模板／未启用平台。

## 官方只读命令

Git 命令在此项目仓库运行；管理工具在仓库外新建的空目录运行，以免加载应用 env、项目 hooks 或自定义启动脚本。CLI 使用原生 OAuth／keychain／阿里云 profile；不通过命令参数传密钥，不启用 debug／verbose。

```sh
git remote get-url origin
git branch --show-current
git rev-parse HEAD
git status --short
gh api user --jq .login
gh repo view williamwue/oh-my-stack --json nameWithOwner,defaultBranchRef
```

## 本地验收与历史资料

本地验证使用隔离副本，不复制或读取 `.env*`、`.dev.vars*`、生产密钥文件，不继承应用凭据。执行前检查测试初始化、清理和种子脚本。资源读取、本地测试／类型检查／构建、真实业务 E2E 分别记录；构建通过不代表生产验收。

`.cloud-ops` 仅保留历史资源元数据；旧插件、gateway、脚本/hooks 与凭据加载入口不得执行。已执行 SQL、历史证据及校验和保留原始字节。此次检查的主机注册与 Git hooks 未发现正在启用的旧入口。

## 2026-10-02 版本与验收范围

管理规范、非敏感目标清单与管理认证修复单独进入本地 Git 历史。本文的 2026-10-01 云端回执是当日记录，不代表 2026-10-02 再次实时读取；本轮只做本地修复和验证。提交不等于远程推送、合并、部署或生产验收。支付 SDK／业务功能／移动端等其他工作区修改保留待各自审阅提交；如本文包含 ZPay SDK 安装与命令记录，属于本机未单独提交的支付集成证据，全新 clone 不应据此认定 SDK 已就绪。未绑定平台保持原状态。
