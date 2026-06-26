'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Calendar, Package, Users, DollarSign,
  FileText, Settings, LogOut, ChevronLeft, FormInput, User, CalendarDays
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { label: 'Dasbor', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Pemesanan', href: '/bookings', icon: Calendar },
  { label: 'Kalender', href: '/calendar', icon: CalendarDays },
  { label: 'Layanan', href: '/services', icon: Package },
  { label: 'Tim', href: '/team', icon: Users },
  { label: 'Keuangan', href: '/finance', icon: DollarSign },
  { label: 'Faktur', href: '/invoices', icon: FileText },
  { label: 'Templat', href: '/templates', icon: FormInput },
  { label: 'Profil', href: '/profile', icon: User },
  { label: 'Pengaturan', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      'h-screen bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-all duration-300 sticky top-0',
      collapsed ? 'w-16' : 'w-64'
    )}>
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
        {!collapsed && (
          <span className="font-bold text-lg text-purple-600">VendorDesk</span>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
        {!collapsed && user && (
          <div className="text-xs text-zinc-500 mb-2 truncate">{user.email}</div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Keluar</span>}
        </button>
      </div>
    </aside>
  );
}
