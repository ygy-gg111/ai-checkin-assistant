- 技术选型（Technology Stack）

  ## 一、技术选型原则

  本项目采用 **"简单、稳定、可扩展"** 的技术方案。

  第一阶段（MVP）优先完成产品验证，因此选择自己熟悉且开发效率最高的技术栈，避免为了未来可能用到的功能而过度设计。

  技术选型遵循以下原则：

  - **开发效率优先**：优先使用熟悉的技术，快速完成产品开发。
  - **架构可扩展**：后续可平滑接入更多 AI 模型、本地模型或 Python 服务。
  - **降低维护成本**：尽量减少服务数量，降低部署和维护复杂度。
  - **模块化设计**：AI 模型、Prompt、业务逻辑相互独立，方便后续扩展。
  
  ------
  
  # 二、整体技术栈
  
  | 模块     | 技术                       | 说明                         |
  | -------- | -------------------------- | ---------------------------- |
  | 前端     | Next.js 15                 | 页面开发、SSR、API Routes    |
  | 开发语言 | TypeScript                 | 提高代码可维护性             |
  | UI       | Tailwind CSS               | 快速构建响应式界面           |
  | ORM      | Prisma                     | 数据库访问与模型管理         |
  | 数据库   | MySQL                      | 存储用户和打卡数据           |
  | AI 模型  | OpenAI GPT-4o mini（默认） | 图片分析 + 文案生成          |
  | 文件存储 | 本地存储（MVP）            | 后续支持 OSS / Cloudflare R2 |
  | 请求库   | Axios                      | HTTP 请求封装                |
  | 状态管理 | Zustand                    | 管理前端全局状态             |
  | 表单     | React Hook Form            | 表单处理与校验               |
  | 部署     | Vercel / Docker（可选）    | 根据部署环境选择             |

  ------

  # 三、为什么选择 Next.js

  Next.js 是整个项目的核心框架。

  原因如下：

  ## 1. 前后端一体化

  Next.js 同时支持：

  - 页面开发
  - API 开发
  - Server Actions
  - 中间件（Middleware）
  
  无需额外搭建 Node 服务。
  
  整体结构更加简单。

  ------

  ## 2. 开发效率高

  只需要维护一个项目即可。

  ```text
  ai-checkin/
  
  ├── app/
  ├── components/
  ├── lib/
  ├── prisma/
  └── app/api/
  ```
  
  相比：
  
  ```text
  Frontend
  
  Backend
  
  Gateway
  ```
  
  维护成本更低。
  
  ------
  
  ## 3. TypeScript 支持完善

  Next 与 TypeScript 集成良好。

  可以统一：

  - 类型定义
  - API 返回结构
  - 数据模型

  降低维护成本。

  ------
  
  ## 4. 生态成熟

  拥有丰富生态：

  - Prisma
  - NextAuth
  - Tailwind CSS
  - React Hook Form
  - Zustand

  适合长期维护。

  ------

  # 四、为什么选择 OpenAI API
  
  MVP 阶段采用 OpenAI API 作为默认 AI Provider。
  
  推荐模型：
  
  > GPT-4o mini
  
  主要原因：
  
  ## 1. 同时支持图片和文本
  
  一次请求即可完成：
  
  - 图片分析
  - 文案生成
  - 标签推荐
  
  无需拆分多个模型。
  
  ------
  
  ## 2. 输出质量稳定
  
  GPT-4o mini 在图片理解和内容生成方面表现稳定，适合生活记录、小红书文案等场景。
  
  ------
  
  ## 3. 开发简单
  
  无需：
  
  - 部署模型
  - 配置 GPU
  - 安装 Python 推理环境
  
  通过 API 即可完成所有 AI 能力。
  
  ------
  
  ## 4. 后续可切换
  
  项目采用 AI Provider 模式。
  
  未来可切换：
  
  - OpenAI
  - Gemini
  - Qwen
  - Claude
  - 本地模型
  
  无需修改业务逻辑。
  
  ------
  
  # 五、为什么暂时不使用 Python
  
  虽然 Python 在 AI 生态中占据重要地位，但第一阶段暂不引入 Python 服务。
  
  原因如下：
  
  ## 当前目标
  
  第一阶段目标是：
  
  > 尽快完成产品 MVP，并验证产品价值。
  
  目前 OpenAI 已能够完成：
  
  - 图片理解
  - 文案生成
  - 标签推荐
  
  无需额外增加 Python 服务。
  
  ------
  
  ## 降低项目复杂度
  
  如果引入 Python：
  
  ```text
  Next.js
  
  ↓
  
  Node
  
  ↓
  
  Python
  
  ↓
  
  OpenAI
  ```
  
  Python 实际只负责转发请求，无法发挥真正价值，却增加了部署和维护成本。
  
  因此第一阶段保持：
  
  ```text
  Next.js
  
  ↓
  
  OpenAI API
  ```

  即可满足全部需求。
  
  ------
  
  ## 后续扩展
  
  未来如果需要：
  
  - 本地部署 Qwen-VL
  - OCR
  - OpenCV
  - 视频分析
  - YOLO
  - RAG
  
  再新增 Python AI 服务。
  
  整体架构无需推翻，只需新增 AI Provider 实现即可。
  
  ------
  
  # 六、AI Provider 设计
  
  所有 AI 调用统一通过 AI Provider 管理。
  
  整体结构如下：
  
  ```text
  AI Provider
  
  ├── OpenAI
  ├── Gemini
  ├── Claude
  ├── Qwen
  └── Local（预留）
  ```
  
  业务代码永远调用统一接口，例如：
  
  ```ts
  generatePost()
  ```
  
  具体使用哪个模型，由 Provider 决定。
  
  这样可以避免业务代码与具体模型耦合。
  
  ------
  
  # 七、文件存储方案
  
  MVP 阶段：
  
  采用本地存储：
  
  ```text
  /uploads
  ```
  
  开发简单，便于调试。
  
  后续可切换：
  
  - 阿里云 OSS
  - 腾讯云 COS
  - Cloudflare R2
  - Amazon S3
  
  业务代码无需修改，只需替换存储适配器。
  
  ------
  
  # 八、数据库方案
  
  采用 MySQL + Prisma。
  
  Prisma 负责：
  
  - 数据模型定义
  - 数据迁移
  - 类型安全
  - 查询封装
  
  所有数据库操作统一通过 Prisma 完成，避免直接编写 SQL。
  
  ------
  
  # 九、项目目录建议
  
  ```text
  ai-checkin/
  
  ├── app/                  # 页面
  ├── app/api/              # API Routes
  ├── components/           # 公共组件
  ├── lib/
  │   ├── ai/               # AI Provider
  │   ├── db/               # Prisma
  │   ├── prompt/           # Prompt 模板
  │   ├── storage/          # 文件存储
  │   └── utils/            # 工具函数
  ├── prisma/               # 数据模型
  ├── public/
  ├── uploads/              # 本地图片（MVP）
  ├── types/                # TypeScript 类型
  └── docs/                 # 项目文档
  ```
  
  ------
  
  # 十、后续技术演进
  
  项目采用渐进式架构设计。
  
  **第一阶段（MVP）**
  
  ```text
  Next.js
      │
      ▼
  AI Provider
      │
      ▼
  OpenAI API
  ```
  
  **第二阶段**
  
  新增更多 AI Provider：
  
  - Gemini
  - Claude
  - Qwen
  
  无需修改业务代码。
  
  **第三阶段**
  
  当需要本地模型时，再新增 Python AI 服务：
  
  ```text
  Next.js
      │
      ▼
  AI Provider
      │
      ├── OpenAI
      ├── Gemini
      └── Local Provider
               │
               ▼
        Python FastAPI
               │
               ▼
          Qwen-VL / InternVL
  ```
  
  这种渐进式架构既保证了 MVP 开发效率，又为未来扩展本地 AI 能力预留了足够空间，无需推翻现有系统设计。