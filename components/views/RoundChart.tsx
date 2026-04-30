'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useGame } from '@/hooks/useGame';
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

// Warm dark palette — amber, emerald, coral, sky, violet, lime, orange, teal
const COLORS = [
  '#d4a244', '#3db892', '#e0654a', '#4fa8d4',
  '#9b6dd4', '#8ab844', '#d47b3a', '#3ab8b8',
];

interface Props {
  gameId: string;
}

export function RoundChart({ gameId }: Props) {
  const { game } = useGame(gameId);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const chartData = useMemo(() => {
    if (!game || game.rounds.length === 0) return [];
    return game.rounds.map((round, roundIdx) => {
      const point: Record<string, number | string> = { round: `R${round.number}` };
      for (const p of game.players) {
        let cum = 0;
        for (let i = 0; i <= roundIdx; i++) {
          cum += game.rounds[i].scores[p.id] ?? 0;
        }
        point[p.id] = cum;
      }
      return point;
    });
  }, [game]);

  if (!game) return null;

  if (game.rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-5xl mb-4">📈</p>
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
          <button
            key={p.id}
            type="button"
            className={cn(
              'h-7 px-3 rounded-full text-xs font-semibold border transition-opacity select-none',
              hidden.has(p.id) && 'opacity-30',
            )}
            style={{
              borderColor: COLORS[i % COLORS.length],
              color: COLORS[i % COLORS.length],
            }}
            onClick={() => togglePlayer(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 16, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="round"
              tick={{ fontSize: 11, fill: 'oklch(0.62 0.022 56)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'oklch(0.62 0.022 56)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'oklch(0.14 0.014 52)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
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
