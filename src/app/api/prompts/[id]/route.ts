import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const { id } = resolvedParams;

    if (!id) {
      return apiError('模板 ID 参数错误', 400);
    }

    const body = await req.json().catch(() => ({}));
    const { name, content, isActive } = body;

    // 参数验证
    if (!content && name === undefined && isActive === undefined) {
      return apiError('未提交任何需要更新的字段', 400);
    }

    // TODO: 1. 检查模板是否存在 (Prisma PromptTemplate.findUnique)
    // TODO: 2. 如果存在，更新内容并升级小版本号或更新 updatedAt (Prisma PromptTemplate.update)

    // 框架阶段：模拟返回操作成功并附带当前更新时间
    return apiSuccess({
      id,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return apiError('更新 Prompt 模板失败', 500);
  }
}
