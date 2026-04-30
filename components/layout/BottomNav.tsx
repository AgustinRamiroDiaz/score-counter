'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, BarChart2, Table2, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  gameId: string;
}

const TABS = [
  { label: 'Score', href: '', icon: Crosshair },
  { label: 'Board', href: '/leaderboard', icon: Trophy },
  { label: 'Chart', href: '/chart', icon: BarChart2 },
  { label: 'Table', href: '/table', icon: Table2 },
];

export function BottomNav({ gameId }: Props) {
  const pathname = usePathname();
  const base = `/game/${gameId}`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border">
      <div className="flex items-stretch max-w-lg mx-auto h-14">
        {TABS.map(({ label, href, icon: Icon }) => {
          const fullHref = `${base}${href}`;
          const isActive =
            href === ''
              ? pathname === base || pathname === `${base}/`
              : pathname.startsWith(fullHref);

          return (
            <Link
              key={label}
              href={fullHref}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold tracking-wide uppercase transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon
                className={cn(
                  'h-[18px] w-[18px] transition-all',
                  isActive && 'stroke-primary drop-shadow-[0_0_6px_oklch(0.76_0.165_65/0.6)]',
                )}
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
