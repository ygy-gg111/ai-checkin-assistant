import type {Metadata} from 'next';

import {CheckinCalendar} from '@/components/calendar/checkin-calendar';

import {buildDashboardPageMetadata} from '../page-metadata';

type Props = {
  params: Promise<{locale: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  return buildDashboardPageMetadata(params, 'calendarTitle', 'calendarDescription');
}

export default function CalendarPage() {
  return <CheckinCalendar />;
}
