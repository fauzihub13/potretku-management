'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, statusColors, statusLabels } from '@/lib/utils-helpers';
import { Calendar, DollarSign, Users, Package, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  totalBookings: number;
  monthBookings: number;
  pendingBookings: number;
  completedBookings: number;
  monthRevenue: number;
  totalRevenue: number;
  recentBookings: any[];
  statusCounts: any[];
  upcomingBookings: any[];
  servicesCount: number;
  teamCount: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(res => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>;
  if (!data) return null;

  const stats = [
    { label: 'Total Pemesanan', value: data.totalBookings, icon: Calendar, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
    { label: 'Bulan Ini', value: data.monthBookings, icon: TrendingUp, color: 'text-green-600 bg-green-50 dark:bg-green-900/30' },
    { label: 'Menunggu', value: data.pendingBookings, icon: Clock, color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30' },
    { label: 'Total Pendapatan', value: formatCurrency(data.totalRevenue), icon: DollarSign, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30' },
    { label: 'Pendapatan Bulan Ini', value: formatCurrency(data.monthRevenue), icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
    { label: 'Layanan', value: data.servicesCount, icon: Package, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30' },
    { label: 'Anggota Tim', value: data.teamCount, icon: Users, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30' },
    { label: 'Selesai', value: data.completedBookings, icon: TrendingUp, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pemesanan Terbaru</CardTitle>
            <Link href="/bookings" className="text-sm text-purple-600 hover:underline">Lihat semua</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentBookings.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                  <div>
                    <p className="font-medium text-sm">{b.clientName}</p>
                    <p className="text-xs text-zinc-500">{b.bookingCode} · {b.eventType}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={statusColors[b.status]}>{statusLabels[b.status]}</Badge>
                    <p className="text-xs text-zinc-500 mt-1">{formatCurrency(b.totalAmount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pemesanan Mendatang</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.upcomingBookings.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-4">Tidak ada pemesanan mendatang</p>
              )}
              {data.upcomingBookings.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                  <div>
                    <p className="font-medium text-sm">{b.clientName}</p>
                    <p className="text-xs text-zinc-500">{b.eventType}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{new Date(b.sessionDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                    <p className="text-xs text-zinc-500">{b.sessionTime}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
