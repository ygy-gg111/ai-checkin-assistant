import type zhMessages from '../../messages/zh-CN.json';
import type {routing} from '@/i18n/routing';

declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof zhMessages;
  }
}
