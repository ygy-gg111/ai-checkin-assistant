'use client';

import {CalendarOutlined, LoginOutlined} from '@ant-design/icons';
import {Button, Typography} from 'antd';
import {useTranslations} from 'next-intl';
import type {ReactNode} from 'react';

import {useAuth} from '@/hooks/use-auth';

const {Title, Paragraph} = Typography;

interface GuestEmptyStateProps {
  /** Icon to display – defaults to a calendar icon */
  icon?: ReactNode;
  /** i18n key for title */
  titleKey: 'guest_calendarTitle' | 'guest_historyTitle' | 'guest_profileTitle' | 'guest_promptsTitle';
  /** i18n key for description */
  descKey: 'guest_calendarDesc' | 'guest_historyDesc' | 'guest_profileDesc' | 'guest_promptsDesc';
}

/**
 * A polished, full-page placeholder shown to unauthenticated visitors.
 *
 * Displays a contextual icon, descriptive text, and a prominent "Log in"
 * button that opens the global auth modal.
 */
export function GuestEmptyState({icon, titleKey, descKey}: GuestEmptyStateProps) {
  const t = useTranslations('Auth');
  const {openAuthModal} = useAuth();

  return (
    <div className="guest-empty-state">
      <div className="guest-empty-icon">
        {icon ?? <CalendarOutlined />}
      </div>
      <Title level={4} className="guest-empty-title">
        {t(titleKey)}
      </Title>
      <Paragraph type="secondary" className="guest-empty-desc">
        {t(descKey)}
      </Paragraph>
      <div className="guest-empty-actions">
        <Button
          type="primary"
          size="large"
          icon={<LoginOutlined />}
          className="guest-btn-primary"
          onClick={() => openAuthModal('login')}
        >
          {t('loginBtn')}
        </Button>
        <Button
          size="large"
          className="guest-btn-secondary"
          onClick={() => openAuthModal('register')}
        >
          {t('registerBtn')}
        </Button>
      </div>
    </div>
  );
}
