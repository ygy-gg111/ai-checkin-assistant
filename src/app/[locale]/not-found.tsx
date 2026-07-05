import {Button, Result} from 'antd';

import {Link} from '@/i18n/navigation';

export default function NotFound() {
  return (
    <Result
      status="404"
      title="404"
      subTitle="The page you requested does not exist."
      extra={
        <Link href="/">
          <Button type="primary">Back to dashboard</Button>
        </Link>
      }
    />
  );
}
