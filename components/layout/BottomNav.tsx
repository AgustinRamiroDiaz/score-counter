'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, BarChart2, Table2, PlusCircle, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  gameId: string;
}

const TABS = [
  { label: 'Scoring', href: '', icon: PlusCircle },
  { label: 'Board', href: '/leaderboard', icon: Trophy },
  { label: 'Chart', href: '/chart', icon: BarChart2 },
  { label: 'Table', href: '/table', icon: Table2 },
  { label: 'Chat', href: '/chat', icon: MessageSquare },
];

export function BottomNav({ gameId }: Props) {
  const pathname = usePathname();
  const base = `/game/${gameId}`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t safe-area-bottom">
      <div className="flex items-stretch max-w-lg mx-auto">
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
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors min-h-[56px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'fill-primary/20')} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
