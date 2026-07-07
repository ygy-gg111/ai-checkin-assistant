import {NextRequest} from 'next/server';

import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';
import {prisma} from '@/lib/db';

export const GET = withAuth(async (req: NextRequest) => {
    const {searchParams} = new URL(req.url);
    const scene = searchParams.get('scene');

    const data = await prisma.promptTemplate.findMany({
      where: {
        isActive: true,
        ...(scene && scene !== 'all' ? {scene} : {}),
      },
      orderBy: [
        {scene: 'asc'},
        {version: 'desc'},
      ],
    });

    return apiSuccess(data);
});
