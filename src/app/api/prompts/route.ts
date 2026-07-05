import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scene = searchParams.get('scene');

    // TODO: 1. 从数据库中查询所有的 Prompt 模板 (Prisma PromptTemplate.findMany)
    // TODO: 2. 若传入 scene，加入筛选过滤 where = { scene, isActive: true }

    // 框架阶段：返回规范初始预设模板数据
    const allTemplates = [
      {
        id: 'template-001',
        name: '游泳打卡模板',
        scene: 'swimming',
        version: '1.0',
        content: '你是一个专注于小红书爆款文案的创作专家，擅长将普通人的游泳打卡训练转化成有共鸣、真实自然的生活记录...',
        isActive: true,
      },
      {
        id: 'template-002',
        name: '跑步打卡模板',
        scene: 'running',
        version: '1.0',
        content: '你是一位资深夜跑和长跑爱好者，请根据用户的奔跑描述写出极具多巴胺、通透和热血感的小红书日常文案...',
        isActive: true,
      },
      {
        id: 'template-003',
        name: '学习记录模板',
        scene: 'study',
        version: '1.0',
        content: '你是一个自律高效的学习达人，帮助用户将读书、学习考研的每日打卡写得扎实具体、不贩卖焦虑...',
        isActive: true,
      },
      {
        id: 'template-004',
        name: '小红书通用模板',
        scene: 'daily',
        version: '1.0',
        content: '适合小红书生活记录的通用创作模板，注重生活气息与美感捕捉...',
        isActive: true,
      },
    ];

    const data = scene 
      ? allTemplates.filter((item) => item.scene === scene)
      : allTemplates;

    return apiSuccess(data);
  } catch (error) {
    return apiError('获取 Prompt 模板列表失败', 500);
  }
}
