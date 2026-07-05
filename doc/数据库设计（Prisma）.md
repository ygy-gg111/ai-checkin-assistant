# 数据库设计（Prisma Database Design）

## 一、设计目标

数据库用于保存用户打卡过程中的核心数据，包括用户输入、上传图片、AI 生成内容、Prompt 模板和历史记录。

第一阶段数据库设计遵循以下原则：

- 满足 MVP 功能需求
- 表结构简单清晰
- 支持历史记录查询
- 支持后续 Prompt 管理
- 支持未来多模型、多平台扩展
- 避免过度设计

------

# 二、核心数据模型

MVP 阶段主要包含以下模型：

```text
User
Post
PostImage
PromptTemplate
AIUsageLog
```

关系如下：

```text
User
  │
  │ 1
  │
  ▼
Post
  │
  │ 1:N
  ▼
PostImage

Post
  │
  │ 1:N
  ▼
AIUsageLog

PromptTemplate
  │
  │ 被 Post 使用
  ▼
Post
```

------

# 三、模型说明

## 1. User 用户表

用于保存用户基础信息。

MVP 阶段可以先做单用户模式，后期再接入登录系统。

字段包括：

- 用户 ID
- 昵称
- 邮箱
- 头像
- 创建时间
- 更新时间

------

## 2. Post 打卡内容表

用于保存每一次 AI 生成的打卡内容。

这是项目最核心的数据表。

保存内容包括：

- 打卡主题
- 第几天
- 用户输入
- 文案风格
- AI 分析结果
- AI 生成标题
- AI 生成正文
- AI 标签
- 封面文字
- 使用的模型
- 创建时间

------

## 3. PostImage 图片表

用于保存每条打卡记录对应的图片。

一条 Post 可以对应多张图片。

保存内容包括：

- 图片地址
- 图片宽度
- 图片高度
- 图片大小
- 图片顺序

------

## 4. PromptTemplate Prompt 模板表

用于保存不同场景下的 Prompt 模板。

例如：

- 游泳打卡
- 跑步打卡
- 学习记录
- 日常生活
- 小红书通用模板

后续可以在后台管理中修改 Prompt。

------

## 5. AIUsageLog AI 调用日志表

用于记录每次 AI 调用情况。

保存内容包括：

- 使用的 Provider
- 使用的模型
- 请求是否成功
- 错误信息
- Token 消耗
- 响应耗时

便于后续统计成本和排查问题。

------

# 四、Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String?  @unique
  name      String?
  avatar    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  posts     Post[]
}

model Post {
  id             String   @id @default(cuid())

  userId         String?
  user           User?    @relation(fields: [userId], references: [id])

  topic          String
  dayCount       Int?
  style          String   @default("normal")

  inputText      String   @db.Text

  analysisJson   Json?
  title          String
  content        String   @db.Text
  tags           Json
  coverText      String?

  provider       String   @default("openai")
  model          String   @default("gpt-4o-mini")

  promptTemplateId String?
  promptTemplate   PromptTemplate? @relation(fields: [promptTemplateId], references: [id])

  status         PostStatus @default(GENERATED)

  images         PostImage[]
  aiUsageLogs    AIUsageLog[]

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([userId])
  @@index([topic])
  @@index([createdAt])
}

model PostImage {
  id        String   @id @default(cuid())

  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)

  url       String
  width     Int?
  height    Int?
  size      Int?
  mimeType  String?
  sortOrder Int      @default(0)

  createdAt DateTime @default(now())

  @@index([postId])
}

