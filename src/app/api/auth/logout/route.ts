import {withApiHandler} from '@/lib/api-handler';
import {apiSuccess} from '@/lib/api-response';
import {AUTH_COOKIE_NAME} from '@/lib/auth/session';

export const POST = withApiHandler(async () => {
  const response = apiSuccess(null, '退出登录成功');
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
});
