'use client';

import {AppstoreOutlined} from '@ant-design/icons';
import {Card, Empty, Space, Typography} from 'antd';
import {useTranslations} from 'next-intl';

type PageKey =
  | 'createTitle'
  | 'createDescription'
  | 'calendarTitle'
  | 'calendarDescription'
  | 'historyTitle'
  | 'historyDescription'
  | 'promptsTitle'
  | 'promptsDescription'
  | 'profileTitle'
  | 'profileDescription';

export function PagePlaceholder({titleKey, descriptionKey}: {titleKey: PageKey; descriptionKey: PageKey}) {
  const t = useTranslations('Pages');

  return (
    <Space orientation="vertical" size={20} style={{width: '100%'}}>
      <div>
        <Typography.Title level={2} style={{marginBottom: 4}}>{t(titleKey)}</Typography.Title>
        <Typography.Text type="secondary">{t(descriptionKey)}</Typography.Text>
      </div>
      <Card>
        <Empty image={<AppstoreOutlined style={{fontSize: 54, color: '#93c5fd'}} />} description={t('comingSoon')} />
      </Card>
    </Space>
  );
}
