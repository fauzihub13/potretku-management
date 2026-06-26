'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, statusColors, statusLabels } from '@/lib/utils-helpers';
import { DollarSign, TrendingUp, TrendingDown, Clock, BarChart3, PieChart, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePie, Pie, Cell, Legend, LineChart, Line } from 'recharts';

const COLORS = ['#7c3aed', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6'];

export default function FinancePage() {
  const [summary, setSummary] = useState<any>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [byEvent, setByEvent] = useState<any[]>([]);
  const [byPackage, setByPackage] = useState<any[]>([]);
  const [byStatus, setByStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/finance/summary'),
      api.get('/finance/monthly?months=12'),
      api.get('/finance/by-event'),
      api.get('/finance/by-package'),
      api.get('/finance/by-status')
    ]).then(([s, m, e, p, st]) => {
      setSummary(s.data);
      setMonthly(m.data);
      setByEvent(e.data);
      setByPackage(p.data.slice(0, 6));
      setByStatus(st.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>;

  const statCards = summary ? [
    { label: 'Total Pendapatan', value: formatCurrency(summary.totalRevenue), icon: DollarSign, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30' },
    { label: 'Sudah Diterima', value: formatCurrency(summary.collected), icon: TrendingUp, color: 'text-green-600 bg-green-50 dark:bg-green-900/30' },
    { label: 'Belum Diterima', value: formatCurrency(summary.outstanding), icon: Clock, color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30' },
    { label: 'Total Pemesanan', value: summary.bookingCount, icon: BarChart3, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
  ] : [];

  const pieData = byStatus.map((s: any) => ({
    name: statusLabels[s.status] || s.status,
    value: s.jumlah,
    total: s.total
  }));

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
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

      {/* Revenue Chart + Status Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Revenue Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Pendapatan 12 Bulan Terakhir</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000000 ? (v/1000000).toFixed(0)+'jt' : v >= 1000 ? (v/1000).toFixed(0)+'rb' : v} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} labelStyle={{ fontWeight: 600 }} />
                  <Bar dataKey="pendapatan" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Pendapatan" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Pie Chart */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Status Pemesanan</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RePie>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={80} innerRadius={40} label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                    {pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [v + ' pesanan']} />
                </RePie>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Type + Top Packages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Event Type */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Pendapatan per Jenis Acara</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {byEvent.length === 0 && <p className="text-sm text-zinc-500 text-center py-4">Belum ada data</p>}
              {byEvent.map((e: any, i: number) => {
                const maxTotal = Math.max(...byEvent.map((x: any) => x.total));
                const pct = maxTotal > 0 ? (e.total / maxTotal) * 100 : 0;
                return (
                  <div key={e.eventType}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{e.eventType}</span>
                      <span className="text-zinc-500">{formatCurrency(e.total)} <span className="text-xs">({e.jumlah})</span></span>
                    </div>
                    <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Packages */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Paket Terlaris</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {byPackage.length === 0 && <p className="text-sm text-zinc-500 text-center py-4">Belum ada data</p>}
              {byPackage.map((p: any, i: number) => {
                const maxTotal = Math.max(...byPackage.map((x: any) => x.total));
                const pct = maxTotal > 0 ? (p.total / maxTotal) * 100 : 0;
                return (
                  <div key={p.paket}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-400 w-5">#{i + 1}</span>
                        <span className="font-medium">{p.paket}</span>
                      </div>
                      <span className="text-zinc-500">{formatCurrency(p.total)} <span className="text-xs">({p.jumlah}x)</span></span>
                    </div>
                    <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown Table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Rincian per Status</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left p-3 font-medium text-zinc-500">Status</th>
                  <th className="text-left p-3 font-medium text-zinc-500">Jumlah</th>
                  <th className="text-left p-3 font-medium text-zinc-500">Total</th>
                  <th className="text-left p-3 font-medium text-zinc-500">Rata-rata</th>
                  <th className="text-left p-3 font-medium text-zinc-500">Persentase</th>
                </tr>
              </thead>
              <tbody>
                {byStatus.map((s: any) => {
                  const totalAll = byStatus.reduce((sum: number, x: any) => sum + x.total, 0);
                  const pct = totalAll > 0 ? ((s.total / totalAll) * 100).toFixed(1) : '0';
                  return (
                    <tr key={s.status} className="border-b border-zinc-100 dark:border-zinc-800/50">
                      <td className="p-3"><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[s.status]}`}>{statusLabels[s.status]}</span></td>
                      <td className="p-3 font-medium">{s.jumlah}</td>
                      <td className="p-3 font-medium">{formatCurrency(s.total)}</td>
                      <td className="p-3 text-zinc-500">{s.jumlah > 0 ? formatCurrency(Math.round(s.total / s.jumlah)) : '-'}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-zinc-500">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
