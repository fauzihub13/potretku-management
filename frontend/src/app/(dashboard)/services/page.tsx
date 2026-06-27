'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/utils-helpers';
import { ViewToggle, Pagination } from '@/components/view-controls';
import { PageSizeSelector } from '@/components/page-size-selector';
import { Plus, Trash2, Edit, Package, Clock, Image, MapPin, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { validateName, validateNumber } from '@/lib/validations';
import { SortableTh, useSortableData } from '@/components/sortable-table';

interface AdditionalCost { type: string; amount: number; description: string; }
interface ServiceForm {
  name: string; description: string; price: number; discountPrice: number | null;
  durationHours: number; durationMinutes: number; photoEditCount: number;
  category: string; eventTypes: string[]; city: string;
  additionalCosts: AdditionalCost[]; isActive: boolean;
}

const emptyForm: ServiceForm = {
  name: '', description: '', price: 0, discountPrice: null,
  durationHours: 0, durationMinutes: 0, photoEditCount: 0,
  category: 'main', eventTypes: [], city: '', additionalCosts: [], isActive: true
};
const eventTypeOptions = ['Wedding', 'Pre-wedding', 'Portrait', 'Event', 'Commercial', 'Product'];
export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [view, setView] = useState<'table' | 'card'>('card');
  const [page, setPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pageSize, setPageSize] = useState(10);

  const fetchServices = () => {
    setLoading(true);
    api.get('/services').then(res => setServices(res.data)).finally(() => setLoading(false));
  };
  useEffect(() => { fetchServices(); }, []);

  const filtered = services.filter(s => {
    if (filterCategory !== 'all' && s.category !== filterCategory) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const { sorted, sortField, sortDir, requestSort } = useSortableData(filtered, 'sortOrder', 'asc');
  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  const openCreate = () => { setForm(emptyForm); setEditId(null); setFormErrors({}); setDialog(true); };
  const openEdit = (s: any) => {
    setForm({
      name: s.name, description: s.description || '', price: s.price,
      discountPrice: s.discountPrice || null, durationHours: s.durationHours || 0,
      durationMinutes: s.durationMinutes || 0, photoEditCount: s.photoEditCount || 0,
      category: s.category, eventTypes: JSON.parse(s.eventTypes || '[]'),
      city: s.city || '', additionalCosts: JSON.parse(s.additionalCosts || '[]'), isActive: s.isActive
    });
    setEditId(s.id); setFormErrors({}); setDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    const nameErr = validateName(form.name, 'Nama layanan');
    if (nameErr) newErrors.name = nameErr;
    const priceErr = validateNumber(form.price, 'Harga', 0);
    if (priceErr) newErrors.price = priceErr;
    setFormErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    const payload = { ...form, eventTypes: JSON.stringify(form.eventTypes), additionalCosts: JSON.stringify(form.additionalCosts), discountPrice: form.discountPrice || null };
    try {
      if (editId) { await api.put(`/services/${editId}`, payload); toast.success('Layanan diperbarui'); }
      else { await api.post('/services', payload); toast.success('Layanan dibuat'); }
      setDialog(false); fetchServices();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await api.delete(`/services/${deleteId}`); toast.success('Berhasil dihapus'); fetchServices(); } catch { toast.error('Gagal'); }
    setDeleteId(null);
  };

  const toggleEventType = (type: string) => {
    setForm(f => ({ ...f, eventTypes: f.eventTypes.includes(type) ? f.eventTypes.filter(t => t !== type) : [...f.eventTypes, type] }));
  };
  const addCost = () => setForm(f => ({ ...f, additionalCosts: [...f.additionalCosts, { type: 'transport', amount: 0, description: '' }] }));
  const updateCost = (index: number, field: keyof AdditionalCost, value: any) => {
    setForm(f => { const costs = [...f.additionalCosts]; costs[index] = { ...costs[index], [field]: value }; return { ...f, additionalCosts: costs }; });
  };
  const removeCost = (index: number) => setForm(f => ({ ...f, additionalCosts: f.additionalCosts.filter((_, i) => i !== index) }));

  const totalAdditionalCost = (costs: string) => JSON.parse(costs || '[]').reduce((sum: number, c: AdditionalCost) => sum + c.amount, 0);

  const renderCostTag = (s: any) => {
    const costs: AdditionalCost[] = JSON.parse(s.additionalCosts || '[]');
    if (costs.length === 0) return null;
    return <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> +{formatCurrency(totalAdditionalCost(s.additionalCosts))}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Input placeholder="Cari layanan..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-56" />
          <Select value={filterCategory} onValueChange={v => { setFilterCategory(v || 'all'); setPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Semua" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="main">Paket Utama</SelectItem>
              <SelectItem value="addon">Tambahan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onViewChange={setView} />
          <Button onClick={openCreate} className="bg-purple-600 hover:bg-purple-700"><Plus className="h-4 w-4 mr-2" /> Tambah</Button>
        </div>
      </div>

      {/* TABEL */}
      {view === 'table' && (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <SortableTh label="Nama" field="name" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <SortableTh label="Tipe" field="category" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <SortableTh label="Harga" field="price" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <th className="text-left p-3 font-medium text-zinc-500">Durasi</th>
                  <SortableTh label="Foto" field="photoEditCount" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <th className="text-left p-3 font-medium text-zinc-500">Acara</th>
                  <SortableTh label="Status" field="isActive" sortField={sortField} sortDir={sortDir} onSort={requestSort} />
                  <th className="text-left p-3 font-medium text-zinc-500">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-zinc-500">Belum ada layanan</td></tr>
                ) : paged.map(s => (
                  <tr key={s.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-purple-500" />
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-zinc-500">{s.city || 'Semua area'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3"><Badge variant={s.category === 'main' ? 'default' : 'secondary'}>{s.category === 'main' ? 'Utama' : 'Tambahan'}</Badge></td>
                    <td className="p-3">
                      <span className="font-medium">{formatCurrency(s.price)}</span>
                      {s.discountPrice > 0 && <span className="text-xs text-zinc-400 line-through ml-1">{formatCurrency(s.discountPrice)}</span>}
                    </td>
                    <td className="p-3 font-mono text-xs">{s.durationHours || 0}j {s.durationMinutes || 0}m</td>
                    <td className="p-3 text-xs">{s.photoEditCount || 0} foto</td>
                    <td className="p-3"><div className="flex flex-wrap gap-1">{JSON.parse(s.eventTypes || '[]').map((et: string) => <Badge key={et} variant="outline" className="text-xs">{et}</Badge>)}</div></td>
                    <td className="p-3"><Badge variant={s.isActive ? 'default' : 'secondary'}>{s.isActive ? 'Aktif' : 'Nonaktif'}</Badge></td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      )}

      {/* KARTU */}
      {view === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paged.length === 0 ? (
            <div className="col-span-full text-center py-12 text-zinc-500">Belum ada layanan</div>
          ) : paged.map(s => {
            const costs: AdditionalCost[] = JSON.parse(s.additionalCosts || '[]');
            const eventTypes: string[] = JSON.parse(s.eventTypes || '[]');
            const isExpanded = expandedCard === s.id;
            const hasDiscount = s.discountPrice && s.discountPrice > 0;
            const duration = `${s.durationHours || 0}j ${s.durationMinutes || 0}m`;

            return (
              <Card key={s.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg"><Package className="h-4 w-4 text-purple-600" /></div>
                      <div>
                        <p className="font-semibold text-sm">{s.name}</p>
                        <p className="text-xs text-zinc-500">{s.city || 'Semua area'}</p>
                      </div>
                    </div>
                    <Badge variant={s.isActive ? 'default' : 'secondary'} className="text-xs">{s.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
                  </div>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-lg font-bold text-purple-600">{formatCurrency(s.price)}</span>
                    {hasDiscount && <span className="text-sm text-zinc-400 line-through">{formatCurrency(s.discountPrice)}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {duration}</span>
                    {s.photoEditCount > 0 && <span className="flex items-center gap-1"><Image className="h-3 w-3" /> {s.photoEditCount} foto</span>}
                    {renderCostTag(s)}
                  </div>
                  {eventTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {eventTypes.map(et => <Badge key={et} variant="outline" className="text-xs">{et}</Badge>)}
                    </div>
                  )}
                  {(costs.length > 0 || s.description) && (
                    <button onClick={() => setExpandedCard(isExpanded ? null : s.id)} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 mt-2">
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {isExpanded ? 'Sembunyikan' : 'Detail'}
                    </button>
                  )}
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t space-y-2 text-xs">
                      {s.description && <p className="text-zinc-600">{s.description}</p>}
                      {costs.length > 0 && (
                        <div>
                          <p className="font-medium text-zinc-700 mb-1">Biaya Tambahan:</p>
                          {costs.map((c: AdditionalCost, i: number) => (
                            <div key={i} className="flex justify-between text-zinc-500">
                              <span>{c.type === 'transport' ? 'Transport' : c.type === 'ticket' ? 'Tiket Masuk' : 'Lainnya'} {c.description}</span>
                              <span>{formatCurrency(c.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-1 mt-3 pt-3 border-t">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <PageSizeSelector value={pageSize} onChange={(v) => { setPageSize(v); setPage(1); }} />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Dialog Form */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit Layanan' : 'Tambah Layanan'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nama Layanan *</Label><Input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); if (formErrors.name) setFormErrors(prev => { const { name: _, ...rest } = prev; return rest; }); }} placeholder="Wedding Full Day" required />{formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}</div>
              <div className="space-y-2"><Label>Tipe Paket *</Label><Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v || 'main' }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="main">Paket Utama</SelectItem><SelectItem value="addon">Tambahan</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Deskripsi</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Deskripsi lengkap layanan ini..." /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Harga (Rp) *</Label><Input type="number" value={form.price || ''} onChange={e => { setForm(f => ({ ...f, price: Number(e.target.value) })); if (formErrors.price) setFormErrors(prev => { const { price: _, ...rest } = prev; return rest; }); }} placeholder="15000000" required />{formErrors.price && <p className="text-xs text-red-500 mt-1">{formErrors.price}</p>}</div>
              <div className="space-y-2"><Label>Harga Coret (Rp) <span className="text-zinc-400 text-xs">(opsional)</span></Label><Input type="number" value={form.discountPrice || ''} onChange={e => setForm(f => ({ ...f, discountPrice: e.target.value ? Number(e.target.value) : null }))} placeholder="18000000" /></div>
            </div>
            <div className="space-y-2"><Label>Durasi</Label><div className="flex items-center gap-2"><div className="flex-1"><Input type="number" min={0} value={form.durationHours} onChange={e => setForm(f => ({ ...f, durationHours: Number(e.target.value) }))} placeholder="0" /><p className="text-xs text-zinc-400 mt-1">Jam</p></div><span className="text-zinc-400 font-bold">:</span><div className="flex-1"><Input type="number" min={0} max={59} value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))} placeholder="0" /><p className="text-xs text-zinc-400 mt-1">Menit</p></div></div></div>
            <div className="space-y-2"><Label>Jumlah Edit Foto</Label><Input type="number" min={0} value={form.photoEditCount} onChange={e => setForm(f => ({ ...f, photoEditCount: Number(e.target.value) }))} placeholder="0" /><p className="text-xs text-zinc-400">0 = tidak termasuk edit foto</p></div>
            <div className="space-y-2"><Label>Tipe Acara</Label><div className="flex flex-wrap gap-2">{eventTypeOptions.map(type => (
              <button key={type} type="button" onClick={() => toggleEventType(type)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.eventTypes.includes(type) ? 'bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400'}`}>{type}</button>
            ))}</div></div>
            <div className="space-y-2"><Label>Kota / Kabupaten <span className="text-zinc-400 text-xs">(area terjangkau)</span></Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Jakarta, Depok, Tangerang, Bekasi" /><p className="text-xs text-zinc-400">Pisahkan dengan koma untuk beberapa kota</p></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label>Biaya Tambahan</Label><Button type="button" variant="outline" size="sm" onClick={addCost}><Plus className="h-3 w-3 mr-1" /> Tambah</Button></div>
              {form.additionalCosts.length === 0 && <p className="text-xs text-zinc-400 italic">Belum ada biaya tambahan</p>}
              {form.additionalCosts.map((cost, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                  <Select value={cost.type} onValueChange={(v) => updateCost(idx, 'type', v || 'transport')}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="transport">Transport</SelectItem><SelectItem value="ticket">Tiket Masuk</SelectItem><SelectItem value="other">Lainnya</SelectItem></SelectContent></Select>
                  <Input className="flex-1" value={cost.description} onChange={e => updateCost(idx, 'description', e.target.value)} placeholder="Deskripsi" />
                  <Input type="number" className="w-32" value={cost.amount || ''} onChange={e => updateCost(idx, 'amount', Number(e.target.value))} placeholder="Rp" />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeCost(idx)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3"><Switch checked={form.isActive} onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))} /><Label>Aktif</Label></div>
            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Batal</Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">{editId ? 'Simpan Perubahan' : 'Buat Layanan'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Hapus layanan ini?"
        description="Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
