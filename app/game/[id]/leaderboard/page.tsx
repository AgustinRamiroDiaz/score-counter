'use client';

import { use } from 'react';
import { Leaderboard } from '@/components/views/Leaderboard';

interface Props {
  params: Promise<{ id: string }>;
}

export default function LeaderboardPage({ params }: Props) {
  const { id } = use(params);
  return <Leaderboard gameId={id} />;
}
