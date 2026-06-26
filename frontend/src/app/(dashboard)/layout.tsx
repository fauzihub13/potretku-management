'use client';

import Sidebar from '@/components/sidebar';
import Topbar from '@/components/topbar';
import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dasbor',
  '/bookings': 'Pemesanan',
  '/services': 'Layanan & Paket',
  '/team': 'Tim & Freelancer',
  '/finance': 'Ringkasan Keuangan',
  '/invoices': 'Faktur & Pelunasan',
  '/templates': 'Templat',
  '/settings': 'Pengaturan',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopbarWrapper />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function TopbarWrapper() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || 'VendorDesk';
  return <Topbar title={title} />;
}
