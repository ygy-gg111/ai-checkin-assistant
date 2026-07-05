# AI Provider 设计（AI Provider Design）

## 一、设计目标

AI Provider 是整个项目中唯一负责调用 AI 模型的模块。

业务层不会直接调用 OpenAI 或其他模型，而是统一通过 AI Provider 进行访问，实现业务逻辑与具体模型解耦。

这样做的优势包括：

- 统一 AI 调用入口
- 降低业务层耦合
- 支持多模型切换
- 支持未来本地模型部署
- 统一异常处理
- 统一 Token 消耗统计
- 统一日志记录

整个系统遵循以下原则：

> **业务层永远不知道底层使用的是哪个 AI 模型。**

------

# 二、整体架构

整体架构如下：

```text
                    Business Service
                           │
                           ▼
                    AI Provider Layer
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
    OpenAI            Gemini（预留）     Qwen（预留）
        │
        ▼
   GPT-4o mini
```

目前 MVP 阶段仅实现 OpenAI Provider。

后续增加新的 Provider 时，无需修改业务代码。

------

# 三、职责划分

AI Provider 负责：

- 调用 AI 模型
- 构建请求参数
- 发送请求
- 返回统一数据结构
- Token 使用统计
- 错误处理
- 模型切换

AI Provider 不负责：

- Prompt 拼接
- 数据库存储
- 用户权限
- 文件上传
- 页面展示

这些工作由业务层负责。

------

# 四、目录结构

```text
lib/
└── ai/
    ├── provider.ts          # Provider 接口定义
    ├── index.ts             # Provider 工厂
    ├── openai.ts            # OpenAI Provider
    ├── gemini.ts            # Gemini（预留）
    ├── qwen.ts              # Qwen（预留）
    ├── local.ts             # 本地模型（预留）
    ├── prompt-builder.ts    # Prompt 构建器
    ├── schema.ts            # AI 输出 Schema
    ├── validator.ts         # JSON 校验
    └── types.ts             # AI 类型定义
```

整个 AI 模块统一放在 `lib/ai` 下，便于集中维护。

------

# 五、AI 调用流程

业务层调用 AI 的完整流程如下：

```text
Business Service
        │
        ▼
Prompt Builder
        │
        ▼
AI Provider
        │
        ▼
OpenAI API
        │
        ▼
返回 JSON
        │
        ▼
JSON Validator
        │
        ▼
Business Service
```

业务层无需关心 OpenAI API 的调用细节。

------

# 六、Prompt Builder

Prompt Builder 用于组装最终发送给 AI 的 Prompt。

构建流程如下：

```text
System Prompt
        │
        ▼
账号定位（Persona）
        │
        ▼
场景 Prompt
        │
        ▼
用户输入
        │
        ▼
图片内容
        │
        ▼
最终 Prompt
```

例如：

```text
System Prompt

+
普通程序员生活记录

+
游泳打卡模板

+
今天练蛙泳，腿还是不走水

+
图片

↓

最终 Prompt
```

Prompt Builder 的职责是保证 Prompt 结构统一，方便后续维护和优化。

------

# 七、统一返回结构

所有 Provider 返回统一的数据格式。

示例：

```json
{
  "success": true,
  "data": {
    "analysis": {
      "scene": "室内泳池",
      "activity": "游泳",
      "emotion": "轻松",
      "summary": "今天进行了蛙泳训练。"
    },
    "result": {
      "title": "下班后的45分钟，坚持继续。",
      "content": "今天练蛙泳，腿还是不怎么走水，不过感觉比昨天顺畅了一些……",
      "tags": [
        "#游泳打卡",
        "#坚持记录",
        "#普通程序员"
      ]
    }
  }
}
```

统一的数据结构能够避免业务层针对不同模型编写不同解析逻辑。

------

# 八、JSON Schema 校验

为了保证 AI 输出稳定，所有返回内容必须经过 JSON Schema 校验。

流程如下：

```text
OpenAI 返回结果
        │
        ▼
JSON Parse
        │
        ▼
Schema Validate
        │
        ▼
合法
        │
        ▼
返回业务层
```

如果返回格式不符合要求：

```text
JSON Parse
        │
        ▼
Schema Validate
        │
        ▼
失败
        │
        ▼
自动重试
        │
        ▼
仍失败
        │
        ▼
返回错误信息
```

统一校验可以有效减少 AI 返回格式异常导致的系统错误。

------

# 九、模型切换

项目采用 Provider 模式。

业务层始终调用：

```text
generatePost()
```

具体使用哪个模型，由 Provider 决定。

例如：

```text
OpenAI
```

后续可切换为：

```text
Gemini
```

或者：

```text
Qwen
```

业务代码无需修改。

------

# 十、异常处理

所有 AI 调用统一处理异常。

包括：

- 网络超时
- Token 超限
- API 调用失败
- JSON 解析失败
- Schema 校验失败

统一返回标准错误对象，避免异常向业务层扩散。

------

# 十一、日志记录

AI Provider 统一记录调用日志。

包括：

- Provider 名称
- 模型名称
- 请求时间
- 响应时间
- Token 使用量
- 是否成功
- 错误信息（如有）

日志仅用于系统监控和问题排查，不记录用户隐私内容。

------

# 十二、未来扩展

当前阶段使用 OpenAI API。

未来可逐步扩展：

- Gemini
- Claude
- Qwen
- 本地模型（Qwen-VL、InternVL 等）

当项目需要部署本地模型时，可新增 Local Provider，并由其负责与 Python AI 服务通信。

由于业务层始终依赖统一的 AI Provider 接口，因此新增模型不会影响现有业务逻辑，实现系统的平滑升级。