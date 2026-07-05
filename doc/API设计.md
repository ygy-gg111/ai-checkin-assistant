# API 设计（API Design）

## 一、设计目标

API 负责连接前端页面、数据库、图片存储和 AI Provider。

MVP 阶段采用 Next.js API Routes，不单独拆分 Node 服务。

API 设计目标：

- 接口简单清晰
- 满足图片上传、文案生成、历史记录功能
- 返回结构统一
- 方便前端直接调用
- 后续可平滑扩展登录、多平台、任务队列等能力

------

# 二、接口规范

## Base URL

```text
http://localhost:3000/api
```

## 统一返回格式

成功：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

失败：

```json
{
  "code": 500,
  "message": "error message",
  "data": null
}
```

------

# 三、接口列表

| 接口                        | Method | 描述             |
| --------------------------- | ------ | ---------------- |
| `/api/upload`               | POST   | 上传图片         |
| `/api/posts/generate`       | POST   | 生成打卡文案     |
| `/api/posts`                | GET    | 获取历史记录     |
| `/api/posts/:id`            | GET    | 获取打卡详情     |
| `/api/posts/:id`            | DELETE | 删除打卡记录     |
| `/api/posts/:id/regenerate` | POST   | 重新生成文案     |
| `/api/prompts`              | GET    | 获取 Prompt 模板 |
| `/api/prompts/:id`          | PUT    | 更新 Prompt 模板 |

------

# 四、上传图片

## POST `/api/upload`

用于上传用户打卡图片。

### Content-Type

```text
multipart/form-data
```

### 请求参数

| 字段  | 类型   | 必填 | 说明                   |
| ----- | ------ | ---- | ---------------------- |
| files | File[] | 是   | 图片文件，支持 1～9 张 |

### 返回示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "images": [
      {
        "url": "/uploads/2026/07/xxx.jpg",
        "width": 1080,
        "height": 1440,
        "size": 234567,
        "mimeType": "image/jpeg"
      }
    ]
  }
}
```

------

# 五、生成打卡文案

## POST `/api/posts/generate`

用于根据图片和用户输入生成小红书文案。

### 请求参数

```json
{
  "topic": "swimming",
  "dayCount": 12,
  "style": "normal",
  "inputText": "今天练蛙泳，腿还是不怎么走水，不过感觉比昨天轻松一点。",
  "images": [
    "/uploads/2026/07/xxx.jpg"
  ],
  "promptTemplateId": "optional-template-id"
}
```

### 字段说明

| 字段             | 类型     | 必填 | 说明                                           |
| ---------------- | -------- | ---- | ---------------------------------------------- |
| topic            | string   | 是   | 打卡主题，例如 swimming、running、study、daily |
| dayCount         | number   | 否   | 第几天打卡                                     |
| style            | string   | 是   | 文案风格                                       |
| inputText        | string   | 是   | 用户输入描述                                   |
| images           | string[] | 是   | 图片地址                                       |
| promptTemplateId | string   | 否   | 指定 Prompt 模板                               |

### 返回示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "postId": "clx123456",
    "analysis": {
      "scene": "室内泳池",
      "activity": "游泳训练",
      "emotion": "轻松",
      "summary": "用户完成了一次蛙泳练习。"
    },
    "result": {
      "title": "下班后的45分钟，继续和水较劲",
      "content": "今天是游泳打卡第12天。下班后还是去了泳池，主要练蛙泳腿，虽然还是不太走水，但比昨天轻松了一点。不励志，也不装自律，就当普通程序员给自己重启一下。",
      "tags": [
        "#游泳打卡",
        "#普通程序员",
        "#坚持100天",
        "#下班后生活",
        "#小红书日常"
      ],
      "coverText": "Day 12｜下班去游泳"
    }
  }
}
```

------

# 六、获取历史记录

## GET `/api/posts`

用于获取历史生成记录。

### Query 参数

| 参数     | 类型   | 必填 | 说明              |
| -------- | ------ | ---- | ----------------- |
| page     | number | 否   | 页码，默认 1      |
| pageSize | number | 否   | 每页数量，默认 10 |
| topic    | string | 否   | 按主题筛选        |
| keyword  | string | 否   | 搜索标题或正文    |

### 请求示例

```text
GET /api/posts?page=1&pageSize=10&topic=swimming
```

