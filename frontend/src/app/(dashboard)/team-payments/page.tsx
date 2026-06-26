'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatDate } from '@/lib/utils-helpers';
import { Plus, CheckCircle, Clock, Trash2, CreditCard, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function TeamPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [filterMember, setFilterMember] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({ teamMemberId: '', bookingId: '', amount: 0, description: '' });

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterMember) params.set('teamMemberId', filterMember);
    if (filterStatus) params.set('status', filterStatus);
    Promise.all([
      api.get(`/team-payments?${params}`),
      api.get('/team-payments/summary'),
      api.get('/team'),
      api.get('/bookings?limit=100')
    ]).then(([p, s, t, b]) => {
      setPayments(p.data);
      setSummary(s.data);
      setTeam(t.data);
      setBookings(b.data.bookings);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [filterMember, filterStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/team-payments', { ...form, bookingId: form.bookingId || undefined });
      toast.success('Pembayaran ditambahkan');
      setDialog(false);
      setForm({ teamMemberId: '', bookingId: '', amount: 0, description: '' });
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const handlePay = async (id: string) => {
    try {
      await api.put(`/team-payments/${id}/pay`);
      toast.success('Ditandai sudah dibayar');
      fetchData();
    } catch { toast.error('Gagal'); }
  };

  const handleUnpay = async (id: string) => {
    try {
      await api.put(`/team-payments/${id}/unpay`);
      toast.success('Dibatalkan');
      fetchData();
    } catch { toast.error('Gagal'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pembayaran ini?')) return;
    try {
      await api.delete(`/team-payments/${id}`);
      toast.success('Dihapus');
      fetchData();
    } catch { toast.error('Gagal'); }
  };

  const totalPaid = summary.reduce((s, m) => s + m.totalPaid, 0);
  const totalUnpaid = summary.reduce((s, m) => s + m.totalUnpaid, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600"><CheckCircle className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-zinc-500">Total Dibayar</p>
                <p className="text-xl font-bold">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600"><Clock className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-zinc-500">Total Belum Dibayar</p>
                <p className="text-xl font-bold">{formatCurrency(totalUnpaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600"><Users className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-zinc-500">Total Anggota Aktif</p>
                <p className="text-xl font-bold">{summary.length} orang</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-member summary */}
      <Card>
        <CardHeader><CardTitle className="text-base">Ringkasan per Anggota</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left p-3 font-medium text-zinc-500">Nama</th>
                  <th className="text-left p-3 font-medium text-zinc-500">Peran</th>
                  <th className="text-left p-3 font-medium text-zinc-500">Booking</th>
                  <th className="text-left p-3 font-medium text-zinc-500">Dibayar</th>
                  <th className="text-left p-3 font-medium text-zinc-500">Belum Dibayar</th>
                  <th className="text-left p-3 font-medium text-zinc-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {summary.map(m => (
                  <tr key={m.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 cursor-pointer" onClick={() => setFilterMember(filterMember === m.id ? '' : m.id)}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-bold text-purple-700">{m.name.charAt(0)}</div>
                        <span className="font-medium">{m.name}</span>
                      </div>
                    </td>
                    <td className="p-3"><Badge variant="outline">{m.role}</Badge></td>
                    <td className="p-3">{m.bookingCount}</td>
                    <td className="p-3 text-green-600 font-medium">{formatCurrency(m.totalPaid)}</td>
                    <td className="p-3 text-yellow-600 font-medium">{formatCurrency(m.totalUnpaid)}</td>
                    <td className="p-3 font-bold">{formatCurrency(m.totalAll)}</td>
                  </tr>
                ))}
                {summary.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-zinc-500">Belum ada data</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Filter + Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={filterMember} onValueChange={(v) => setFilterMember(v || '')}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Semua Anggota" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Anggota</SelectItem>
              {team.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v || '')}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Semua Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="paid">Dibayar</SelectItem>
              <SelectItem value="unpaid">Belum Dibayar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setDialog(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" /> Tambah Pembayaran
        </Button>
      </div>

      {/* Payments List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left p-3 font-medium text-zinc-500">Tanggal</th>
                  <th className="text-left p-3 font-medium text-zinc-500">Anggota</th>
                  <th className="text-left p-3 font-medium text-zinc-500">Booking</th>
                  <th className="text-left p-3 font-medium text-zinc-500">Keterangan</th>
                  <th className="text-left p-3 font-medium text-zinc-500">Jumlah</th>
                  <th className="text-left p-3 font-medium text-zinc-500">Status</th>
                  <th className="text-left p-3 font-medium text-zinc-500">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-zinc-500">Belum ada data pembayaran</td></tr>
                ) : payments.map(p => (
                  <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="p-3 text-xs text-zinc-500">{formatDate(p.createdAt)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-[10px] font-bold text-purple-700">{p.teamMember?.name?.charAt(0)}</div>
                        <span className="font-medium">{p.teamMember?.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs">
                      {p.booking ? (
                        <div>
                          <p className="font-mono">{p.booking.bookingCode}</p>
                          <p className="text-zinc-500">{p.booking.clientName}</p>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="p-3 text-xs text-zinc-500 max-w-[200px] truncate">{p.description || '-'}</td>
                    <td className="p-3 font-medium">{formatCurrency(p.amount)}</td>
                    <td className="p-3">
                      {p.status === 'paid' ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          <CheckCircle className="h-3 w-3 mr-1" /> Dibayar
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                          <Clock className="h-3 w-3 mr-1" /> Belum
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {p.status === 'unpaid' ? (
                          <Button variant="ghost" size="sm" onClick={() => handlePay(p.id)} className="text-green-600"><CheckCircle className="h-4 w-4" /></Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => handleUnpay(p.id)} className="text-yellow-600"><Clock className="h-4 w-4" /></Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Tambah */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tambah Pembayaran Tim</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Anggota *</Label>
              <Select value={form.teamMemberId} onValueChange={(v) => setForm(f => ({ ...f, teamMemberId: v || '' }))}>
                <SelectTrigger><SelectValue placeholder="Pilih anggota" /></SelectTrigger>
                <SelectContent>
                  {team.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.role})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Booking (opsional)</Label>
              <Select value={form.bookingId} onValueChange={(v) => setForm(f => ({ ...f, bookingId: v || '' }))}>
                <SelectTrigger><SelectValue placeholder="Pilih booking" /></SelectTrigger>
                <SelectContent>
                  {bookings.map(b => <SelectItem key={b.id} value={b.id}>{b.bookingCode} - {b.clientName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jumlah (Rp) *</Label>
              <Input type="number" value={form.amount || ''} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} required />
            </div>
            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Foto wedding client X" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Batal</Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
