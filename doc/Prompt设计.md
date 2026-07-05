# Prompt 设计（Prompt Design）

## 一、设计目标

Prompt 是整个 AI 内容生成流程的核心。

为了保证 AI 输出内容稳定、可维护、可扩展，项目采用 **Prompt 模板化（Template）** 的设计方式，而不是在代码中直接拼接字符串。

Prompt 的设计目标包括：

- 保持账号人设一致
- 保持输出格式统一
- 提高生成质量
- 降低 Prompt 修改成本
- 支持不同场景快速切换
- 支持后续 A/B 测试

整个系统遵循以下原则：

> **Prompt 属于业务资源，而不是业务代码。**

------

# 二、Prompt 组成

一次完整的 Prompt 由多个模块组成。

```text
System Prompt
        │
        ▼
Persona Prompt（账号定位）
        │
        ▼
Scene Prompt（场景模板）
        │
        ▼
User Input（用户输入）
        │
        ▼
Image Context（图片）
        │
        ▼
Output Schema（输出格式）
        │
        ▼
Final Prompt
```

每个模块职责单一，可独立维护。

------

# 三、Prompt 分类

项目采用模板化管理。

```text
prompts/

├── system.md
├── persona.md
├── swimming.md
├── running.md
├── study.md
├── daily.md
├── output.md
└── tags.md
```

说明：

| 文件        | 作用            |
| ----------- | --------------- |
| system.md   | AI 系统角色定义 |
| persona.md  | 账号定位、人设  |
| swimming.md | 游泳打卡模板    |
| running.md  | 跑步打卡模板    |
| study.md    | 学习打卡模板    |
| daily.md    | 日常生活模板    |
| output.md   | 输出 JSON 规范  |
| tags.md     | 标签生成规则    |

------

# 四、Prompt Builder

系统不会直接把 Prompt 写死，而是通过 Prompt Builder 动态组装。

流程如下：

```text
读取 System Prompt
        │
        ▼
读取 Persona Prompt
        │
        ▼
读取场景模板
        │
        ▼
读取用户输入
        │
        ▼
读取图片内容
        │
        ▼
追加输出格式
        │
        ▼
生成 Final Prompt
```

最终只向 AI 发送一份完整 Prompt。

------

# 五、账号定位（Persona）

Persona 用于保持账号长期风格一致。

例如：

```text
账号定位：

一个普通程序员的生活重启记录。

记录：

- 下班后的生活
- 游泳
- 跑步
- 学习
- 做项目

内容要求：

真实

自然

轻松

不要鸡汤

不要营销

像真实用户分享生活。
```

Persona 不会随着每天的打卡内容变化，而是作为长期固定上下文。

------

# 六、场景模板（Scene Prompt）

不同场景使用不同 Prompt 模板。

例如：

游泳：

- 强调训练内容
- 身体状态
- 今日收获

跑步：

- 强调配速
- 距离
- 坚持过程

学习：

- 强调知识点
- 学习感受
- 今日总结

这样可以保证不同类型内容都有对应的表达方式。

------

# 七、用户输入

用户输入只负责提供当天发生的事情。

例如：

```text
今天练蛙泳。

腿还是不怎么走水。

不过比昨天轻松一点。
```

系统不会要求用户写完整文案。

AI 会结合：

- 图片
- Persona
- Scene Prompt

自动补全内容。

------

# 八、图片上下文

图片作为 AI 的主要输入之一。

AI 将自动分析：

- 场景
- 人物动作
- 环境
- 情绪
- 可用于文案的内容

图片分析结果无需展示给用户，仅作为生成文案的重要上下文。

------

# 九、输出规范

为了方便系统解析，所有 AI 输出统一采用 JSON。

统一字段包括：

```text
title

content

tags

coverText
```

所有 Provider 必须遵循相同的输出结构。

这样业务层无需根据不同模型编写不同解析逻辑。

------

# 十、Prompt 生命周期

一次 Prompt 的完整生命周期如下：

```text
读取模板
        │
        ▼
读取 Persona
        │
        ▼
读取用户输入
        │
        ▼
读取图片
        │
        ▼
构建 Prompt
        │
        ▼
发送 AI
        │
        ▼
返回 JSON
        │
        ▼
业务层解析
```

整个生命周期由 Prompt Builder 统一管理。

------

# 十一、Prompt 管理原则

Prompt 遵循以下设计原则：

- 模板与代码分离，不在业务代码中硬编码 Prompt。
- 不同场景使用独立模板，便于维护和扩展。
- Persona 长期固定，保持账号风格一致。
- 用户输入尽可能简单，由 AI 自动补充表达。
- 输出格式统一，方便业务层解析和存储。

------

# 十二、未来扩展

后续可进一步增加 Prompt 能力：

- 多语言 Prompt
- 多平台 Prompt（小红书、抖音、微博等）
- 多账号 Persona
- Prompt 版本管理
- Prompt A/B 测试
- 根据历史内容自动优化 Prompt

通过模板化设计，项目可以持续优化生成效果，而无需修改核心业务代码。