'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useGame } from '@/hooks/useGame';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const LineChart = dynamic(
  () => import('recharts').then((m) => m.LineChart),
  { ssr: false },
);
const Line = dynamic(() => import('recharts').then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(
  () => import('recharts').then((m) => m.ResponsiveContainer),
  { ssr: false },
);

const COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
];

interface Props {
  gameId: string;
}

export function RoundChart({ gameId }: Props) {
  const { game } = useGame(gameId);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const chartData = useMemo(() => {
    if (!game || game.rounds.length === 0) return [];
    return game.rounds.map((round) => {
      const point: Record<string, number | string> = { round: `R${round.number}` };
      const cumulative: Record<string, number> = {};
      // sum up to this round
      for (let i = 0; i <= game.rounds.indexOf(round); i++) {
        for (const p of game.players) {
          cumulative[p.id] = (cumulative[p.id] ?? 0) + (game.rounds[i].scores[p.id] ?? 0);
        }
      }
      for (const p of game.players) {
        point[p.id] = cumulative[p.id];
      }
      return point;
    });
  }, [game]);

  if (!game) return null;

  if (game.rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-4xl mb-3">📈</p>
        <p className="text-sm">No rounds recorded yet.</p>
      </div>
    );
  }

  const togglePlayer = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {game.players.map((p, i) => (
          <Badge
            key={p.id}
            variant="outline"
            className={cn(
              'cursor-pointer select-none transition-opacity h-7',
              hidden.has(p.id) && 'opacity-40',
            )}
            style={{ borderColor: COLORS[i % COLORS.length], color: COLORS[i % COLORS.length] }}
            onClick={() => togglePlayer(p.id)}
          >
            {p.name}
          </Badge>
        ))}
      </div>

      {/* Chart */}
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 16, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="round"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: 12,
              }}
            formatter={(value, name) => {
                const player = game.players.find((p) => p.id === String(name ?? ''));
                return [Number(value ?? 0), player?.name ?? String(name ?? '')];
              }}
            />
            {game.players.map((p, i) => (
              <Line
                key={p.id}
                type="monotone"
                dataKey={p.id}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4, fill: COLORS[i % COLORS.length] }}
                activeDot={{ r: 6 }}
                hide={hidden.has(p.id)}
                name={p.id}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
