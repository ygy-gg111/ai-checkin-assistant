import {NextRequest, NextResponse} from 'next/server';

import {ApiError, withApiHandler} from '@/lib/api-handler';
import {AUTH_COOKIE_NAME, verifyJwt} from '@/lib/auth/session';
import {prisma} from '@/lib/db';

export type AuthSession = {
  user: {
    id: string;
    email: string;
    name: string | null;
    avatar: string | null;
    createdAt: Date;
  };
};

type AuthenticatedHandler<TContext> = (
  request: NextRequest,
  context: TContext,
  session: AuthSession
) => Promise<NextResponse>;

export async function requireAuth(request: NextRequest): Promise<AuthSession> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    throw new ApiError('UNAUTHORIZED');
  }

  const payload = verifyJwt(token);
  if (!payload) {
    throw new ApiError('SESSION_EXPIRED');
  }

  const user = await prisma.user.findUnique({
    where: {id: payload.sub},
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new ApiError('SESSION_EXPIRED');
  }

  return {user};
}

export function withAuth<TContext>(handler: AuthenticatedHandler<TContext>) {
  return withApiHandler(async (request: NextRequest, context: TContext) => {
    const session = await requireAuth(request);
    return handler(request, context, session);
  });
}
