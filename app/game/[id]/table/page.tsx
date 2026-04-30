'use client';

import { use } from 'react';
import { PointsTable } from '@/components/views/PointsTable';

interface Props {
  params: Promise<{ id: string }>;
}

export default function TablePage({ params }: Props) {
  const { id } = use(params);
  return <PointsTable gameId={id} />;
}
