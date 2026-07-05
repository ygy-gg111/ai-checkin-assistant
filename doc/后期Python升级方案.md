# 后期 Python 升级方案（Python Upgrade Plan）

## 一、升级目标

MVP 阶段项目采用：

```text
Next.js + OpenAI API
```

该方案开发简单、上线快，适合第一阶段验证产品。

后期当项目需要更强的 AI 能力时，再引入 Python 服务。

Python 升级目标包括：

- 接入本地大模型
- 支持 Qwen-VL / InternVL 图片理解
- 支持 OCR 文字识别
- 支持视频分析
- 支持图片质量评分
- 支持 OpenCV 图像处理
- 降低长期 AI API 成本
- 增强系统 AI 能力扩展性

------

# 二、什么时候需要升级 Python

以下情况出现后，再考虑引入 Python：

```text
1. OpenAI API 成本明显升高
2. 需要部署本地视觉模型
3. 需要 OCR 识别图片文字
4. 需要视频分析
5. 需要图片质量评分
6. 需要接入 OpenCV / YOLO / PaddleOCR
7. 需要更复杂的 AI 工作流
8. Vercel Serverless 不再满足运行需求
```

MVP 阶段不建议提前引入 Python，避免增加开发和部署复杂度。

------

# 三、升级后整体架构

升级前：

```text
用户
  │
  ▼
Next.js
  │
  ▼
AI Provider
  │
  ▼
OpenAI API
```

升级后：

```text
用户
  │
  ▼
Next.js
  │
  ▼
AI Provider
  │
  ├── OpenAI Provider
  ├── Gemini Provider
  └── Local Provider
            │
            ▼
      Python FastAPI
            │
            ▼
   本地模型 / OCR / OpenCV
```

核心思想：

```text
Next.js 不直接依赖 Python。
Python 只是 AI Provider 的一种实现。
```

------

# 四、Python 服务职责

Python 服务只负责 AI 能力，不负责业务逻辑。

Python 负责：

- 图片理解
- OCR 识别
- 图像预处理
- 视频抽帧
- 视频内容分析
- 本地模型推理
- 图片质量评分
- 后期多模态能力扩展

Python 不负责：

- 用户登录
- 数据库存储
- 历史记录
- Prompt 管理
- 页面渲染
- 业务权限
- 文件上传主流程

这些仍然由 Next.js 负责。

------

# 五、Python 服务目录结构

```text
ai-service/
│
├── app.py
├── requirements.txt
├── .env
│
├── routers/
│   ├── health.py
│   ├── vision.py
│   ├── ocr.py
│   ├── video.py
│   └── score.py
│
├── services/
│   ├── qwen_vl.py
│   ├── internvl.py
│   ├── paddle_ocr.py
│   ├── opencv_service.py
│   └── video_service.py
│
├── schemas/
│   ├── vision.py
│   ├── ocr.py
│   ├── video.py
│   └── response.py
│
├── utils/
│   ├── image.py
│   ├── file.py
│   └── logger.py
│
└── models/
    └── README.md
```

------

# 六、Python 接口设计

## 1. 健康检查

```text
GET /health
```

返回：

```json
{
  "status": "ok"
}
```

------

## 2. 图片分析

```text
POST /vision/analyze
```

请求：

```json
{
  "images": [
    "https://xxx.com/image1.jpg"
  ],
  "text": "今天练蛙泳，腿还是不怎么走水。"
}
```

返回：

```json
{
  "scene": "室内泳池",
  "activity": "游泳训练",
  "objects": ["泳池", "泳镜", "泳帽"],
  "emotion": "轻松",
  "summary": "用户完成了一次游泳训练。"
}
```

------

## 3. OCR 识别

```text
POST /ocr/recognize
```

请求：

```json
{
  "images": [
    "https://xxx.com/image1.jpg"
  ]
}
```

返回：

```json
{
  "texts": [
    {
      "image": "https://xxx.com/image1.jpg",
      "content": ["1000m", "45分钟", "蛙泳"]
    }
  ]
}
```

------

## 4. 图片评分

```text
POST /image/score
```

请求：

```json
{
  "images": [
    "https://xxx.com/image1.jpg"
  ]
}
```

返回：

```json
{
  "score": 82,
  "brightness": "normal",
  "clarity": "good",
  "composition": "centered",
  "suggestions": [
    "图片清晰度较好",
    "适合作为封面图"
  ]
}
```

------

# 七、Next.js 如何接入 Python

在 Next.js 中新增：

```text
lib/ai/local.ts
```

Local Provider 负责调用 Python。

```text
Business Service
      │
      ▼
AI Provider
      │
      ▼
Local Provider
      │
      ▼
Python FastAPI
```

这样前端和业务层不用改。

------

# 八、AI Provider 扩展示例

```text
lib/ai/
├── openai.ts
├── gemini.ts
├── qwen.ts
└── local.ts
```

原来：

```text
OpenAI Provider
```

后期新增：

```text
Local Provider
```

Local Provider 内部调用：

```text
http://ai-service:8000/vision/analyze
```

业务层仍然调用：

```text
generatePost()
```

无需知道底层是 OpenAI 还是 Python。

------

# 九、推荐升级路线

## 阶段一：MVP

```text
Next.js + OpenAI API
```

完成：

- 图片上传
- AI 文案生成
- 历史记录
- 日历打卡

------

## 阶段二：Python 辅助能力

新增 Python 服务，但不部署本地大模型。

先做：

- OCR
- OpenCV 图片评分
- 图片压缩
- 图片质量检测

此阶段 Python 主要作为图像处理服务。

------

## 阶段三：本地视觉模型

接入：

- Qwen-VL
- InternVL
- Florence

用于图片理解，减少部分 API 成本。

------

## 阶段四：视频分析

增加：

- 视频上传
- 视频抽帧
- 关键帧分析
- 视频文案生成

Python 负责视频处理。

------

## 阶段五：完整本地 AI 服务

最终形成：

```text
Next.js
  │
  ▼
Python AI Service
  │
  ├── Vision Model
  ├── OCR
  ├── Video
  ├── OpenCV
  └── Local LLM
```

------

# 十、部署升级方案

MVP：

```text
Vercel + 云数据库 + OSS
```

Python 阶段：

```text
云服务器 + Docker
```

完整架构：

```text
Nginx
  │
  ├── Next.js
  ├── Python FastAPI
  ├── MySQL
  ├── Redis
  └── OSS
```

如果部署本地大模型，需要：

```text
GPU 云服务器
```

------

# 十一、升级原则

Python 升级必须遵循以下原则：

- 不影响现有 Next.js 页面
- 不影响现有 API 结构
- 不修改数据库核心结构
- 只新增 AI Provider
- 只把 AI 能力下沉到 Python
- 业务逻辑仍然留在 Next.js

这样可以保证项目从 MVP 平滑演进到高级 AI 应用，而不是推倒重来。

------

# 十二、最终建议

当前阶段不要写 Python。

先完成：

```text
Next.js + OpenAI API
```

等产品跑通后，再根据真实需求决定是否增加 Python。

Python 的价值在于：

```text
本地模型
OCR
OpenCV
视频分析
复杂 AI 工作流
```

而不是简单转发 OpenAI 请求。

因此，Python 应该作为后期 AI 能力增强模块，而不是 MVP 的必需部分。