### 返回示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "clx123456",
        "topic": "swimming",
        "dayCount": 12,
        "title": "下班后的45分钟，继续和水较劲",
        "coverText": "Day 12｜下班去游泳",
        "coverImage": "/uploads/2026/07/xxx.jpg",
        "tags": [
          "#游泳打卡",
          "#普通程序员"
        ],
        "createdAt": "2026-07-05T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 35
    }
  }
}
```

------

# 七、获取打卡详情

## GET `/api/posts/:id`

用于查看某条打卡记录详情。

### 返回示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "clx123456",
    "topic": "swimming",
    "dayCount": 12,
    "style": "normal",
    "inputText": "今天练蛙泳，腿还是不怎么走水。",
    "images": [
      {
        "url": "/uploads/2026/07/xxx.jpg",
        "width": 1080,
        "height": 1440
      }
    ],
    "analysis": {
      "scene": "室内泳池",
      "activity": "游泳训练",
      "emotion": "轻松",
      "summary": "用户完成了一次蛙泳练习。"
    },
    "title": "下班后的45分钟，继续和水较劲",
    "content": "今天是游泳打卡第12天……",
    "tags": [
      "#游泳打卡",
      "#普通程序员"
    ],
    "coverText": "Day 12｜下班去游泳",
    "provider": "openai",
    "model": "gpt-4o-mini",
    "createdAt": "2026-07-05T10:00:00.000Z"
  }
}
```

------

# 八、删除打卡记录

## DELETE `/api/posts/:id`

用于删除指定打卡记录。

### 返回示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "clx123456"
  }
}
```

------

# 九、重新生成文案

## POST `/api/posts/:id/regenerate`

用于基于原始图片和输入内容重新生成文案。

### 请求参数

```json
{
  "style": "funny",
  "promptTemplateId": "optional-template-id"
}
```

### 返回示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "postId": "clx123456",
    "result": {
      "title": "牛马下班后的泳池重启计划",
      "content": "今天继续去游泳……",
      "tags": [
        "#游泳打卡",
        "#牛马日常",
        "#普通程序员"
      ],
      "coverText": "牛马重启 Day 12"
    }
  }
}
```

------

# 十、获取 Prompt 模板

## GET `/api/prompts`

用于获取可用 Prompt 模板。

### Query 参数

| 参数  | 类型   | 必填 | 说明                    |
| ----- | ------ | ---- | ----------------------- |
| scene | string | 否   | 场景筛选，例如 swimming |

### 返回示例

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": "template-001",
      "name": "游泳打卡模板",
      "scene": "swimming",
      "version": "1.0",
      "isActive": true
    }
  ]
}
```

------

# 十一、更新 Prompt 模板

## PUT `/api/prompts/:id`

用于更新 Prompt 模板内容。

### 请求参数

```json
{
  "name": "游泳打卡模板",
  "content": "新的 Prompt 内容",
  "isActive": true
}
```

### 返回示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "template-001",
    "updatedAt": "2026-07-05T10:00:00.000Z"
  }
}
```

------

# 十二、错误码设计

| code | 说明            |
| ---- | --------------- |
| 0    | 成功            |
| 400  | 参数错误        |
| 401  | 未登录          |
| 404  | 数据不存在      |
| 413  | 文件过大        |
| 429  | 请求过于频繁    |
| 500  | 服务异常        |
| 502  | AI 服务调用失败 |

------

# 十三、接口调用顺序

一次完整生成流程：

```text
1. 用户选择图片
        │
        ▼
2. POST /api/upload
        │
        ▼
3. 返回图片 URL
        │
        ▼
4. POST /api/posts/generate
        │
        ▼
5. API 读取 Prompt 模板
        │
        ▼
6. AI Provider 调用 OpenAI
        │
        ▼
7. 保存数据库
        │
        ▼
8. 返回标题、正文、标签
```

------

# 十四、MVP 简化说明

MVP 阶段可以先只实现以下接口：

```text
POST   /api/upload
POST   /api/posts/generate
GET    /api/posts
GET    /api/posts/:id
DELETE /api/posts/:id
```

Prompt 管理接口可以第二阶段再做。

------

# 十五、后续扩展接口

未来可增加：

```text
POST   /api/posts/:id/copy-log
POST   /api/posts/:id/publish
POST   /api/images/score
POST   /api/videos/analyze
GET    /api/statistics
GET    /api/ai/providers
PUT    /api/ai/providers/default
```

扩展方向：

