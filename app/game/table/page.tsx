'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PointsTable } from '@/components/views/PointsTable';

export default function TablePage() {
  return (
    <Suspense fallback={null}>
      <TablePageContent />
    </Suspense>
  );
}

function TablePageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  if (!id) return null;
  return <PointsTable gameId={id} />;
}
