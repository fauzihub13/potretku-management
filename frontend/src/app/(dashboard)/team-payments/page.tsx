'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatDate, statusColors, statusLabels } from '@/lib/utils-helpers';
import { Plus, CheckCircle, Clock, Trash2, CreditCard, Users, ChevronDown, ChevronRight, Calendar, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { validateNumber } from '@/lib/validations';
import { SortableTh, useSortableData } from '@/components/sortable-table';

export default function TeamPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [filterMember, setFilterMember] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [form, setForm] = useState({ teamMemberId: '', bookingId: '', amount: 0, description: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { sorted: sortedPayments, sortField, sortDir, requestSort } = useSortableData(payments, 'createdAt', 'desc');

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterMember && filterMember !== 'all') params.set('teamMemberId', filterMember);
    if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
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
    const newErrors: Record<string, string> = {};
    if (!form.teamMemberId) newErrors.teamMemberId = 'Pilih anggota tim';
    const amountErr = validateNumber(form.amount, 'Jumlah', 1);
    if (amountErr) newErrors.amount = amountErr;
    setFormErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    try {
      await api.post('/team-payments', { ...form, bookingId: form.bookingId || undefined });
      toast.success('Pembayaran ditambahkan');
      setDialog(false);
      setForm({ teamMemberId: '', bookingId: '', amount: 0, description: '' });
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const handlePay = async (id: string) => {
    try { await api.put(`/team-payments/${id}/pay`); toast.success('Dibayar'); fetchData(); } catch { toast.error('Gagal'); }
  };

  const handleUnpay = async (id: string) => {
    try { await api.put(`/team-payments/${id}/unpay`); toast.success('Dibatalkan'); fetchData(); } catch { toast.error('Gagal'); }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await api.delete(`/team-payments/${deleteId}`); toast.success('Dihapus'); fetchData(); } catch { toast.error('Gagal'); }
    setDeleteId(null);
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
                <p className="text-xs text-zinc-500">Anggota</p>
                <p className="text-xl font-bold">{summary.length} orang</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ringkasan per Anggota — expandable */}
      <Card>
        <CardHeader><CardTitle className="text-base">Ringkasan per Anggota</CardTitle></CardHeader>
        <CardContent className="p-0">
          {summary.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">Belum ada data</p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {summary.map(m => {
                const isExpanded = expandedMember === m.id;
                return (
                  <div key={m.id}>
                    {/* Member row */}
                    <div
                      onClick={() => setExpandedMember(isExpanded ? null : m.id)}
                      className="flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 cursor-pointer transition-colors"
                    >
                      <div className="h-9 w-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-sm font-bold text-purple-700 flex-shrink-0">
                        {m.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{m.name}</p>
                          <Badge variant="outline" className="text-xs">{m.role}</Badge>
                          {!m.isActive && <Badge variant="secondary" className="text-xs">Nonaktif</Badge>}
                        </div>
                        <p className="text-xs text-zinc-500">{m.bookingCount} pemesanan ditangani</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold">{formatCurrency(m.totalAll)}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-green-600">✓ {formatCurrency(m.totalPaid)}</span>
                          <span className="text-yellow-600">⏳ {formatCurrency(m.totalUnpaid)}</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-zinc-400 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-zinc-400 flex-shrink-0" />}
                    </div>

                    {/* Expanded bookings list */}
                    {isExpanded && (
                      <div className="bg-zinc-50 dark:bg-zinc-800/20 px-4 pb-4">
                        <p className="text-xs font-medium text-zinc-500 mb-2 pt-2">Pemesanan yang ditangani:</p>
                        {m.bookings.length === 0 ? (
                          <p className="text-xs text-zinc-400 italic">Belum ada pemesanan</p>
                        ) : (
                          <div className="space-y-1.5">
                            {m.bookings.map((b: any) => (
                              <div key={b.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-700/50">
                                <div className="flex items-center gap-3">
                                  <div className="flex-shrink-0">
                                    <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs text-zinc-500">{b.bookingCode}</span>
                                      <Badge className={`${statusColors[b.status]} text-[10px]`} variant="outline">{statusLabels[b.status]}</Badge>
                                    </div>
                                    <p className="text-sm font-medium">{b.clientName}</p>
                                    <p className="text-xs text-zinc-500">{b.eventType} · {new Date(b.sessionDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{formatCurrency(b.totalAmount)}</span>
                                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/bookings/${b.id}`); }}>
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
                  <SortableTh label="Tanggal" field="createdAt" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <SortableTh label="Anggota" field="teamMember.name" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <SortableTh label="Booking" field="booking.bookingCode" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <SortableTh label="Keterangan" field="description" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <SortableTh label="Jumlah" field="amount" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <SortableTh label="Status" field="status" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <th className="text-left p-3 font-medium text-zinc-500">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sortedPayments.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-zinc-500">Belum ada data pembayaran</td></tr>
                ) : sortedPayments.map(p => (
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
                        <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" /> Dibayar</Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" /> Belum</Badge>
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
              <Select value={form.teamMemberId} onValueChange={(v) => { setForm(f => ({ ...f, teamMemberId: v || '' })); if (formErrors.teamMemberId) setFormErrors(prev => { const { teamMemberId: _, ...rest } = prev; return rest; }); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih anggota">
                    {form.teamMemberId && (() => {
                      const t = team.find(x => x.id === form.teamMemberId);
                      return t ? `${t.name} (${t.role})` : null;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {team.filter(t => t.isActive).map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.role})</SelectItem>)}
                </SelectContent>
              </Select>
              {formErrors.teamMemberId && <p className="text-xs text-red-500 mt-1">{formErrors.teamMemberId}</p>}
            </div>
            <div className="space-y-2">
              <Label>Booking (opsional)</Label>
              <Select value={form.bookingId} onValueChange={(v) => setForm(f => ({ ...f, bookingId: v || '' }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih booking">
                    {form.bookingId && (() => {
                      const b = bookings.find(x => x.id === form.bookingId);
                      return b ? `${b.bookingCode} - ${b.clientName}` : null;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {bookings.map(b => <SelectItem key={b.id} value={b.id}>{b.bookingCode} - {b.clientName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jumlah (Rp) *</Label>
              <Input type="number" value={form.amount || ''} onChange={e => { setForm(f => ({ ...f, amount: Number(e.target.value) })); if (formErrors.amount) setFormErrors(prev => { const { amount: _, ...rest } = prev; return rest; }); }} required />
              {formErrors.amount && <p className="text-xs text-red-500 mt-1">{formErrors.amount}</p>}
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

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Hapus?"
        description="Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
