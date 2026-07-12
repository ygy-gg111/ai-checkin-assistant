import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';

type MetadataParams = Promise<{locale: string}>;
type Locale = 'zh-CN' | 'en';
type PageTitleKey =
  | 'dashboardTitle'
  | 'createTitle'
  | 'calendarTitle'
  | 'historyTitle'
  | 'promptsTitle'
  | 'profileTitle';
type PageDescriptionKey =
  | 'dashboardDescription'
  | 'createDescription'
  | 'calendarDescription'
  | 'historyDescription'
  | 'promptsDescription'
  | 'profileDescription';

export async function buildDashboardPageMetadata(
  params: MetadataParams,
  titleKey: PageTitleKey,
  descriptionKey: PageDescriptionKey,
): Promise<Metadata> {
  const {locale: rawLocale} = await params;
  const locale: Locale = rawLocale === 'en' ? 'en' : 'zh-CN';
  const [meta, pages] = await Promise.all([
    getTranslations({locale, namespace: 'Metadata'}),
    getTranslations({locale, namespace: 'Pages'}),
  ]);

  return {
    title: `${pages(titleKey)} | ${meta('title')}`,
    description: pages(descriptionKey),
  };
}
