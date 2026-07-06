# API 错误处理规范

## 一、目标

所有 Next.js API Route 使用统一错误类型、HTTP 状态码和用户提示，避免每个接口重复编写 `try/catch`，也避免把数据库异常、认证异常错误地展示成普通业务错误。

统一入口：

```text
src/lib/api-handler.ts
```

认证接口和公开接口使用：

```ts
withApiHandler(handler)
```

需要登录的业务接口使用：

```ts
withAuth(handler)
```

`withAuth` 会先校验 HttpOnly Cookie、JWT 和数据库用户，再进入业务处理函数。

------

## 二、统一错误响应

```json
{
  "code": 401,
  "message": "请先登录后再进行此操作",
  "data": null,
  "errorType": "UNAUTHORIZED"
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `code` | number | 业务错误码，当前与 HTTP 状态一致 |
| `message` | string | 可以直接展示给用户的中文提示 |
| `data` | null | 错误响应固定为 `null` |
| `errorType` | string | 稳定的机器可读错误类型，前端逻辑优先判断该字段 |

前端不应通过匹配中文 `message` 判断业务分支。

------

## 三、错误类型与提示

| errorType | HTTP | 默认用户提示 | 使用场景 |
| --- | ---: | --- | --- |
| `BAD_REQUEST` | 400 | 请求内容不正确 | JSON 无法解析、缺少基本请求内容 |
| `UNAUTHORIZED` | 401 | 请先登录后再进行此操作 | 未携带认证 Cookie |
| `SESSION_EXPIRED` | 401 | 登录凭证已失效，请重新登录 | JWT 无效、过期或对应用户已不存在 |
| `FORBIDDEN` | 403 | 无权执行此操作 | 已登录但不拥有目标数据或权限不足 |
| `NOT_FOUND` | 404 | 请求的数据不存在 | 用户、文章、模板等目标不存在 |
| `CONFLICT` | 409 | 数据状态冲突 | 重复邮箱、唯一索引冲突、重复操作 |
| `PAYLOAD_TOO_LARGE` | 413 | 上传内容过大 | 文件或请求体超过限制 |
| `VALIDATION_ERROR` | 422 | 请求数据校验失败 | 字段格式、长度、枚举值不合法 |
| `TOO_MANY_REQUESTS` | 429 | 请求过于频繁，请稍后重试 | 登录、注册或 AI 请求触发限流 |
| `DATABASE_ERROR` | 500 | 数据库服务暂时不可用 | 连接失败、连接池超时、数据库断开 |
| `INTERNAL_ERROR` | 500 | 服务异常，请稍后重试 | 未识别的服务端异常 |
| `AI_SERVICE_ERROR` | 502 | AI 服务暂时不可用，请稍后重试 | AI Provider 请求失败 |
| `SERVICE_UNAVAILABLE` | 503 | 服务暂时不可用，请稍后重试 | 依赖服务维护或暂时不可用 |

接口可以为明确业务场景覆盖默认提示，但不能改变同一错误类型的 HTTP 语义。

------

## 四、数据库错误映射

统一处理器当前自动识别以下 Prisma 错误：

| Prisma code | 映射结果 |
| --- | --- |
| `P2002` | `CONFLICT` |
| `P2025` | `NOT_FOUND` |
| `P1000`、`P1001`、`P1002`、`P1008`、`P1017`、`P2024` | `DATABASE_ERROR` |

数据库错误只在服务端日志中记录技术信息，响应中不得暴露连接地址、SQL、表结构或堆栈。

------

## 五、前端处理规则

```text
401 UNAUTHORIZED / SESSION_EXPIRED
  → 清空当前用户
  → 打开登录弹窗
  → 登录成功后按需重试原操作

403 FORBIDDEN
  → 提示无权操作

409 CONFLICT
  → 保留表单输入并展示冲突原因

422 VALIDATION_ERROR
  → 在对应字段附近展示错误

429 TOO_MANY_REQUESTS
  → 禁用重复提交并提示稍后重试

500 / 502 / 503
  → 显示服务异常提示
  → 不得错误地切换为 guest 或反复弹出登录框
```

应用初始化请求 `/api/auth/me` 时，只有 401 能把认证状态设置为 `guest`；500、502、503 应进入独立的 `error` 状态。

------

## 六、私有接口范围

以下接口必须经过 `withAuth`：

```text
GET    /api/auth/me
PUT    /api/user/profile
POST   /api/upload
POST   /api/posts/generate
GET    /api/posts
GET    /api/posts/:id
DELETE /api/posts/:id
POST   /api/posts/:id/regenerate
GET    /api/history
GET    /api/history/:id
DELETE /api/history/:id
POST   /api/history/:id/regenerate
GET    /api/calendar
GET    /api/calendar/day
GET    /api/prompts
PUT    /api/prompts/:id
```

以下接口保持公开：

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
```

前端隐藏按钮不是权限控制。数据查询和写入必须在 API 服务端按 `session.user.id` 进行隔离。

------

## 七、Route 编写示例

公开接口：

```ts
export const POST = withApiHandler(async (request) => {
  const body = await request.json().catch(() => null);
  if (!body) {
    throw new ApiError('BAD_REQUEST', '请求内容必须是有效的 JSON');
  }

  return apiSuccess({ok: true});
});
```

私有接口：

```ts
export const GET = withAuth(async (request, context, {user}) => {
  const posts = await prisma.post.findMany({
    where: {userId: user.id},
  });

  return apiSuccess(posts);
});
```

禁止在每个 Route 中重复捕获未知异常并返回自定义 500；未知异常统一交给 `withApiHandler`。

------

## 八、安全日志要求

允许记录：

- 错误类型与 Prisma 错误码。
- 请求路径、请求方法和服务端 trace ID。
- 不包含隐私的资源 ID。

禁止记录：

- 明文密码和密码哈希。
- JWT、Cookie 和私钥。
- 完整数据库连接串。
- 用户上传的敏感原文。

生产环境后续应接入结构化日志和错误追踪服务，开发环境可以保留控制台错误输出。
