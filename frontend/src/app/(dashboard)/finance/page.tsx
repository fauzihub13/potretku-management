'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils-helpers';
import { DollarSign, TrendingUp, TrendingDown, Clock } from 'lucide-react';

export default function FinancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/finance/summary'),
      api.get('/finance/by-status'),
      api.get('/finance/recent')
    ]).then(([summary, status, recent]) => {
      setData({
        ...summary.data,
        statusBreakdown: status.data,
        recent: recent.data
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>;
  if (!data) return null;

  const stats = [
    { label: 'Total Pendapatan', value: formatCurrency(data.totalRevenue), icon: DollarSign, color: 'text-green-600 bg-green-50' },
    { label: 'Pendapatan Lunas', value: formatCurrency(data.paidRevenue), icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
    { label: 'Belum Dibayar', value: formatCurrency(data.outstanding), icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'Total Pemesanan', value: data.bookingCount, icon: DollarSign, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.color}`}><s.icon className="h-5 w-5" /></div>
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
          <CardHeader><CardTitle className="text-base">Ringkasan Status</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.statusBreakdown?.map((s: any) => (
                <div key={s.status} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{s.status.replace('_', ' ')}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-zinc-500">{s._count} pemesanan</span>
                    <span className="font-medium">{formatCurrency(s._sum?.totalAmount || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Transaksi Terbaru</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recent?.slice(0, 5).map((b: any) => (
                <div key={b.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                  <div>
                    <p className="text-sm font-medium">{b.clientName}</p>
                    <p className="text-xs text-zinc-500">{b.bookingCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(b.totalAmount)}</p>
                    <p className="text-xs text-zinc-500">{b.status}</p>
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
