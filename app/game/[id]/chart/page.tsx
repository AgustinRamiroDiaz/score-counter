'use client';

import { use } from 'react';
import { RoundChart } from '@/components/views/RoundChart';

interface Props {
  params: Promise<{ id: string }>;
}

export default function ChartPage({ params }: Props) {
  const { id } = use(params);
  return <RoundChart gameId={id} />;
}
