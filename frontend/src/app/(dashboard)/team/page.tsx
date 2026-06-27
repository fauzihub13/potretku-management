'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ViewToggle, Pagination } from '@/components/view-controls';
import { PageSizeSelector } from '@/components/page-size-selector';
import { Users, Phone, Mail, Trash2, Edit, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { validateName, validatePhone, validateEmail } from '@/lib/validations';
import { SortableTh, useSortableData } from '@/components/sortable-table';

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', role: '', email: '', phone: '', tags: '[]', isActive: true });
  const [view, setView] = useState<'table' | 'card'>('card');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pageSize, setPageSize] = useState(12);

  const fetchMembers = () => {
    setLoading(true);
    api.get('/team').then(res => setMembers(res.data)).finally(() => setLoading(false));
  };
  useEffect(() => { fetchMembers(); }, []);

  const filtered = members.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.role.toLowerCase().includes(search.toLowerCase()));
  const { sorted, sortField, sortDir, requestSort } = useSortableData(filtered, 'name', 'asc');
  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  const openCreate = () => { setForm({ name: '', role: '', email: '', phone: '', tags: '[]', isActive: true }); setEditId(null); setFormErrors({}); setDialog(true); };
  const openEdit = (m: any) => { setForm({ name: m.name, role: m.role, email: m.email || '', phone: m.phone || '', tags: m.tags || '[]', isActive: m.isActive }); setEditId(m.id); setFormErrors({}); setDialog(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    const nameErr = validateName(form.name);
    if (nameErr) newErrors.name = nameErr;
    const roleErr = validateName(form.role, 'Peran');
    if (roleErr) newErrors.role = roleErr;
    if (form.phone) {
      const phoneErr = validatePhone(form.phone);
      if (phoneErr) newErrors.phone = phoneErr;
    }
    if (form.email) {
      const emailErr = validateEmail(form.email);
      if (emailErr) newErrors.email = emailErr;
    }
    setFormErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    try {
      if (editId) { await api.put(`/team/${editId}`, form); toast.success('Anggota diperbarui'); }
      else { await api.post('/team', form); toast.success('Anggota ditambahkan'); }
      setDialog(false); fetchMembers();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await api.put(`/team/${id}`, { isActive: !current });
      toast.success(current ? 'Dinonaktifkan' : 'Diaktifkan');
      fetchMembers();
    } catch { toast.error('Gagal'); }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await api.delete(`/team/${deleteId}`); toast.success('Berhasil dihapus'); fetchMembers(); } catch { toast.error('Gagal'); }
    setDeleteId(null);
  };

  const roleColors: Record<string, string> = {
    Photographer: 'bg-blue-100 text-blue-800', Videographer: 'bg-purple-100 text-purple-800',
    Editor: 'bg-green-100 text-green-800', Assistant: 'bg-orange-100 text-orange-800',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Input placeholder="Cari anggota..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-56" />
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onViewChange={setView} />
          <Button onClick={openCreate} className="bg-purple-600 hover:bg-purple-700"><Plus className="h-4 w-4 mr-2" /> Tambah</Button>
        </div>
      </div>

      {view === 'table' && (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <SortableTh label="Nama" field="name" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <SortableTh label="Peran" field="role" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <SortableTh label="Telepon" field="phone" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <SortableTh label="Email" field="email" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <SortableTh label="Aktif" field="isActive" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <th className="text-left p-3 font-medium text-zinc-500">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-zinc-500">Belum ada anggota tim</td></tr>
                ) : paged.map(m => (
                  <tr key={m.id} className={`border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 ${!m.isActive ? 'opacity-50' : ''}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-bold text-purple-700">{m.name.charAt(0)}</div>
                        <span className="font-medium">{m.name}</span>
                      </div>
                    </td>
                    <td className="p-3"><Badge className={roleColors[m.role] || 'bg-zinc-100 text-zinc-800'}>{m.role}</Badge></td>
                    <td className="p-3 text-xs">{m.phone || '-'}</td>
                    <td className="p-3 text-xs">{m.email || '-'}</td>
                    <td className="p-3">
                      <Switch checked={m.isActive} onCheckedChange={() => handleToggleActive(m.id, m.isActive)} />
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(m)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
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
            <div className="col-span-full text-center py-12 text-zinc-500">Belum ada anggota tim</div>
          ) : paged.map(m => (
            <Card key={m.id} className={`hover:shadow-md transition-shadow ${!m.isActive ? 'opacity-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-sm font-bold text-purple-700">{m.name.charAt(0)}</div>
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <Badge className={roleColors[m.role] || 'bg-zinc-100 text-zinc-800'}>{m.role}</Badge>
                    </div>
                  </div>
                  <Switch checked={m.isActive} onCheckedChange={() => handleToggleActive(m.id, m.isActive)} />
                </div>
                <div className="mt-3 space-y-1 text-sm text-zinc-500">
                  {m.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {m.phone}</div>}
                  {m.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {m.email}</div>}
                </div>
                <div className="flex gap-1 mt-3 pt-3 border-t">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(m)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <PageSizeSelector value={pageSize} onChange={(v) => { setPageSize(v); setPage(1); }} />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Edit Anggota' : 'Tambah Anggota'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nama *</Label><Input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); if (formErrors.name) setFormErrors(prev => { const { name: _, ...rest } = prev; return rest; }); }} required />{formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}</div>
            <div className="space-y-2"><Label>Peran *</Label><Input value={form.role} onChange={e => { setForm(f => ({ ...f, role: e.target.value })); if (formErrors.role) setFormErrors(prev => { const { role: _, ...rest } = prev; return rest; }); }} placeholder="Fotografer, Videografer, Editor" required />{formErrors.role && <p className="text-xs text-red-500 mt-1">{formErrors.role}</p>}</div>
            <div className="space-y-2"><Label>Telepon</Label><Input value={form.phone} onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); if (formErrors.phone) setFormErrors(prev => { const { phone: _, ...rest } = prev; return rest; }); }} />{formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}</div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => { setForm(f => ({ ...f, email: e.target.value })); if (formErrors.email) setFormErrors(prev => { const { email: _, ...rest } = prev; return rest; }); }} />{formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}</div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))} />
              <Label>Aktif</Label>
            </div>
            <div className="flex gap-2 justify-end"><Button type="button" variant="outline" onClick={() => setDialog(false)}>Batal</Button><Button type="submit" className="bg-purple-600 hover:bg-purple-700">Simpan</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Hapus anggota ini?"
        description="Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
