import {NextRequest} from 'next/server';

import {ApiError, withApiHandler} from '@/lib/api-handler';
import {apiSuccess} from '@/lib/api-response';
import {verifyPassword} from '@/lib/auth/password';
import {AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS, signJwt} from '@/lib/auth/session';
import {prisma} from '@/lib/db';

type LoginBody = {
  email?: unknown;
  password?: unknown;
};

export const POST = withApiHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => null) as LoginBody | null;
  if (!body) {
    throw new ApiError('BAD_REQUEST', '请求内容必须是有效的 JSON');
  }

  const normalizedEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!normalizedEmail || !password) {
    throw new ApiError('BAD_REQUEST', '请输入邮箱和密码');
  }

  const user = await prisma.user.findUnique({
    where: {email: normalizedEmail},
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      passwordHash: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new ApiError('UNAUTHORIZED', '邮箱或密码错误');
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    throw new ApiError('UNAUTHORIZED', '邮箱或密码错误');
  }

  const token = signJwt(user.id);

  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
  const response = apiSuccess({user: safeUser});

  response.cookies.set(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);

  return response;
});
