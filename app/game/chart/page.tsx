'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RoundChart } from '@/components/views/RoundChart';

export default function ChartPage() {
  return (
    <Suspense fallback={null}>
      <ChartPageContent />
    </Suspense>
  );
}

function ChartPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  if (!id) return null;
  return <RoundChart gameId={id} />;
}
