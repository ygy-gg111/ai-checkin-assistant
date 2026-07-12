import type {Metadata} from 'next';

import {CreateCheckin} from '@/components/create/create-checkin';

import {buildDashboardPageMetadata} from '../page-metadata';

type Props = {
  params: Promise<{locale: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  return buildDashboardPageMetadata(params, 'createTitle', 'createDescription');
}

export default function CreatePage() {
  return <CreateCheckin />;
}
