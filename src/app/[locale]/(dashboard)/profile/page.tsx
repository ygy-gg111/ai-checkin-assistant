import type {Metadata} from 'next';

import {UserSettings} from '@/components/profile/user-settings';

import {buildDashboardPageMetadata} from '../page-metadata';

type Props = {
  params: Promise<{locale: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  return buildDashboardPageMetadata(params, 'profileTitle', 'profileDescription');
}

export default function ProfilePage() {
  return <UserSettings />;
}
