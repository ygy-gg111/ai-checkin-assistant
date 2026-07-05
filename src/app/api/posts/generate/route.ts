import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      topic,
      dayCount,
      style = 'normal',
      inputText,
      images = [],
      promptTemplateId,
    } = body;

    // 参数校验
    if (!topic || !inputText) {
      return apiError('打卡主题(topic)和用户描述(inputText)为必填项', 400);
    }
    if (!Array.isArray(images) || images.length === 0) {
      return apiError('请传参至少一张打卡图片地址(images)', 400);
    }

    // TODO: 1. 依据 promptTemplateId 或 topic 查询对应的 PromptTemplate (Prisma PromptTemplate.findFirst)
    // TODO: 2. 组装组装系统提示词语与用户输入，调用 AI Provider (如 OpenAI/Claude) 接口生成文案与分析结果
    // TODO: 3. 记录 AI 使用日志 (Prisma AIUsageLog.create)
    // TODO: 4. 将生成的打卡记录与图片关联持久化至数据库 (Prisma Post.create + PostImage.create)

    // 框架阶段：返回规范化的生成结果数据结构
    const mockPostId = `post_${Date.now().toString(36)}`;
    const resultData = {
      postId: mockPostId,
      analysis: {
        scene: topic === 'swimming' ? '室内泳池' : topic === 'running' ? '户外跑道' : '日常生活',
        activity: topic === 'swimming' ? '游泳训练' : topic === 'running' ? '长跑练习' : '自律打卡',
        emotion: '轻松、充实',
        summary: `用户自述：${inputText.slice(0, 30)}...`,
      },
      result: {
        title: topic === 'swimming' 
          ? '下班后的45分钟，继续和水较劲' 
          : topic === 'running'
          ? '迎着晚风奔跑，今天也是多巴胺拉满的一天'
          : '自律打卡日常，认真记录每一寸时光',
        content: `今天是${topic === 'swimming' ? '游泳' : topic === 'running' ? '跑步' : '日记'}打卡${dayCount ? `第 ${dayCount} 天` : '日常'}。\n\n${inputText}\n\n不刻意贩卖焦虑，主打一个真实且享受当下的节奏。每一次记录都是给平凡生活的一个赞，继续坚持！`,
        tags: [
          `#${topic === 'swimming' ? '游泳打卡' : topic === 'running' ? '跑步打卡' : '日常记录'}`,
          '#普通人日常',
          '#坚持100天',
          '#小红书灵感记录',
        ],
        coverText: dayCount ? `Day ${dayCount}｜坚持打卡` : '记录今天的生活',
      },
    };

    return apiSuccess(resultData);
  } catch (error) {
    return apiError('AI 智能生成文案服务异常，请稍后重试', 502);
  }
}
