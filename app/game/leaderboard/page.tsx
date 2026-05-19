'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Leaderboard } from '@/components/views/Leaderboard';

export default function LeaderboardPage() {
  return (
    <Suspense fallback={null}>
      <LeaderboardPageContent />
    </Suspense>
  );
}

function LeaderboardPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  if (!id) return null;
  return <Leaderboard gameId={id} />;
}