- 图片质量评分

- 视频内容分析

- 发布状态管理

- AI Provider 切换

- 统计每月 AI 成本

- 内容表现分析

- 用户、登录与历史记录 API 设计补充

  ## 一、设计说明

  MVP 阶段可以先支持单用户模式，但接口设计需要提前预留用户体系。

  用户相关接口主要包括：

  - 用户注册
  - 用户登录
  - 获取当前用户信息
  - 退出登录
  - 获取用户历史记录
  - 获取历史详情
  - 删除历史记录
  - 重新生成历史内容

  认证方式建议使用：

  ```text
  JWT + HttpOnly Cookie
  ```

  前端无需手动管理 Token，由浏览器自动携带 Cookie。

  ------

  # 二、用户接口

  ## 1. 用户注册

  ### POST `/api/auth/register`

  请求参数：

  ```json
  {
    "email": "test@example.com",
    "password": "123456",
    "name": "冠尧"
  }
  ```

  返回：

  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "user": {
        "id": "user_001",
        "email": "test@example.com",
        "name": "冠尧"
      }
    }
  }
  ```

  ------

  ## 2. 用户登录

  ### POST `/api/auth/login`

  请求参数：

  ```json
  {
    "email": "test@example.com",
    "password": "123456"
  }
  ```

  返回：

  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "user": {
        "id": "user_001",
        "email": "test@example.com",
        "name": "冠尧",
        "avatar": null
      }
    }
  }
  ```

  说明：

  登录成功后，服务端写入 HttpOnly Cookie。

  ------

  ## 3. 获取当前用户

  ### GET `/api/auth/me`

  返回：

  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "user": {
        "id": "user_001",
        "email": "test@example.com",
        "name": "冠尧",
        "avatar": null,
        "createdAt": "2026-07-05T10:00:00.000Z"
      }
    }
  }
  ```

  ------

  ## 4. 退出登录

  ### POST `/api/auth/logout`

  返回：

  ```json
  {
    "code": 0,
    "message": "success",
    "data": null
  }
  ```

  说明：

  退出登录时清除 Cookie。

  ------

  # 三、用户资料接口

  ## 1. 更新用户信息

  ### PUT `/api/user/profile`

  请求参数：

  ```json
  {
    "name": "普通程序员",
    "avatar": "/uploads/avatar.jpg"
  }
  ```

  返回：

  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "id": "user_001",
      "name": "普通程序员",
      "avatar": "/uploads/avatar.jpg"
    }
  }
  ```

  ------

  # 四、历史记录接口

  ## 1. 获取历史记录列表

  ### GET `/api/history`

  Query 参数：

  ```text
  page=1
  pageSize=10
  topic=swimming
  keyword=蛙泳
  ```

  参数说明：

  | 参数      | 类型   | 必填 | 说明              |
  | --------- | ------ | ---- | ----------------- |
  | page      | number | 否   | 页码，默认 1      |
  | pageSize  | number | 否   | 每页数量，默认 10 |
  | topic     | string | 否   | 主题筛选          |
  | keyword   | string | 否   | 关键词搜索        |
  | startDate | string | 否   | 开始日期          |
  | endDate   | string | 否   | 结束日期          |

  返回：

  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "list": [
        {
          "id": "post_001",
          "topic": "swimming",
          "dayCount": 12,
          "title": "下班后的45分钟，继续和水较劲",
          "contentPreview": "今天是游泳打卡第12天。下班后还是去了泳池...",
          "coverImage": "/uploads/2026/07/xxx.jpg",
          "coverText": "Day 12｜下班去游泳",
          "tags": [
            "#游泳打卡",
            "#普通程序员"
          ],
          "createdAt": "2026-07-05T10:00:00.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "pageSize": 10,
        "total": 35
      }
    }
  }
  ```

  ------

  ## 2. 获取历史详情

  ### GET `/api/history/:id`

  返回：

  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "id": "post_001",
      "topic": "swimming",
      "dayCount": 12,
      "style": "normal",
      "inputText": "今天练蛙泳，腿还是不怎么走水。",
      "images": [
        {
          "id": "img_001",
          "url": "/uploads/2026/07/xxx.jpg",
          "width": 1080,
          "height": 1440
        }
      ],
      "analysis": {
        "scene": "室内泳池",
        "activity": "游泳训练",
        "emotion": "轻松",
        "summary": "用户完成了一次蛙泳练习。"
      },
      "title": "下班后的45分钟，继续和水较劲",
      "content": "今天是游泳打卡第12天。下班后还是去了泳池...",
      "tags": [
        "#游泳打卡",
        "#普通程序员",
        "#坚持100天"
      ],
      "coverText": "Day 12｜下班去游泳",
      "provider": "openai",
      "model": "gpt-4o-mini",
      "createdAt": "2026-07-05T10:00:00.000Z"
    }
  }
  ```

  ------

  ## 3. 删除历史记录

  ### DELETE `/api/history/:id`

  返回：

  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "id": "post_001"
    }
  }
  ```

  说明：

  MVP 阶段可以物理删除。

  后期建议改为软删除：

  ```text
  status = DELETED
  ```

  ------

  ## 4. 重新生成历史文案

  ### POST `/api/history/:id/regenerate`

  请求参数：

  ```json
  {
    "style": "funny"
  }
  ```

  返回：

  ```json
  {
    "code": 0,
    "message": "success",
    "data": {
      "postId": "post_001",
      "title": "牛马下班后的泳池重启计划",
      "content": "今天继续去游泳，主打一个人到泳池，灵魂慢半拍...",
      "tags": [
        "#游泳打卡",
        "#牛马日常",
        "#普通程序员"
      ],
      "coverText": "牛马重启 Day 12"
    }
  }
  ```

  ------

  # 五、认证中间件

  需要登录的接口：

  ```text
  GET    /api/auth/me
  PUT    /api/user/profile
  POST   /api/posts/generate
  GET    /api/history
  GET    /api/history/:id
  DELETE /api/history/:id
  POST   /api/history/:id/regenerate
  ```

  不需要登录的接口：

  ```text
  POST /api/auth/register
  POST /api/auth/login
  POST /api/auth/logout
  ```

  ------

  # 六、推荐最终接口结构

  ```text
  /api/auth/register
  /api/auth/login
  /api/auth/logout
  /api/auth/me
  
  /api/user/profile
  
  /api/upload
  
  /api/posts/generate
  
  /api/history
  /api/history/:id
  /api/history/:id/regenerate
  
  /api/prompts
  /api/prompts/:id
  ```

  说明：

  - `/auth` 负责登录注册。
  - `/user` 负责用户信息。
  - `/upload` 负责文件上传。
  - `/posts/generate` 负责生成内容。
  - `/history` 负责历史记录。
  - `/prompts` 负责 Prompt 模板。

  这样职责更清晰，后期维护更舒服。

  # 日历接口设计补充

  ## 1. 获取月度打卡日历

  ### GET `/api/calendar`

  用于获取某个月的打卡概览。

  ### Query 参数

  ```
  year=2026
  month=7
  topic=swimming
  ```

  ### 参数说明

  | 参数  | 类型   | 必填 | 说明       |
  | ----- | ------ | ---- | ---------- |
  | year  | number | 是   | 年份       |
  | month | number | 是   | 月份       |
  | topic | string | 否   | 按主题筛选 |

  ### 返回示例

  ```
  {
    "code": 0,
    "message": "success",
    "data": {
      "year": 2026,
      "month": 7,
      "days": [
        {
          "date": "2026-07-01",
          "checked": true,
          "count": 1,
          "topics": ["swimming"]
        },
        {
          "date": "2026-07-02",
          "checked": false,
          "count": 0,
          "topics": []
        },
        {
          "date": "2026-07-03",
          "checked": true,
          "count": 2,
          "topics": ["swimming", "study"]
        }
      ]
    }
  }
  ```

  ## 2. 获取某一天打卡内容

  ### GET `/api/calendar/day`

  用于获取某一天的所有打卡内容。

  ### Query 参数

  ```
  date=2026-07-03
  topic=swimming
  ```

  ### 返回示例

  ```
  {
    "code": 0,
    "message": "success",
    "data": {
      "date": "2026-07-03",
      "list": [
        {
          "id": "post_001",
          "topic": "swimming",
          "dayCount": 12,
          "title": "下班后的45分钟，继续和水较劲",
          "coverImage": "/uploads/2026/07/xxx.jpg",
          "coverText": "Day 12｜下班去游泳",
          "tags": [
            "#游泳打卡",
            "#普通程序员"
          ],
          "createdAt": "2026-07-03T20:30:00.000Z"
        }
      ]
    }
  }
  ```