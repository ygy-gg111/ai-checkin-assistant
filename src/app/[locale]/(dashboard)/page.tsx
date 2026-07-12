import type {Metadata} from 'next';

import {DashboardOverview} from '@/components/dashboard/dashboard-overview';

import {buildDashboardPageMetadata} from './page-metadata';

type Props = {
  params: Promise<{locale: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  return buildDashboardPageMetadata(params, 'dashboardTitle', 'dashboardDescription');
}

export default function DashboardPage() {
  return <DashboardOverview />;
}
