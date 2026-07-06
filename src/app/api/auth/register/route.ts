import {NextRequest} from 'next/server';

import {apiError, apiSuccess} from '@/lib/api-response';
import {hashPassword} from '@/lib/auth/password';
import {prisma} from '@/lib/db';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

type RegisterBody = {
  email?: unknown;
  password?: unknown;
  name?: unknown;
};

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as RegisterBody | null;

    if (!body) {
      return apiError('请求内容必须是有效的 JSON', 400);
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const submittedName = typeof body.name === 'string' ? body.name.trim() : '';

    if (!email || !password) {
      return apiError('邮箱和密码不能为空', 400);
    }

    if (email.length > 191 || !EMAIL_PATTERN.test(email)) {
      return apiError('请输入有效的邮箱地址', 400);
    }

    if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
      return apiError(`密码长度必须为 ${MIN_PASSWORD_LENGTH}～${MAX_PASSWORD_LENGTH} 个字符`, 400);
    }

    if (submittedName.length > 100) {
      return apiError('昵称不能超过 100 个字符', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: {email},
      select: {id: true},
    });

    if (existingUser) {
      return apiError('该邮箱已被注册', 409);
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: submittedName || email.split('@')[0],
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
      },
    });

    return apiSuccess({user}, '注册成功', 201);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return apiError('该邮箱已被注册', 409);
    }

    console.error('Failed to register user:', error);
    return apiError('注册异常或服务错误', 500);
  }
}
