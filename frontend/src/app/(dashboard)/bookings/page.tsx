'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, statusColors, statusLabels } from '@/lib/utils-helpers';
import { ViewToggle, Pagination } from '@/components/view-controls';
import { Plus, Search, Trash2, Eye, Edit, Calendar, Clock, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [view, setView] = useState<'table' | 'card'>('table');
  const router = useRouter();

  const fetchBookings = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '12' });
    if (search) params.set('search', search);
    if (status && status !== 'all') params.set('status', status);
    api.get(`/bookings?${params}`).then(res => {
      setBookings(res.data.bookings);
      setTotalPages(res.data.pages);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [page, status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBookings();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pemesanan ini?')) return;
    try {
      await api.delete(`/bookings/${id}`);
      toast.success('Pemesanan dihapus');
      fetchBookings();
    } catch {
      toast.error('Gagal menghapus');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input placeholder="Cari pemesanan..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-64" />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v || ''); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Semua Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="outline" size="sm">Cari</Button>
        </form>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onViewChange={setView} />
          <Button onClick={() => router.push('/bookings/create')} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" /> Tambah
          </Button>
        </div>
      </div>

      {/* TABEL */}
      {view === 'table' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="text-left p-3 font-medium text-zinc-500">Kode</th>
                    <th className="text-left p-3 font-medium text-zinc-500">Klien</th>
                    <th className="text-left p-3 font-medium text-zinc-500">Acara</th>
                    <th className="text-left p-3 font-medium text-zinc-500">Tanggal</th>
                    <th className="text-left p-3 font-medium text-zinc-500">Paket</th>
                    <th className="text-left p-3 font-medium text-zinc-500">Total</th>
                    <th className="text-left p-3 font-medium text-zinc-500">Status</th>
                    <th className="text-left p-3 font-medium text-zinc-500">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="p-8 text-center text-zinc-500">Memuat data...</td></tr>
                  ) : bookings.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-zinc-500">Belum ada pemesanan</td></tr>
                  ) : bookings.map((b) => (
                    <tr key={b.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                      <td className="p-3 font-mono text-xs">{b.bookingCode}</td>
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{b.clientName}</p>
                          <p className="text-xs text-zinc-500">{b.clientPhone}</p>
                        </div>
                      </td>
                      <td className="p-3">{b.eventType}</td>
                      <td className="p-3 text-sm">
                        <div>
                          <p>{new Date(b.sessionDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          {b.sessionTime && <p className="text-xs text-zinc-500 font-mono">{b.sessionTime} WIB</p>}
                        </div>
                      </td>
                      <td className="p-3">{b.packageName}</td>
                      <td className="p-3 font-medium">{formatCurrency(b.totalAmount)}</td>
                      <td className="p-3"><Badge className={statusColors[b.status]}>{statusLabels[b.status]}</Badge></td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/bookings/${b.id}`)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/bookings/${b.id}/edit`)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(b.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KARTU */}
      {view === 'card' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-zinc-500">Memuat data...</div>
          ) : bookings.length === 0 ? (
            <div className="col-span-full text-center py-12 text-zinc-500">Belum ada pemesanan</div>
          ) : bookings.map((b) => (
            <Card key={b.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/bookings/${b.id}`)}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-xs text-zinc-500">{b.bookingCode}</p>
                    <p className="font-semibold">{b.clientName}</p>
                  </div>
                  <Badge className={statusColors[b.status]}>{statusLabels[b.status]}</Badge>
                </div>
                <div className="space-y-1.5 text-xs text-zinc-500">
                  <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {new Date(b.sessionDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  {b.sessionTime && <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {b.sessionTime} WIB</div>}
                  {b.location && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {b.location}</div>}
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <p className="text-xs text-zinc-500">{b.eventType}</p>
                    <p className="font-bold text-sm">{formatCurrency(b.totalAmount)}</p>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/bookings/${b.id}/edit`)}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(b.id)} className="text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
