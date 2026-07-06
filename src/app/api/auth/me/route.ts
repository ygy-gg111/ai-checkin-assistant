import {NextRequest} from 'next/server';

import {withAuth} from '@/lib/auth/guard';
import {apiSuccess} from '@/lib/api-response';

export const GET = withAuth(async (_req: NextRequest, _context: unknown, {user}) => {
  return apiSuccess({user});
});
