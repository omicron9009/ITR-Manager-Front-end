'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Tags, MapPin } from 'lucide-react';

const TABS = [
  { href: '/partner/executives/tags', label: 'Manage Tags', icon: Tags, exact: true },
  { href: '/partner/executives/tags/location-summary', label: 'Location Summary', icon: MapPin },
];

export default function TagsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      {/* Sub-navigation tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Icon className="h-4 w-4" /> {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
