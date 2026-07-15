'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useGame } from '@/hooks/useGame';
import type { Props as LabelProps } from 'recharts/types/component/Label';
import type { Player } from '@/lib/types';

const LineChart = dynamic(
  () => import('recharts').then((m) => m.LineChart),
  { ssr: false },
);
const Line = dynamic(() => import('recharts').then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((m) => m.Tooltip), { ssr: false });
const LabelList = dynamic(() => import('recharts').then((m) => m.LabelList), { ssr: false });
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

function labelCoordinate(value: LabelProps['x'] | LabelProps['y']): number | null {
  const coordinate = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

export function RoundChart({ gameId }: Props) {
  const { game } = useGame(gameId);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const chartData = useMemo(() => {
    if (!game || game.rounds.length === 0) return [];
    const zeroPoint: Record<string, number | string> = { round: 'Start' };
    for (const player of game.players) {
      zeroPoint[player.id] = 0;
    }

    const roundPoints = game.rounds.map((round, roundIdx) => {
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
    return [zeroPoint, ...roundPoints];
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

  const lastPointIndex = chartData.length - 1;
  const renderLastPointLabel = (player: Player, color: string) => {
    function LastPointLabel(props: LabelProps) {
      if (props.index !== lastPointIndex) return null;
      const x = labelCoordinate(props.x);
      const y = labelCoordinate(props.y);
      if (x === null || y === null) return null;
      return (
        <text
          x={x - 4}
          y={y - 12}
          fill={color}
          fontSize={12}
          fontWeight={700}
          textAnchor="end"
        >
          {player.name} {Number(props.value ?? 0)}
        </text>
      );
    }
    return LastPointLabel;
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="w-full h-72 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 24, right: 16, left: -10, bottom: 5 }}>
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
                onClick={() => togglePlayer(p.id)}
              >
                <LabelList
                  dataKey={p.id}
                  content={renderLastPointLabel(p, COLORS[i % COLORS.length])}
                />
              </Line>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
