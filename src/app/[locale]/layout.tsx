import {AntdRegistry} from '@ant-design/nextjs-registry';
import type {Metadata} from 'next';
import {hasLocale, NextIntlClientProvider} from 'next-intl';
import {getMessages, getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';

import {routing} from '@/i18n/routing';

import 'antd/dist/reset.css';
import '../globals.css';

type Props = {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({locale, namespace: 'Metadata'});
  return {title: t('title'), description: t('description')};
}

export default async function LocaleLayout({children, params}: Props) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <AntdRegistry>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