model PromptTemplate {
  id          String   @id @default(cuid())

  name        String
  scene       String
  version     String   @default("1.0")
  content     String   @db.Text

  isActive    Boolean  @default(true)

  posts       Post[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([scene])
}

model AIUsageLog {
  id          String   @id @default(cuid())

  postId      String?
  post        Post?    @relation(fields: [postId], references: [id], onDelete: SetNull)

  provider    String
  model       String

  success     Boolean  @default(true)
  errorCode   String?
  errorMessage String? @db.Text

  inputTokens  Int?
  outputTokens Int?
  totalTokens  Int?

  durationMs   Int?

  createdAt    DateTime @default(now())

  @@index([postId])
  @@index([provider])
  @@index([model])
  @@index([createdAt])
}

enum PostStatus {
  DRAFT
  GENERATED
  DELETED
}
```

------

# 五、表关系说明

## User 与 Post

一个用户可以拥有多条打卡记录。

```text
User 1:N Post
```

MVP 阶段如果暂时不做登录，可以允许 `userId` 为空。

后续接入登录系统后，再绑定用户。

------

## Post 与 PostImage

一条打卡记录可以包含多张图片。

```text
Post 1:N PostImage
```

例如用户上传 3 张游泳照片，则生成 1 条 Post 和 3 条 PostImage。

------

## Post 与 PromptTemplate

一条打卡记录可以关联一个 Prompt 模板。

```text
PromptTemplate 1:N Post
```

这样后续可以追踪某篇文案是由哪个 Prompt 版本生成的。

------

## Post 与 AIUsageLog

一条打卡记录可能产生多次 AI 调用。

```text
Post 1:N AIUsageLog
```

例如：

- 第一次生成失败
- 第二次重试成功
- 用户重新生成

都可以记录下来。

------

# 六、核心字段说明

## Post.topic

表示打卡主题。

例如：

```text
swimming
running
study
daily
```

------

## Post.style

表示文案风格。

例如：

```text
normal
funny
warm
minimal
```

------

## Post.analysisJson

保存 AI 对图片和用户输入的分析结果。

示例：

```json
{
  "scene": "室内泳池",
  "activity": "游泳",
  "emotion": "轻松",
  "summary": "用户完成了一次蛙泳训练"
}
```

------

## Post.tags

保存 AI 生成的小红书标签。

示例：

```json
[
  "#游泳打卡",
  "#普通程序员",
  "#坚持100天",
  "#下班后生活"
]
```

------

## Post.status

用于标记内容状态。

```text
DRAFT       草稿
GENERATED   已生成
DELETED     已删除
```

MVP 阶段删除可以直接物理删除，也可以使用软删除。

------

# 七、数据库初始化数据

建议初始化以下 Prompt 模板。

```ts
const promptTemplates = [
  {
    name: "小红书通用模板",
    scene: "daily",
    version: "1.0",
    content: "适合小红书生活记录的通用 Prompt"
  },
  {
    name: "游泳打卡模板",
    scene: "swimming",
    version: "1.0",
    content: "适合游泳打卡内容生成的 Prompt"
  },
  {
    name: "跑步打卡模板",
    scene: "running",
    version: "1.0",
    content: "适合跑步打卡内容生成的 Prompt"
  },
  {
    name: "学习记录模板",
    scene: "study",
    version: "1.0",
    content: "适合学习记录内容生成的 Prompt"
  }
]
```

------

# 八、MVP 阶段简化方案

如果第一版想更快完成，也可以先只使用三张表：

```text
Post
PostImage
PromptTemplate
```

暂时不做：

- User
- AIUsageLog

等产品跑通后再补充。

推荐 MVP 最小表结构：

```text
Post
PostImage
PromptTemplate
```

这样既能满足核心功能，也不会增加开发负担。

------

# 九、后续扩展字段

未来可以逐步增加：

## 发布状态

```text
publishStatus
publishedAt
platform
```

用于记录是否已经发布到小红书。

------

## 数据统计

```text
viewCount
likeCount
commentCount
collectCount
```

用于记录内容表现。

------

## 多平台支持

```text
platform
xiaohongshu
douyin
weibo
wechat
```

用于适配不同平台文案。

------

## Prompt 版本管理

未来可新增：

```text
PromptVersion
```

用于支持 Prompt A/B 测试和版本回滚。

------

# 十、设计原则总结

数据库设计遵循以下原则：

- Post 是核心表，保存每次生成结果。
- 图片独立成表，支持一条记录多张图片。
- Prompt 模板独立管理，方便后续优化。
- AI 调用日志独立记录，便于成本统计和错误排查。
- MVP 阶段保持简单，后续按需扩展。

当前数据库结构既能支撑第一阶段快速上线，也能支持后续扩展为完整的 AI 内容创作平台。