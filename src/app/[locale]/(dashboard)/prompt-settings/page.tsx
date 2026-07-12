import type {Metadata} from 'next';

import {PromptEditor} from '@/components/prompts/prompt-editor';

import {buildDashboardPageMetadata} from '../page-metadata';

type Props = {
  params: Promise<{locale: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  return buildDashboardPageMetadata(params, 'promptsTitle', 'promptsDescription');
}

export default function PromptSettingsPage() {
  return <PromptEditor />;
}
