'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ViewToggle, Pagination } from '@/components/view-controls';
import { Plus, Trash2, Edit, FileText, Copy } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 10;

export default function InvoicesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'whatsapp', content: '', variables: '' });
  const [view, setView] = useState<'table' | 'card'>('card');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([api.get('/templates?type=whatsapp'), api.get('/bookings?limit=50')]).then(([t, b]) => {
      setTemplates(t.data);
      setBookings(b.data.bookings);
    }).finally(() => setLoading(false));
  }, []);

  const filteredBookings = bookings.filter(b => !search || b.clientName.toLowerCase().includes(search.toLowerCase()) || b.bookingCode.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filteredBookings.length / PAGE_SIZE);
  const paged = filteredBookings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => { setForm({ name: '', type: 'whatsapp', content: '', variables: '' }); setEditId(null); setDialog(true); };
  const openEdit = (t: any) => { setForm({ name: t.name, type: t.type, content: t.content, variables: t.variables || '' }); setEditId(t.id); setDialog(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) { await api.put(`/templates/${editId}`, form); toast.success('Templat diperbarui'); }
      else { await api.post('/templates', form); toast.success('Templat dibuat'); }
      setDialog(false);
      const res = await api.get('/templates?type=whatsapp');
      setTemplates(res.data);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus templat ini?')) return;
    try { await api.delete(`/templates/${id}`); toast.success('Berhasil dihapus'); setTemplates(t => t.filter(x => x.id !== id)); } catch { toast.error('Gagal'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Input placeholder="Cari klien atau kode..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-56" />
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onViewChange={setView} />
          <Button onClick={openCreate} className="bg-purple-600 hover:bg-purple-700"><Plus className="h-4 w-4 mr-2" /> Tambah Templat</Button>
        </div>
      </div>

      {/* Templat WhatsApp */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-3">Templat WhatsApp</p>
          <div className="space-y-2">
            {templates.length === 0 && <p className="text-xs text-zinc-400 italic">Belum ada templat</p>}
            {templates.map(t => (
              <div key={t.id} className="flex items-start justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-zinc-500 mt-1 truncate">{t.content}</p>
                </div>
                <div className="flex gap-1 ml-3 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pemesanan untuk Faktur */}
      <div>
        <p className="text-sm font-medium mb-3">Pemesanan untuk Faktur</p>

        {view === 'table' && (
          <Card><CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="text-left p-3 font-medium text-zinc-500">Kode</th>
                    <th className="text-left p-3 font-medium text-zinc-500">Klien</th>
                    <th className="text-left p-3 font-medium text-zinc-500">Paket</th>
                    <th className="text-left p-3 font-medium text-zinc-500">Total</th>
                    <th className="text-left p-3 font-medium text-zinc-500">DP</th>
                    <th className="text-left p-3 font-medium text-zinc-500">Pelunasan</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-zinc-500">Belum ada data</td></tr>
                  ) : paged.map(b => (
                    <tr key={b.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                      <td className="p-3 font-mono text-xs">{b.bookingCode}</td>
                      <td className="p-3 font-medium">{b.clientName}</td>
                      <td className="p-3">{b.packageName}</td>
                      <td className="p-3 font-medium">Rp{b.totalAmount.toLocaleString()}</td>
                      <td className="p-3"><Badge variant={b.dpPaid ? 'default' : 'secondary'}>{b.dpPaid ? 'Lunas' : 'Belum'}</Badge></td>
                      <td className="p-3"><Badge variant={b.finalPaid ? 'default' : 'secondary'}>{b.finalPaid ? 'Lunas' : 'Belum'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        )}

        {view === 'card' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paged.length === 0 ? (
              <div className="col-span-full text-center py-12 text-zinc-500">Belum ada data</div>
            ) : paged.map(b => (
              <Card key={b.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-xs text-zinc-500">{b.bookingCode}</p>
                      <p className="font-semibold">{b.clientName}</p>
                      <p className="text-xs text-zinc-500 mt-1">{b.packageName}</p>
                    </div>
                    <p className="font-bold">Rp{b.totalAmount.toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <Badge variant={b.dpPaid ? 'default' : 'secondary'}>DP: {b.dpPaid ? 'Lunas' : 'Belum'}</Badge>
                    <Badge variant={b.finalPaid ? 'default' : 'secondary'}>Pelunasan: {b.finalPaid ? 'Lunas' : 'Belum'}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? 'Edit Templat' : 'Tambah Templat'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nama *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>Tipe</Label><Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v || 'whatsapp' }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="faktur">Faktur</SelectItem><SelectItem value="pelunasan">Pelunasan</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Konten *</Label><Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={5} placeholder="Gunakan {namaKlien}, {kodePemesanan}, {namaPaket}, {jumlah} sebagai variabel" required /></div>
            <div className="space-y-2"><Label>Variabel (koma)</Label><Input value={form.variables} onChange={e => setForm(f => ({ ...f, variables: e.target.value }))} placeholder="namaKlien,kodePemesanan" /></div>
            <div className="flex gap-2 justify-end"><Button type="button" variant="outline" onClick={() => setDialog(false)}>Batal</Button><Button type="submit" className="bg-purple-600 hover:bg-purple-700">Simpan</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
