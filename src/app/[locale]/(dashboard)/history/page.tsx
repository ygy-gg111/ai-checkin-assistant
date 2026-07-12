import type {Metadata} from 'next';

import {HistoryRecords} from '@/components/history/history-records';

import {buildDashboardPageMetadata} from '../page-metadata';

type Props = {
  params: Promise<{locale: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  return buildDashboardPageMetadata(params, 'historyTitle', 'historyDescription');
}

export default function HistoryPage() {
  return <HistoryRecords />;
}
