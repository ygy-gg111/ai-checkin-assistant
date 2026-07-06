import {NextRequest} from 'next/server';

import {ApiError, withApiHandler} from '@/lib/api-handler';
import {apiSuccess} from '@/lib/api-response';
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

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => null) as RegisterBody | null;

  if (!body) {
    throw new ApiError('BAD_REQUEST', '请求内容必须是有效的 JSON');
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const submittedName = typeof body.name === 'string' ? body.name.trim() : '';

  if (!email || !password) {
    throw new ApiError('BAD_REQUEST', '邮箱和密码不能为空');
  }

  if (email.length > 191 || !EMAIL_PATTERN.test(email)) {
    throw new ApiError('VALIDATION_ERROR', '请输入有效的邮箱地址');
  }

  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new ApiError(
      'VALIDATION_ERROR',
      `密码长度必须为 ${MIN_PASSWORD_LENGTH}～${MAX_PASSWORD_LENGTH} 个字符`
    );
  }

  if (submittedName.length > 100) {
    throw new ApiError('VALIDATION_ERROR', '昵称不能超过 100 个字符');
  }

  const existingUser = await prisma.user.findUnique({
    where: {email},
    select: {id: true},
  });

  if (existingUser) {
    throw new ApiError('CONFLICT', '该邮箱已被注册');
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
});
