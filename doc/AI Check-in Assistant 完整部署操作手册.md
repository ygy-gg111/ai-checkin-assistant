# AI Check-in Assistant 完整部署操作手册

> 最后更新：2026-07-20
> 适用项目：`ygy-gg111/ai-checkin-assistant`
> 生产架构：Next.js 16 + Vercel + TiDB Cloud + Cloudflare R2 + OpenAI API
> 生产域名：`https://ai-checkin-assistant.vercel.app`
> 当前生产分支：`main`
> 当前目标提交：`f5feeb7 feat: 完成 R2 迁移与部署配置`

本文不是通用概念介绍，而是本项目经过数周真实部署、排错和数据迁移后整理出的可执行手册。每一步都包含：

- 去哪个网站、从哪里进入；
- 应该点击哪个按钮；
- 应该填写什么；
- 怎样判断已经成功；
- 出错时先检查什么；
- 哪些敏感信息绝对不能截图、提交或发送到聊天。

## 快速目录

1. [最终架构与关键原则](#1-最终架构与关键原则)
2. [当前项目的真实配置](#2-当前项目的真实配置)
3. [部署前总检查](#3-部署前总检查)
4. [保护本地数据](#4-第-0-阶段保护本地数据)
5. [创建 TiDB Cloud](#5-第-1-阶段创建-tidb-cloud)
6. [创建 Cloudflare R2](#6-第-2-阶段创建-cloudflare-r2)
7. [迁移历史图片](#7-第-3-阶段迁移历史图片)
8. [Git 分支与发布准备](#8-第-4-阶段git-分支与发布准备)
9. [Vercel 首次导入](#9-第-5-阶段vercel-首次导入)
10. [Vercel Production 环境变量](#10-第-6-阶段vercel-production-环境变量)
11. [Deploy 与状态判断](#11-第-7-阶段deploy-与状态判断)
12. [生产验收](#12-第-8-阶段生产验收)
13. [故障排查表](#13-故障排查表)
14. [日常发布流程](#14-日常发布流程)
15. [回滚流程](#15-回滚流程)
16. [安全与成本维护](#16-安全与成本维护)
17. [最终完成标准](#17-最终完成标准)
18. [官方参考资料](#18-官方参考资料)
19. [当前恢复点](#19-当前恢复点2026-07-20)

---

## 1. 最终架构与关键原则

```text
用户浏览器
  │
  ├── 页面与 API ───────────────> Vercel（Next.js）
  │                                  │
  │                                  ├── PrismaTiDBCloud → TiDB Cloud
  │                                  └── OpenAI API
  │
  └── 图片 PUT（短时签名 URL）───> Cloudflare R2
                                      │
                                      └── r2.dev / 自定义图片域名公开读取
```

必须坚持下面 6 条：

1. 本地开发默认连接本地 MySQL，线上才连接 TiDB Cloud。
2. 图片由浏览器通过短时签名 URL 直接上传 R2，不经过 Vercel Function 转发大文件。
3. `develop` 用于开发，`main` 是 Vercel Production Branch。
4. `.env` 永远不提交 Git；生产密钥只填入 Vercel Production 环境。
5. Vercel 显示 `Ready` 只代表某次构建成功，还必须核对 Source commit 是否正确。
6. 任何密码、数据库连接串、JWT 私钥和 R2 Secret Access Key 都不能发到聊天或放进截图。

Vercel Function 的请求或响应体上限是 4.5 MB，因此项目必须使用 R2 直传；否则上传较大图片会出现 `413 FUNCTION_PAYLOAD_TOO_LARGE`。

---

## 2. 当前项目的真实配置

### 2.1 服务与资源

| 项目 | 当前值 |
| --- | --- |
| GitHub 仓库 | `ygy-gg111/ai-checkin-assistant` |
| 开发分支 | `develop` |
| 生产分支 | `main` |
| Vercel 项目 | `ai-checkin-assistant` |
| Vercel 域名 | `https://ai-checkin-assistant.vercel.app` |
| TiDB 集群 | `ai-checkin-prod` |
| TiDB 区域 | AWS Singapore (`ap-southeast-1`) |
| R2 Bucket | `ai-checkin-images` |
| R2 存储类型 | Standard |
| 当前 R2 读取地址 | `https://pub-398e875885c240f1bc362e7d16be08fd.r2.dev` |

### 2.2 数据库驱动切换方式

项目没有删除本地 MariaDB Adapter，而是通过环境变量切换：

```text
DATABASE_DRIVER=mariadb      → 本地 MySQL / MariaDB
DATABASE_DRIVER=tidb-cloud   → Vercel + TiDB Cloud
```

实际实现位于：

```text
src/lib/db/prisma.ts
```

因此不要按照旧文档卸载 `@prisma/adapter-mariadb`。

### 2.3 图片存储切换方式

```text
STORAGE_PROVIDER=local  → 本地 uploads 目录
STORAGE_PROVIDER=r2     → Cloudflare R2 签名直传
```

---

## 3. 部署前总检查

在 PowerShell 进入真实项目根目录：

```powershell
cd "D:\codex\project\xiaohongshu\AI Check-in Assistant\ai-checkin-assistant"
```

确认目录中能看到：

```text
package.json
src
prisma
scripts
doc
```

执行：

```powershell
git status
npm.cmd run prisma:validate
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

正确结果：

- Prisma schema 校验通过；
- TypeScript 无错误；
- ESLint 退出码为 0；
- `next build` 显示 `Compiled successfully`；
- 构建路由列表中能看到 `/api/auth/me`、`/api/posts`、`/api/upload/presign`、`/api/upload/complete`。

> PowerShell 如果提示不能运行 `npm.ps1` 或 `npx.ps1`，统一使用 `npm.cmd` 和 `npx.cmd`。

---

## 4. 第 0 阶段：保护本地数据

### 4.1 检查 `.env` 是否被 Git 忽略

```powershell
git check-ignore .env
git ls-files .env .env.local
```

正确结果：

- `git check-ignore .env` 能显示 `.env`；
- `git ls-files .env .env.local` 没有输出。

如果第二条命令输出了文件，停止部署，先把敏感文件移出 Git 追踪。

### 4.2 备份本地数据库

推荐使用 Navicat 或 MySQL 工具按 `.env` 中的本地账号导出完整 SQL。

命令行示例：

```powershell
New-Item -ItemType Directory -Force backup
mysqldump -u <本地数据库用户> -p ai_checkin > backup\ai_checkin-before-tidb.sql
```

判断正确：

- SQL 文件大小不为 0；
- 文件中能找到 `User`、`Post`、`PostImage` 等表；
- `backup` 不应提交 Git。

### 4.3 备份图片

本项目真实图片目录是根目录 `uploads`，不是 `public/uploads`。

```powershell
Copy-Item -Recurse uploads backup\uploads_before_r2
```

### 4.4 记录迁移前数量

至少记录：

- User；
- UserSetting；
- PromptTemplate；
- Post；
- PostImage；
- AIUsageLog；
- `uploads` 下实际文件数。

迁移后必须逐表对比。

---

## 5. 第 1 阶段：创建 TiDB Cloud

### 5.1 创建 Starter 集群

1. 打开 `https://tidbcloud.com/` 并登录。
2. 进入 TiDB Cloud 控制台。
3. 点击创建 Cluster / Database。
4. 套餐选择 **Starter**。
5. Cloud Provider 选择 **AWS**。
6. Region 选择 **Singapore (`ap-southeast-1`)**。
7. 集群名填写：

   ```text
   ai-checkin-prod
   ```

8. 月度消费上限保持 `$0.00`，避免意外收费。
9. 点击创建并等待 Overview 显示集群可用。

判断正确：

- 能进入 `ai-checkin-prod` Overview；
- 状态为 Available / Active；
- `Current Spend` 显示 Free；
- 地域为 Singapore。

### 5.2 获取连接串

在 `ai-checkin-prod` Overview：

1. 点击 **Connect** 或 **Connect to your app**。
2. 选择 Node.js / Prisma，或切换到 **Connection String** 标签。
3. 首次连接时创建数据库密码，并立即保存到密码管理器。
4. 复制完整的 MySQL 连接串。

连接串一般类似：

```text
mysql://<user>:<password>@<host>:4000/<database>?sslaccept=strict
```

注意：

- 必须保留用户名、密码、主机、端口、数据库名和查询参数；
- 出现 `Connections using insecure transport are prohibited` 时，检查 TLS/SSL 参数；
- 不要截图完整连接串；
- 不要把它提交到 Git。

### 5.3 本地环境变量分工

推荐本地 `.env` 同时保留：

```env
DATABASE_URL="mysql://本地用户:本地密码@127.0.0.1:3306/ai_checkin"
DATABASE_DRIVER="mariadb"

LOCAL_DATABASE_URL="mysql://本地用户:本地密码@127.0.0.1:3306/ai_checkin"
TIDB_MIGRATION_DATABASE_URL="mysql://TiDB用户:TiDB密码@TiDB主机:4000/数据库?sslaccept=strict"
```

作用区别：

| 变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | 本地日常开发使用；保持本地 MySQL 更稳定 |
| `DATABASE_DRIVER` | 本地填写 `mariadb` |
| `LOCAL_DATABASE_URL` | 一次性数据迁移脚本读取本地库 |
| `TIDB_MIGRATION_DATABASE_URL` | 一次性迁移脚本写入 TiDB |

### 5.4 初始化 TiDB schema

临时让 Prisma migration 使用 TiDB 连接串，再执行：

```powershell
npx.cmd prisma migrate deploy
```

正确结果：

```text
All migrations have been successfully applied.
```

如果 PowerShell 禁止脚本：

```text
错误：无法加载文件 npx.ps1
处理：把 npx 改成 npx.cmd
```

如果出现不安全连接错误：

```text
错误：Connections using insecure transport are prohibited
处理：重新从 TiDB 的 Connection String 页面复制 TLS 连接串，并确认 SSL 参数完整
```

### 5.5 迁移历史业务数据

项目已有脚本：

```text
scripts/migrate-local-to-tidb.ts
```

它按以下顺序迁移并保留原 ID：

```text
User
→ UserSetting
→ PromptTemplate
→ Post
→ PostImage
→ AIUsageLog
```

执行前确认 `LOCAL_DATABASE_URL` 和 `TIDB_MIGRATION_DATABASE_URL` 已填写，然后运行脚本。

本项目历史迁移核对结果：

| 表 | 本地 | TiDB |
| --- | ---: | ---: |
| User | 22 | 22 |
| UserSetting | 6 | 6 |
| PromptTemplate | 10 | 10 |
| Post | 17 | 17 |
| PostImage | 35 | 35 |
| AIUsageLog | 22 | 22 |

如果 Prisma Adapter 在 JSON 字段上报 `[object Object] is not valid JSON`，不要继续用 Prisma 强行迁移。本项目的迁移脚本已经改用 `mysql2/promise` 原生 SQL，以避开该序列化问题。

### 5.6 迁移后切回本地开发数据库

迁移完成后，把本地日常配置恢复为：

```env
DATABASE_URL="mysql://...@127.0.0.1:3306/ai_checkin"
DATABASE_DRIVER="mariadb"
```

然后重启开发服务器。仅修改 `.env` 不重启进程，旧进程仍可能继续使用 TiDB。

本项目已验证：本地开发连接本地 MySQL，比长期连接远程 TiDB 更稳定、更快；TiDB 继续作为生产部署数据库。

---

## 6. 第 2 阶段：创建 Cloudflare R2

### 6.1 创建 Bucket

1. 打开 `https://dash.cloudflare.com/` 并登录。
2. 左侧菜单展开 **Storage & databases**。
3. 点击 **R2 Object Storage**。
4. 进入 **Overview**。
5. 点击 **Create bucket**。
6. Bucket 名称填写：

   ```text
   ai-checkin-images
   ```

7. Default Storage Class 选择 **Standard**。
8. 创建 Bucket。

判断正确：

- 面包屑显示 `R2 Object Storage > ai-checkin-images`；
- Overview 中 Default Storage Class 为 Standard；
- Bucket 初始大小可以是 0 B。

### 6.2 开启公共读取地址

进入 Bucket `ai-checkin-images`：

1. 点击顶部 **Settings**。
2. 找到 **Public Development URL**。
3. 点击 **Enable**。
4. 弹窗要求确认时输入 `allow`。
5. 点击 **Allow**。
6. 复制生成的 `https://pub-....r2.dev` 地址。

本项目当前地址：

```text
https://pub-398e875885c240f1bc362e7d16be08fd.r2.dev
```

判断正确：

- Bucket Overview 的 Public Access 显示 Enabled；
- Settings 中能看到 Public Development URL；
- 上传一个测试对象后，拼接 URL 能在无登录浏览器中打开。

`r2.dev` 仅适合测试和低流量阶段，Cloudflare 会对它进行可变限流。正式长期分享时应绑定自定义域名。

### 6.3 创建最小权限 API Token

如果在 Bucket 内看不到 Token 入口：

1. 点击页面左上角面包屑里的 **R2 Object Storage**，返回 R2 总览；或点击左侧 R2 的 **Overview**。
2. 在 R2 Overview 找到 **API Tokens**，点击 **Manage**。
3. 页面会显示 **Account API Tokens** 和 **User API Tokens**。
4. 点击右上方 **Create Account API token**。

不要选择 User API Token。本项目部署使用 Account API Token。

创建页面填写：

| 项目 | 选择 |
| --- | --- |
| Token name | `ai-checkin-images-upload` |
| Permissions | **Object Read & Write** |
| Bucket scope | **Apply to specific buckets only** |
| Bucket | `ai-checkin-images` |
| TTL | Forever |

不要选：

- Admin Read & Write；权限过大；
- Object Read only；项目无法上传；
- Apply to all buckets；范围过大。

创建后页面会显示：

```text
Access Key ID
Secret Access Key
```

立即复制保存。Secret Access Key 通常只显示一次。

如果密钥曾以明文截图或发送到聊天，立即删除该 Token 并重新创建。

### 6.4 找到 Account ID

返回 R2 Overview，在右侧或 Account Details 区域找到 **Account ID** 并复制。

也可以从 S3 API Endpoint 判断：

```text
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

中间部分就是 `R2_ACCOUNT_ID`。

### 6.5 配置 R2 CORS

因为浏览器会直接 PUT 到 R2，必须配置 CORS：

1. 进入 `R2 Object Storage > ai-checkin-images`。
2. 点击 **Settings**。
3. 找到 **CORS Policy**。
4. 点击 Add / Edit CORS policy。
5. 测试阶段填写：

```json
[
  {
    "AllowedOrigins": [
      "http://127.0.0.1:3000",
      "http://localhost:3000",
      "https://ai-checkin-assistant.vercel.app"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

判断正确：

- 保存后策略仍能在 Settings 中看到；
- 浏览器上传不再报 CORS；
- R2 中出现新对象；
- 如果签名 URL 能用命令行上传但浏览器失败，优先检查 CORS。

### 6.6 本地 R2 环境变量

本地 `.env` 添加：

```env
STORAGE_PROVIDER="r2"
R2_ACCOUNT_ID="<Account ID>"
R2_ACCESS_KEY_ID="<Access Key ID>"
R2_SECRET_ACCESS_KEY="<Secret Access Key>"
R2_BUCKET="ai-checkin-images"
R2_PUBLIC_BASE_URL="https://pub-398e875885c240f1bc362e7d16be08fd.r2.dev"
```

不要把真实密钥填写进 `.env.example`。

### 6.7 连通性验证

至少验证：

1. 能列出 Bucket 对象；
2. 能上传一个临时测试对象；
3. 能删除临时测试对象；
4. 公共 URL 能读取已上传图片。

如果是 `403`：

- 检查 Token 是否为 Object Read & Write；
- 检查是否只授权了正确 Bucket；
- 检查 Account ID、Access Key ID、Secret Access Key 是否复制完整；
- 检查 S3 endpoint 是否为 `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`。

---

## 7. 第 3 阶段：迁移历史图片

项目已有幂等迁移脚本：

```text
scripts/migrate-local-images-to-r2.ts
```

### 7.1 先 dry-run

```powershell
npm.cmd run storage:migrate:r2
```

dry-run 只检查：

- 数据库中还有多少 `/uploads/...` 本地引用；
- 对应文件是否存在；
- 每个文件会映射到哪个 R2 URL；
- 不上传、不修改数据库。

正确输出类似：

```text
Found 24 local image records.
Dry run complete: 22 ready, 2 missing.
```

### 7.2 正式迁移

确认 dry-run 后执行：

```powershell
npm.cmd run storage:migrate:r2 -- --apply
```

脚本行为：

- 按文件内容 SHA-256 去重；
- 上传到 `uploads/<userId>/legacy/...`；
- 先更新 TiDB，再更新本地 MySQL；
- 对已存在对象复用，不重复上传；
- 缺失文件只记录，不会伪造数据。

本项目结果：

```text
22 条图片记录成功迁移
16 个去重后的 R2 对象
2 条源文件缺失，未迁移
```

缺失记录：

```text
/uploads/test/demo.jpg
/uploads/2026/07/1751959199058-1b7c68f1-54cb-441d-a631-2ea023c01e5b.png
```

判断正确：

- 再次 dry-run 时只剩已知缺失记录；
- TiDB 的 PostImage URL 已变成 R2 地址；
- R2 Object 列表中能看到 `uploads/<userId>/legacy/`；
- 公开 URL 返回图片而不是 404。

---

## 8. 第 4 阶段：Git 分支与发布准备

### 8.1 开发分支提交

先检查状态：

```powershell
git status --short --branch
git diff --check
```

不要使用 `git add .` 把以下内容全部带上：

- `.env`；
- `backup`；
- 本地日志；
- 临时测试输出；
- 无关的用户文档改动。

只添加本次部署相关文件，再提交：

```powershell
git commit -m "feat: 完成 R2 迁移与部署配置"
git push origin develop
```

本项目对应提交：

```text
f5feeb7 feat: 完成 R2 迁移与部署配置
```

### 8.2 合并 develop 到 main

Vercel 默认优先把 `main` 作为 Production Branch。仅推送 `develop` 不会更新生产域名。

确认本地检查已通过后，将 `develop` 快进到 `main`。如果当前工作区有未提交改动，建议使用独立 worktree 或让维护者处理，避免切分支覆盖用户文件。

本项目最终使用 fast-forward，无冲突。

也可以直接把 `develop` 推到远程 `main`：

```powershell
git push origin develop:main
```

判断正确：

- 首次成功输出包含 `develop -> main`；
- 再次执行显示 `Everything up-to-date`；
- `origin/develop` 与 `origin/main` 都指向同一提交；
- 当前目标是 `f5feeb7`。

如果 Codex 执行环境连接 GitHub 报 `Failed to connect to github.com:443` 或 `Connection was reset`，这不是 Git 冲突。可在用户自己的 VS Code 终端执行同一条命令。

---

## 9. 第 5 阶段：Vercel 首次导入

### 9.1 连接 GitHub

1. 打开 `https://vercel.com/` 并登录。
2. Dashboard 右上角点击 **Add New** / **New Project**。
3. 页面中找到 **Import Git Repository**。
4. 点击黑色按钮 **Continue with GitHub**。
5. 如果出现 2FA 推荐页：
   - 希望立即加强账号安全：点击 **Set Up Authenticator App**；
   - 先完成部署：点击 **Skip securing my account**，之后再到账号安全设置开启。
6. GitHub 授权时建议选 **Only select repositories**。
7. 只授权 `ai-checkin-assistant`。
8. 返回 Vercel 后，在仓库右侧点击 **Import**。

### 9.2 检查导入页面

顶部应显示：

```text
ygy-gg111/ai-checkin-assistant
main
```

如果此时最新代码还只在 `develop`，不要 Deploy。先完成上一节的 `develop → main`。

### 9.3 Build and Output Settings

本项目 GitHub 仓库根目录就是 Next.js 项目，所以填写：

| 项目 | 正确值 |
| --- | --- |
| Project Name | `ai-checkin-assistant` |
| Application Preset | Next.js |
| Root Directory | `./` |
| Build Command | 默认：`npm run build` / `next build` |
| Output Directory | Next.js default |
| Install Command | 默认；Vercel 自动识别 npm |

不要把 Root Directory 填成上级工作区路径。只有导入的是外层仓库时，才需要选 `ai-checkin-assistant` 子目录。

---

## 10. 第 6 阶段：Vercel Production 环境变量

### 10.1 为什么不能直接导入本地 `.env`

本地 `.env` 中的 `DATABASE_URL` 指向 `127.0.0.1`，Vercel 无法访问；它还包含只用于迁移的变量。

不要直接点击 **Import .env** 导入完整开发配置，除非已手工制作只含生产变量的副本。

### 10.2 添加位置

首次部署页面：

```text
New Project → Environment Variables
```

项目创建后：

```text
Project → Settings → Environment Variables
```

每个变量：

1. Key 填变量名；
2. Value 填变量值，不需要复制 `.env` 最外层双引号；
3. Environments 只选择 **Production**；
4. 点击 **Add More** 添加下一项。

不要让 Preview 直接写正式 TiDB 和正式 R2，除非已经为 Preview 准备独立资源。

### 10.3 本项目完整 14 项变量

| Key | Value 来源 / 固定值 | 环境 |
| --- | --- | --- |
| `DATABASE_URL` | 复制本地 `TIDB_MIGRATION_DATABASE_URL` 的值，不是本地同名值 | Production |
| `DATABASE_DRIVER` | `tidb-cloud` | Production |
| `OPENAI_API_KEY` | 本地 `.env` 同名变量 | Production |
| `OPENAI_MODEL` | `gpt-4o-mini` | Production |
| `JWT_PRIVATE_KEY` | 本地 `.env` 同名变量，完整保留 `\n` | Production |
| `JWT_PUBLIC_KEY` | 本地 `.env` 同名变量，完整保留 `\n` | Production |
| `STORAGE_PROVIDER` | `r2` | Production |
| `R2_ACCOUNT_ID` | Cloudflare R2 Account ID | Production |
| `R2_ACCESS_KEY_ID` | R2 Token 创建结果 | Production |
| `R2_SECRET_ACCESS_KEY` | R2 Token 创建结果 | Production |
| `R2_BUCKET` | `ai-checkin-images` | Production |
| `R2_PUBLIC_BASE_URL` | `https://pub-398e875885c240f1bc362e7d16be08fd.r2.dev` | Production |
| `NEXT_PUBLIC_APP_NAME` | `AI Check-in Assistant` | Production |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `zh-CN` | Production |

不要添加：

```text
LOCAL_DATABASE_URL
TIDB_MIGRATION_DATABASE_URL
UPLOAD_DIR
NEXTAUTH_SECRET
```

本项目不是 NextAuth，鉴权依赖 JWT 公私钥。

### 10.4 复制 TiDB URL 的正确方式

在 `.env` 中找到：

```env
TIDB_MIGRATION_DATABASE_URL="mysql://..."
```

Vercel 中填写：

```text
Key: DATABASE_URL
Value: mysql://...
```

不要把 Key 写成 `TIDB_MIGRATION_DATABASE_URL`，也不要复制最外层英文双引号。

可使用 PowerShell 安全复制到剪贴板而不显示内容：

```powershell
$line = Get-Content .env | Where-Object { $_ -match '^TIDB_MIGRATION_DATABASE_URL=' } | Select-Object -Last 1
($line -replace '^TIDB_MIGRATION_DATABASE_URL=', '').Trim().Trim('"') | Set-Clipboard
```

### 10.5 环境变量修改后必须重新部署

Vercel 环境变量变更只会影响之后创建的新部署，不会改变已经完成的旧部署。

修改变量后：

1. 进入 **Deployments**；
2. 对正确提交创建新部署，或再向 Production Branch 推送一个提交；
3. 等待新部署 Ready；
4. 再验收。

---

## 11. 第 7 阶段：Deploy 与状态判断

### 11.1 首次点击 Deploy

确认以下项目后再点底部 **Deploy**：

- 仓库正确；
- 顶部是 `main`；
- Root Directory 是 `./`；
- Framework 是 Next.js；
- 14 个变量全部存在；
- 全部只选择 Production；
- `DATABASE_URL` 是 TiDB，不是 `127.0.0.1`。

成功后会出现：

```text
Congratulations!
You just deployed a new project
```

这只代表某个提交部署成功，还不能立即判断业务已经正确。

### 11.2 在 Overview 看当前生产版本

进入：

```text
Vercel Dashboard → ai-checkin-assistant → Overview
```

Production Deployment 卡片中检查：

- Status：Ready；
- Source branch：`main`；
- Source commit：应为目标提交；
- Domain：`ai-checkin-assistant.vercel.app`。

本次踩坑表现：

```text
Status: Ready
Source: main
Commit: 8232f7b 代码基本构架
```

虽然 Ready，但这是旧提交，因此线上没有登录按钮，API 全部 404。

正确目标：

```text
Source: main
Commit: f5feeb7 feat: 完成 R2 迁移与部署配置
```

### 11.3 看正在构建的新版本

Overview 的 Production Deployment 卡片下方会出现一行：

```text
黄色圆点 Building · feat: 完成 R2 迁移与部署配置
```

这表示新提交正在构建：

- 不要点击 **Cancel**；
- 不要点击 **Instant Rollback**；
- 可以点击 Building 那一行查看实时日志；
- 等黄色 Building 变为绿色 Ready；
- 刷新 Overview，确认上方 Production Deployment 的 Source 已切换到 `f5feeb7`。

### 11.4 Deployments 页面在哪里

进入项目后：

- 在顶部导航或左侧项目菜单点击 **Deployments**；
- 如果 Overview 没看到完整导航，点击项目名 `ai-checkin-assistant` 后寻找 Deployments；
- Deployments 列表最上面通常是最新部署。

查看每条部署的：

- 状态：Building / Ready / Error / Canceled；
- Environment：Production / Preview；
- Branch；
- Commit message；
- Commit SHA；
- Created time。

### 11.5 自动部署没有触发怎么办

先确认：

```powershell
git push origin develop:main
```

如果显示 `Everything up-to-date`，说明 GitHub `main` 已是最新。

然后可以在 Vercel：

```text
Project → Deployments → Create Deployment
```

输入 `main` 或目标 commit SHA，创建新部署。也可以对目标提交使用 Redeploy。

不要对旧的 `8232f7b` 点 Redeploy，否则只会再次部署旧代码。

### 11.6 Redeploy、Promote、Rollback 的区别

| 操作 | 用途 | 注意 |
| --- | --- | --- |
| Redeploy | 重新构建同一个提交 | 只对正确 commit 使用 |
| Promote to Production | 把已验证的 Preview/Deployment 指向生产域名 | 先确认提交和环境变量 |
| Instant Rollback | 立即把生产域名切回旧部署 | 仅用于新版本严重故障；不要在正常构建时点 |
| Cancel | 停止正在进行的构建 | 除非确定构建卡死或部署错误，否则不要点 |

---

## 12. 第 8 阶段：生产验收

### 12.1 先做无登录黑盒检查

生产地址：

```text
https://ai-checkin-assistant.vercel.app/zh-CN
```

检查：

- 页面返回 200；
- 页面标题为 AI Check-in Assistant；
- 登录/注册按钮存在；
- 语言切换正常；
- 控制台没有大量脚本错误。

API 判断：

| 地址 | 未登录时正确表现 |
| --- | --- |
| `/api/auth/me` | 返回鉴权相关响应，不能是 404 |
| `/api/posts` | 返回 401/鉴权错误，不能是 404 |
| `/api/upload/presign` | GET 可能因方法或鉴权返回错误，但不能因路由不存在而 404 |

如果页面 200、但上述 API 都 404，而且登录按钮不存在，优先判断为部署了旧提交，而不是环境变量错误。

### 12.2 注册与登录

- [ ] 创建一个新的测试账号；
- [ ] 登录成功；
- [ ] `/api/auth/me` 能返回当前用户；
- [ ] 刷新页面后仍保持登录；
- [ ] 退出后受保护接口不可访问。

如果登录返回 500：

- 检查 `JWT_PRIVATE_KEY` 和 `JWT_PUBLIC_KEY`；
- 检查 `\n` 是否完整；
- 检查 Vercel 变量是否属于 Production；
- 修改变量后重新部署。

### 12.3 TiDB 数据

- [ ] 旧账号能够登录；
- [ ] 工作台能加载；
- [ ] 历史记录数量合理；
- [ ] 日历能看到旧打卡；
- [ ] Prompt 模板可用；
- [ ] 用户设置能读取和保存。

如果工作台偶发部分数据失败：

- 查看 Vercel Function Logs；
- 检查是否显示 TiDB 超时；
- 项目已有 `readOrFallback` 降级加载，部分统计异常不应拖垮整个工作台；
- 不要因此把本地开发也长期切到 TiDB。

### 12.4 R2 上传

按顺序测试：

1. 上传一张小于 1 MB 的 JPG/PNG/WebP；
2. 上传一张大于 4.5 MB、但小于项目 10 MB 上限的图片；
3. 创建打卡；
4. 到 Cloudflare `R2 > ai-checkin-images > Objects` 查看新对象；
5. 打开图片公开 URL；
6. 刷新页面；
7. 在历史和日历重新打开图片。

正确结果：

- 浏览器先请求 `/api/upload/presign`；
- 图片直接 PUT 到 R2；
- 再请求 `/api/upload/complete`；
- R2 出现 `uploads/<userId>/<year>/<month>/...`；
- 数据库保存 `https://pub-...r2.dev/...`；
- 不出现 Vercel 413。

### 12.5 AI 生成

- [ ] 选择 Prompt 模板后生成内容；
- [ ] 模板选择实际影响生成请求；
- [ ] OpenAI 调用成功；
- [ ] AIUsageLog 有记录；
- [ ] 历史、日历、工作台能看到新打卡；
- [ ] 页面刷新后内容仍存在。

---

## 13. 故障排查表

| 现象 | 最可能原因 | 先去哪里看 | 处理 |
| --- | --- | --- | --- |
| `npm.ps1` / `npx.ps1` 禁止运行 | PowerShell Execution Policy | 本地终端 | 改用 `npm.cmd` / `npx.cmd` |
| TiDB 提示 insecure transport | 连接串缺 TLS | TiDB Connect 页面 | 重新复制完整连接串并保留 SSL 参数 |
| Prisma JSON 报 `[object Object]` | Adapter 序列化兼容问题 | 迁移脚本日志 | 使用现有 `mysql2/promise` 迁移脚本 |
| 本地页面突然很慢 | 本地开发在连远程 TiDB | `.env` | 改回本地 `DATABASE_URL` + `mariadb`，重启服务 |
| R2 Token 页面找不到 | 仍在 Bucket 内页 | R2 顶部面包屑 | 返回 R2 Overview → API Tokens → Manage |
| R2 403 | 权限、Bucket 或密钥错误 | R2 Token 配置 | Object Read & Write + specific bucket |
| 浏览器 R2 CORS error | Origin/Headers/Methods 不匹配 | Bucket Settings → CORS | 加生产域名、PUT、Content-Type、ETag |
| 图片可上传但打不开 | Public URL 未启用或 Base URL 错 | Bucket Settings | Public Access Enabled；检查 `R2_PUBLIC_BASE_URL` |
| Vercel 413 | 图片仍通过 Function 代理 | 浏览器 Network | 必须 presign 后直接 PUT R2 |
| Vercel Build Error | 构建、依赖或环境变量问题 | Deployments → 失败部署 → Build Logs | 从日志底部第一条真实错误开始处理 |
| Vercel Ready 但登录按钮不见 | 部署了旧 commit | Overview → Production Deployment → Source | 等待/部署 `f5feeb7`，不要只看 Ready |
| 所有 `/api/*` 都 404 | 旧代码部署或错误项目/根目录 | Source commit、Root Directory | 核对 main、commit、`./` |
| 修改变量后线上没变化 | 变量不会作用于旧部署 | Settings → Environment Variables | 创建新部署 |
| 新部署一直 Building | 安装/构建较慢或卡住 | 点击 Building 行看日志 | 正常先等待；超过 10 分钟看最后日志 |
| Git push 连接重置 | 当前执行环境网络问题 | Git 错误文本 | 在用户 VS Code 终端重试，不要误判为冲突 |

---

## 14. 日常发布流程

后续每次上线不要重复创建 TiDB、R2 和 Vercel 项目，只按以下流程：

### 14.1 develop 验证

```powershell
git checkout develop
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
git status
```

### 14.2 推送 develop

```powershell
git push origin develop
```

Vercel 如果启用了 Preview，会为 develop 生成 Preview URL。不要让 Preview 默认使用正式 TiDB/R2，除非明确接受。

### 14.3 合并并发布 main

推荐通过 GitHub Pull Request：

```text
develop → main
```

检查通过后合并。也可在明确确认 fast-forward 时执行：

```powershell
git push origin develop:main
```

### 14.4 观察部署

```text
Vercel → Project → Overview / Deployments
```

确认：

- 新部署来自 `main`；
- commit SHA 是本次目标；
- Building → Ready；
- Production Deployment Source 已切换；
- 生产域名重新验收。

---

## 15. 回滚流程

仅在新生产版本造成严重故障时使用：

1. 进入 Vercel 项目 Overview 或 Deployments。
2. 找到上一个已知正常的 Production Deployment。
3. 核对其 commit、创建时间和运行记录。
4. 使用 **Instant Rollback** 或将该部署 Promote/Assign 到生产。
5. 验证生产域名恢复。
6. Git 中继续修复问题，不要让线上回滚与代码分支长期不一致。

回滚 Vercel 不会自动回滚 TiDB 数据或删除 R2 对象。涉及数据库 schema 的发布必须另外准备数据库回滚方案。

---

## 16. 安全与成本维护

### 每周

- 查看 Vercel Usage、Build 与 Function Errors；
- 查看 TiDB Cloud 用量和连接异常；
- 查看 R2 Storage、Class A / B Operations；
- 查看 OpenAI Usage / Billing；
- 检查是否出现异常注册或高频生成。

### 每月

- 备份 TiDB；
- 统计 R2 对象并检查孤儿对象；
- 轮换疑似暴露的密钥；
- 确认 R2 Token 仍只授权 `ai-checkin-images`；
- 复查 Vercel Production 环境变量；
- 正式对外使用时，把 `r2.dev` 切换为 Cloudflare 自定义域名。

### 永远不要做

- 不要提交 `.env`；
- 不要把密钥放进 `NEXT_PUBLIC_*`；
- 不要把 R2 长期 Secret 返回浏览器；
- 不要截图 Secret Access Key；
- 不要把 Production 和 Preview 无意中连接到同一正式数据库；
- 不要看到 `Ready` 就跳过 commit 核对。

---

## 17. 最终完成标准

- [ ] `main` 和目标 commit 已推送 GitHub。
- [ ] Vercel Production Deployment Source 是目标 commit。
- [ ] `/zh-CN` 和 `/en` 正常打开。
- [ ] `/api/auth/me` 等 API 不再 404。
- [ ] 登录、注册、退出正常。
- [ ] TiDB 历史数据正常读取。
- [ ] R2 历史图片正常显示。
- [ ] 新图片能通过签名 URL 直传 R2。
- [ ] 大于 4.5 MB 的合法图片不经过 Vercel Function 请求体。
- [ ] 新打卡能生成并写入 TiDB。
- [ ] 历史、日历、工作台都能读取新记录。
- [ ] 刷新后图片和数据仍存在。
- [ ] `typecheck`、`lint`、`build` 全部通过。
- [ ] `.env` 未进入 Git。
- [ ] TiDB、R2、Vercel、OpenAI 用量可监控。

---

## 18. 官方参考资料

- [Vercel：Git 仓库部署与 Production Branch](https://vercel.com/docs/git)
- [Vercel：环境变量](https://vercel.com/docs/environment-variables)
- [Vercel：部署总览](https://vercel.com/docs/deployments/overview)
- [Vercel：Functions 限制](https://vercel.com/docs/functions/limitations)
- [Vercel：绕过 4.5 MB 请求体限制](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions)
- [TiDB Cloud：Prisma Serverless Adapter](https://docs.pingcap.com/developer/serverless-driver-prisma-example/)
- [Cloudflare R2：S3 API 与 Token](https://developers.cloudflare.com/r2/get-started/s3/)
- [Cloudflare R2：公开 Bucket](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [Cloudflare R2：CORS](https://developers.cloudflare.com/r2/buckets/cors/)
- [Cloudflare R2：r2.dev 限制](https://developers.cloudflare.com/r2/platform/limits/)

---

## 19. 当前恢复点（2026-07-20）

> 本节依据用户最后一张 Vercel Overview 截图记录，不代表打开本文时的实时状态；继续操作前应刷新 Vercel 页面重新确认。

Git 状态已经确认：

```text
origin/develop → f5feeb7
origin/main    → f5feeb7
```

Vercel Overview 中：

- 当前旧 Production Deployment 仍显示 `8232f7b`；
- 新版本 `feat: 完成 R2 迁移与部署配置` 正在 Building；
- 下一步等待它变成 Ready；
- 刷新 Overview，确认上方 Source 变成 `f5feeb7`；
- 然后执行第 12 节生产验收。
