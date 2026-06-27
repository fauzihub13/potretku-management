'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Plus, Minus, Trash2 } from 'lucide-react';
import { validateName, validatePhone, validateEmail, validateDate, validateTime, validateNumber } from '@/lib/validations';
import { formatCurrency } from '@/lib/utils-helpers';

const timeSlots = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = (i % 2) * 30;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

function addMinutes(time: string, hours: number, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMin = h * 60 + m + hours * 60 + minutes;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

interface SelectedAddon {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function CreateBookingPage() {
  const router = useRouter();
  const [services, setServices] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    clientName: '', clientEmail: '', clientPhone: '', eventType: 'Wedding',
    sessionDate: '', sessionTime: '', location: '', packageName: '',
    packagePrice: 0, totalAmount: 0, dpAmount: 0, notes: '', freelancerId: '',
    driveAllPhotos: '', driveRawPhotos: '', driveEditedPhotos: ''
  });

  useEffect(() => {
    Promise.all([api.get('/services'), api.get('/team')]).then(([s, t]) => {
      setServices(s.data);
      setTeam(t.data);
    });
  }, []);

  const selectedService = useMemo(() => services.find(s => s.id === selectedServiceId), [services, selectedServiceId]);
  const addons = useMemo(() => services.filter(s => s.category === 'addon'), [services]);

  const endTime = useMemo(() => {
    if (!selectedService || !form.sessionTime) return null;
    return addMinutes(form.sessionTime, selectedService.durationHours || 0, selectedService.durationMinutes || 0);
  }, [form.sessionTime, selectedService]);

  const durationText = useMemo(() => {
    if (!selectedService) return '';
    const h = selectedService.durationHours || 0;
    const m = selectedService.durationMinutes || 0;
    if (h === 0 && m === 0) return '';
    return `${h}j ${m}m`;
  }, [selectedService]);

  const addonsTotal = selectedAddons.reduce((s, a) => s + a.price * a.quantity, 0);

  const handleServiceSelect = (serviceId: string | null) => {
    if (!serviceId) return;
    const s = services.find(s => s.id === serviceId);
    if (s) {
      setSelectedServiceId(serviceId);
      setSelectedAddons([]);
      setForm(f => ({
        ...f,
        packageName: s.name,
        packagePrice: s.price,
        totalAmount: s.price,
        dpAmount: Math.round(s.price * 0.3)
      }));
    }
  };

  const toggleAddon = (addon: any) => {
    setSelectedAddons(prev => {
      const existing = prev.find(a => a.id === addon.id);
      if (existing) {
        return prev.filter(a => a.id !== addon.id);
      }
      return [...prev, { id: addon.id, name: addon.name, price: addon.price, quantity: 1 }];
    });
  };

  const updateAddonQty = (id: string, delta: number) => {
    setSelectedAddons(prev => prev.map(a => {
      if (a.id !== id) return a;
      const newQty = Math.max(1, a.quantity + delta);
      return { ...a, quantity: newQty };
    }));
  };

  const updateAddonQtyInput = (id: string, qty: number) => {
    setSelectedAddons(prev => prev.map(a => {
      if (a.id !== id) return a;
      return { ...a, quantity: Math.max(1, qty) };
    }));
  };

  useEffect(() => {
    if (selectedService) {
      setForm(f => ({ ...f, totalAmount: selectedService.price + addonsTotal, dpAmount: Math.round((selectedService.price + addonsTotal) * 0.3) }));
    }
  }, [addonsTotal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    const nameErr = validateName(form.clientName, 'Nama klien');
    if (nameErr) newErrors.clientName = nameErr;
    if (form.clientPhone) { const err = validatePhone(form.clientPhone); if (err) newErrors.clientPhone = err; }
    if (form.clientEmail) { const err = validateEmail(form.clientEmail); if (err) newErrors.clientEmail = err; }
    const dateErr = validateDate(form.sessionDate, 'Tanggal sesi');
    if (dateErr) newErrors.sessionDate = dateErr;
    if (form.sessionTime) { const err = validateTime(form.sessionTime); if (err) newErrors.sessionTime = err; }
    const amountErr = validateNumber(form.totalAmount, 'Total', 0);
    if (amountErr) newErrors.totalAmount = amountErr;
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      await api.post('/bookings', { ...form, addons: JSON.stringify(selectedAddons) });
      toast.success('Pemesanan berhasil dibuat');
      router.push('/bookings');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal membuat pemesanan');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => router.back()} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
      </Button>
      <Card>
        <CardHeader><CardTitle>Tambah Pemesanan</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nama Klien *</Label>
                <Input value={form.clientName} onChange={e => { update('clientName', e.target.value); if (errors.clientName) setErrors(p => { const { clientName: _, ...r } = p; return r; }); }} required />
                {errors.clientName && <p className="text-xs text-red-500">{errors.clientName}</p>}
              </div>
              <div className="space-y-2"><Label>Telepon</Label><Input value={form.clientPhone} onChange={e => { update('clientPhone', e.target.value); if (errors.clientPhone) setErrors(p => { const { clientPhone: _, ...r } = p; return r; }); }} />{errors.clientPhone && <p className="text-xs text-red-500">{errors.clientPhone}</p>}</div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.clientEmail} onChange={e => { update('clientEmail', e.target.value); if (errors.clientEmail) setErrors(p => { const { clientEmail: _, ...r } = p; return r; }); }} />{errors.clientEmail && <p className="text-xs text-red-500">{errors.clientEmail}</p>}</div>
              <div className="space-y-2"><Label>Jenis Acara *</Label><Select value={form.eventType} onValueChange={(v) => update('eventType', v || '')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Wedding', 'Pre-wedding', 'Portrait', 'Event', 'Commercial', 'Product'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Paket *</Label><Select value={selectedServiceId} onValueChange={handleServiceSelect}><SelectTrigger><SelectValue placeholder="Pilih paket" /></SelectTrigger><SelectContent>{services.filter(s => s.category === 'main').map(s => { const h = s.durationHours || 0; const m = s.durationMinutes || 0; const dur = h || m ? ` (${h}j ${m}m)` : ''; return <SelectItem key={s.id} value={s.id}>{s.name}{dur} - Rp{s.price.toLocaleString()}</SelectItem>; })}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Freelancer</Label><Select value={form.freelancerId} onValueChange={(v) => update('freelancerId', v || '')}><SelectTrigger><SelectValue placeholder="Pilih freelancer" /></SelectTrigger><SelectContent>{team.filter(t => t.isActive).map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.role})</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Tanggal Sesi *</Label><Input type="date" value={form.sessionDate} onChange={e => { update('sessionDate', e.target.value); if (errors.sessionDate) setErrors(p => { const { sessionDate: _, ...r } = p; return r; }); }} required />{errors.sessionDate && <p className="text-xs text-red-500">{errors.sessionDate}</p>}</div>
              <div className="space-y-2"><Label>Jam Mulai *</Label><Select value={form.sessionTime} onValueChange={(v) => { update('sessionTime', v || ''); if (errors.sessionTime) setErrors(p => { const { sessionTime: _, ...r } = p; return r; }); }}><SelectTrigger><SelectValue placeholder="Pilih jam" /></SelectTrigger><SelectContent className="max-h-64">{timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>{errors.sessionTime && <p className="text-xs text-red-500">{errors.sessionTime}</p>}</div>
              {form.sessionTime && selectedService && (selectedService.durationHours > 0 || selectedService.durationMinutes > 0) && (
                <div className="sm:col-span-2 lg:col-span-3"><div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800"><Clock className="h-4 w-4 text-purple-600" /><span className="text-sm font-medium text-purple-700 dark:text-purple-300">Sesi: <span className="font-bold">{form.sessionTime}</span> → <span className="font-bold">{endTime}</span> <span className="text-purple-500">({durationText})</span></span></div></div>
              )}
              <div className="space-y-2"><Label>Lokasi</Label><Input value={form.location} onChange={e => update('location', e.target.value)} /></div>
            </div>

            {/* Addons */}
            {addons.length > 0 && (
              <div className="space-y-3">
                <Label>Tambahan (opsional)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {addons.map(a => {
                    const selected = selectedAddons.find(sa => sa.id === a.id);
                    return (
                      <div key={a.id} className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${selected ? 'border-purple-300 bg-purple-50 dark:bg-purple-900/20' : 'border-zinc-200 hover:border-zinc-300'}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.name}</p>
                          <p className="text-xs text-zinc-500">{formatCurrency(a.price)}</p>
                        </div>
                        {selected ? (
                          <div className="flex items-center gap-1">
                            <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => updateAddonQty(a.id, -1)}><Minus className="h-3 w-3" /></Button>
                            <Input type="number" value={selected.quantity} onChange={e => updateAddonQtyInput(a.id, Number(e.target.value))} className="h-7 w-12 text-center text-xs p-0" min={1} />
                            <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => updateAddonQty(a.id, 1)}><Plus className="h-3 w-3" /></Button>
                          </div>
                        ) : (
                          <Button type="button" variant="outline" size="sm" onClick={() => toggleAddon(a)}><Plus className="h-3 w-3" /></Button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {selectedAddons.length > 0 && (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg space-y-1">
                    {selectedAddons.map(a => (
                      <div key={a.id} className="flex items-center justify-between text-sm">
                        <span>{a.name} × {a.quantity}</span>
                        <span className="font-medium">{formatCurrency(a.price * a.quantity)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold border-t pt-1"><span>Total Tambahan</span><span>{formatCurrency(addonsTotal)}</span></div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Total (Rp) *</Label><Input type="number" value={form.totalAmount} onChange={e => { update('totalAmount', Number(e.target.value)); if (errors.totalAmount) setErrors(p => { const { totalAmount: _, ...r } = p; return r; }); }} />{errors.totalAmount && <p className="text-xs text-red-500">{errors.totalAmount}</p>}</div>
              <div className="space-y-2"><Label>DP (Rp)</Label><Input type="number" value={form.dpAmount} onChange={e => update('dpAmount', Number(e.target.value))} /></div>
            </div>
            <div className="space-y-2"><Label>Catatan</Label><Textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3} /></div>

            {/* Google Drive */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border">
              <p className="text-sm font-medium mb-3">Link Google Drive <span className="text-zinc-400 font-normal">(isi setelah sesi foto)</span></p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1"><Label className="text-xs">Semua Foto</Label><Input value={form.driveAllPhotos || ''} onChange={e => update('driveAllPhotos', e.target.value)} placeholder="https://drive.google.com/..." /></div>
                <div className="space-y-1"><Label className="text-xs">Foto RAW</Label><Input value={form.driveRawPhotos || ''} onChange={e => update('driveRawPhotos', e.target.value)} placeholder="https://drive.google.com/..." /></div>
                <div className="space-y-1"><Label className="text-xs">Foto Edited</Label><Input value={form.driveEditedPhotos || ''} onChange={e => update('driveEditedPhotos', e.target.value)} placeholder="https://drive.google.com/..." /></div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => router.back()}>Batal</Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={loading}>{loading ? 'Menyimpan...' : 'Buat Pemesanan'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
