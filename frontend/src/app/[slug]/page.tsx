'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils-helpers';
import { MapPin, Phone, Mail, ArrowLeft, ArrowRight, Check, Package, Clock, Camera, Plus, Minus } from 'lucide-react';

const timeSlots = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = (i % 2) * 30;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

export default function VendorPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [vendor, setVendor] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  // Form state
  const [selectedService, setSelectedService] = useState('');
  const [selectedAddons, setSelectedAddons] = useState<{id: string; name: string; price: number; quantity: number}[]>([]);
  const [form, setForm] = useState({
    clientName: '', clientPhone: '', clientEmail: '',
    eventType: '', sessionDate: '', sessionTime: '', notes: '',
    customFieldValues: {} as Record<string, string>
  });
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get(`/vendor/${slug}`)
      .then(res => {
        setVendor(res.data.vendor);
        setServices(res.data.services);
        setAddons(res.data.addons);
      })
      .catch(err => setError(err.response?.data?.error || 'Vendor tidak ditemukan'))
      .finally(() => setLoading(false));
  }, [slug]);

  const selected = services.find(s => s.id === selectedService);
  const totalAddons = selectedAddons.reduce((s, a) => s + a.price * a.quantity, 0);
  const totalAmount = (selected?.price || 0) + totalAddons;
  const dpAmount = Math.round(totalAmount * 0.3);

  const toggleAddon = (addon: any) => {
    setSelectedAddons(prev => {
      const existing = prev.find(a => a.id === addon.id);
      if (existing) return prev.filter(a => a.id !== addon.id);
      return [...prev, { id: addon.id, name: addon.name, price: addon.price, quantity: 1 }];
    });
  };

  const updateAddonQty = (id: string, delta: number) => {
    setSelectedAddons(prev => prev.map(a => a.id === id ? { ...a, quantity: Math.max(1, a.quantity + delta) } : a));
  };

  const updateAddonQtyInput = (id: string, qty: number) => {
    setSelectedAddons(prev => prev.map(a => a.id === id ? { ...a, quantity: Math.max(1, qty) } : a));
  };

  const validateStep1 = (): boolean => {
    if (!selectedService) { setStepErrors({ package: 'Pilih paket terlebih dahulu' }); return false; }
    setStepErrors({});
    return true;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.clientName.trim()) errs.clientName = 'Nama wajib diisi';
    if (!form.clientPhone.trim()) errs.clientPhone = 'Nomor WhatsApp wajib diisi';
    else if (!/^[0-9]+$/.test(form.clientPhone)) errs.clientPhone = 'Hanya boleh angka';
    else if (!form.clientPhone.startsWith('62')) errs.clientPhone = 'Harus diawali 62';
    else if (form.clientPhone.length < 10 || form.clientPhone.length > 15) errs.clientPhone = '10-15 digit';
    if (form.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.clientEmail)) errs.clientEmail = 'Email tidak valid';
    if (!form.eventType) errs.eventType = 'Pilih jenis acara';
    if (!form.sessionDate) errs.sessionDate = 'Tanggal wajib diisi';
    setStepErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Step 1: Create booking
      const bookRes = await api.post(`/vendor/${slug}/book`, {
        ...form,
        serviceId: selectedService,
        addons: selectedAddons.map(a => a.id)
      });

      const bookingCode = bookRes.data.bookingCode;
      const bookingId = bookRes.data.bookingId;

      // Step 2: Initiate DOKU payment
      try {
        const payRes = await api.post('/doku/create', { bookingId, slug });
        setBookingResult({
          bookingCode,
          bookingId,
          paymentUrl: payRes.data.paymentUrl,
          invoiceNumber: payRes.data.invoiceNumber
        });
        setStep(4);
        toast.success('Pemesanan berhasil!');
        // Langsung redirect ke DOKU
        setTimeout(() => {
          window.location.href = payRes.data.paymentUrl;
        }, 1500);
      } catch (payErr: any) {
        const errMsg = payErr.response?.data?.error || 'Payment gateway gagal';
        toast.error('Pemesanan gagal: ' + errMsg);
        setBookingResult(null);
        setStep(3);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal mengirim pemesanan');
    } finally {
      setSubmitting(false);
    }
  };

  const primaryColor = vendor?.primaryColor || '#7c3aed';

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: primaryColor }} /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center"><p className="text-zinc-500">{error}</p></div>;
  if (!vendor) return null;

  const steps = ['Paket', 'Informasi', 'Ringkasan', 'Selesai'];

  return (
    <div className="min-h-screen" style={{ '--pc': primaryColor, '--ac': vendor.accentColor || '#a78bfa' } as any}>
      {/* Header */}
      <header className="text-white py-12 px-4" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${vendor.accentColor || '#a78bfa'})` }}>
        <div className="max-w-2xl mx-auto text-center">
          {vendor.logo && <img src={vendor.logo} alt={vendor.name} className="h-16 w-16 mx-auto rounded-full object-cover mb-4 border-2 border-white/30" />}
          <h1 className="text-3xl font-bold">{vendor.name}</h1>
          {vendor.tagline && <p className="text-white/80 mt-2">{vendor.tagline}</p>}
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-white/70">
            {vendor.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {vendor.phone}</span>}
            {vendor.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {vendor.address}</span>}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Greeting */}
        {vendor.bookingGreeting && (
          <div className="mb-6 p-4 rounded-lg text-sm" style={{ backgroundColor: primaryColor + '10', color: primaryColor }}>
            {vendor.bookingGreeting}
          </div>
        )}

        {/* Steps */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i + 1 <= step ? 'text-white' : 'bg-zinc-200 text-zinc-500'}`}
                  style={i + 1 <= step ? { backgroundColor: primaryColor } : {}}>
                  {i + 1 < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:inline ${i + 1 <= step ? 'font-medium' : 'text-zinc-400'}`}>{s}</span>
                {i < steps.length - 1 && <div className={`w-8 h-0.5 ${i + 1 < step ? '' : 'bg-zinc-200'}`} style={i + 1 < step ? { backgroundColor: primaryColor } : {}} />}
              </div>
            ))}
          </div>
        )}

        {/* STEP 1: Pilih Paket */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Pilih Paket</h2>
            {stepErrors.package && <p className="text-sm text-red-500">{stepErrors.package}</p>}
            <div className="space-y-3">
              {services.map(s => {
                const dur = `${s.durationHours || 0}j ${s.durationMinutes || 0}m`;
                return (
                  <div key={s.id} onClick={() => setSelectedService(s.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedService === s.id ? 'border-current shadow-md' : 'border-zinc-200 hover:border-zinc-300'}`}
                    style={selectedService === s.id ? { borderColor: primaryColor, backgroundColor: primaryColor + '08' } : {}}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{s.name}</p>
                        {s.description && <p className="text-sm text-zinc-500 mt-1">{s.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {dur}</span>
                          {s.photoEditCount > 0 && <span className="flex items-center gap-1"><Camera className="h-3 w-3" /> {s.photoEditCount} foto</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold" style={{ color: primaryColor }}>{formatCurrency(s.price)}</p>
                        {s.discountPrice > 0 && <p className="text-xs text-zinc-400 line-through">{formatCurrency(s.discountPrice)}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Addons */}
            {addons.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-zinc-500 mb-2">Tambahan (opsional)</h3>
                <div className="space-y-2">
                  {addons.map(a => {
                    const selected = selectedAddons.find(sa => sa.id === a.id);
                    return (
                      <div key={a.id} className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${selected ? 'border-current' : 'border-zinc-200'}`}
                        style={selected ? { borderColor: primaryColor, backgroundColor: primaryColor + '08' } : {}}>
                        <div className="flex-1 min-w-0" onClick={() => toggleAddon(a)}>
                          <p className="text-sm font-medium">{a.name}</p>
                          <p className="text-xs text-zinc-500">{formatCurrency(a.price)}</p>
                        </div>
                        {selected ? (
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => updateAddonQty(a.id, -1)} className="w-7 h-7 rounded border flex items-center justify-center text-zinc-600 hover:bg-zinc-100"><Minus className="h-3 w-3" /></button>
                            <input type="number" value={selected.quantity} onChange={e => updateAddonQtyInput(a.id, Number(e.target.value))} className="w-12 h-7 text-center text-sm border rounded font-medium" min={1} />
                            <button type="button" onClick={() => updateAddonQty(a.id, 1)} className="w-7 h-7 rounded border flex items-center justify-center text-zinc-600 hover:bg-zinc-100"><Plus className="h-3 w-3" /></button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => toggleAddon(a)} className="w-8 h-8 rounded border flex items-center justify-center text-zinc-400 hover:bg-zinc-100"><Plus className="h-4 w-4" /></button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Button onClick={() => selectedService && setStep(2)} disabled={!selectedService} className="w-full mt-4" style={{ backgroundColor: primaryColor }}>
              Selanjutnya <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* STEP 2: Info Klien */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Informasi Anda</h2>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Nama Lengkap *</Label>
                <Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Masukkan nama lengkap" />
                {stepErrors.clientName && <p className="text-xs text-red-500">{stepErrors.clientName}</p>}
              </div>
              <div className="space-y-2">
                <Label>No. WhatsApp *</Label>
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.clientPhone}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setForm(f => ({ ...f, clientPhone: val }));
                    if (stepErrors.clientPhone) setStepErrors(p => { const { clientPhone: _, ...r } = p; return r; });
                  }}
                  placeholder="628123456789"
                />
                {stepErrors.clientPhone && <p className="text-xs text-red-500">{stepErrors.clientPhone}</p>}
                {!stepErrors.clientPhone && form.clientPhone && !form.clientPhone.startsWith('62') && (
                  <p className="text-xs text-amber-500">Gunakan kode negara 62 (contoh: 628123456789)</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Email (opsional)</Label>
                <Input type="email" value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))} placeholder="email@contoh.com" />
                {stepErrors.clientEmail && <p className="text-xs text-red-500">{stepErrors.clientEmail}</p>}
              </div>
              <div className="space-y-2">
                <Label>Jenis Acara *</Label>
                <Select value={form.eventType} onValueChange={(v) => setForm(f => ({ ...f, eventType: v || '' }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih jenis acara" /></SelectTrigger>
                  <SelectContent>
                    {vendor.eventTypes?.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                {stepErrors.eventType && <p className="text-xs text-red-500">{stepErrors.eventType}</p>}
              </div>
              <div className="space-y-2">
                <Label>Tanggal *</Label>
                <Input type="date" value={form.sessionDate} onChange={e => setForm(f => ({ ...f, sessionDate: e.target.value }))} />
                {stepErrors.sessionDate && <p className="text-xs text-red-500">{stepErrors.sessionDate}</p>}
              </div>
              <div className="space-y-2">
                <Label>Jam (opsional)</Label>
                <Select value={form.sessionTime} onValueChange={(v) => setForm(f => ({ ...f, sessionTime: v || '' }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih jam" /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Fields */}
              {vendor.customFields?.map((cf: any) => (
                <div key={cf.id} className="space-y-2">
                  <Label>{cf.label} {cf.required && '*'}</Label>
                  <Input
                    value={form.customFieldValues[cf.id] || ''}
                    onChange={e => setForm(f => ({ ...f, customFieldValues: { ...f.customFieldValues, [cf.id]: e.target.value } }))}
                    placeholder={cf.placeholder}
                    required={cf.required}
                  />
                </div>
              ))}

              <div className="space-y-2"><Label>Catatan (opsional)</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Kebutuhan khusus, referensi, dll." /></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStep(1); setStepErrors({}); }} className="flex-1"><ArrowLeft className="h-4 w-4 mr-2" /> Kembali</Button>
              <Button onClick={goNext} className="flex-1" style={{ backgroundColor: primaryColor }}>
                Selanjutnya <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Ringkasan */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Ringkasan Pemesanan</h2>
            <Card>
              <CardContent className="p-4 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-zinc-500">Nama</span><span className="font-medium">{form.clientName}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">WhatsApp</span><span>{form.clientPhone}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Acara</span><span>{form.eventType}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Tanggal</span><span>{form.sessionDate}</span></div>
                {form.sessionTime && <div className="flex justify-between"><span className="text-zinc-500">Jam</span><span>{form.sessionTime} WIB</span></div>}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between"><span className="text-zinc-500">Paket</span><span className="font-medium">{selected?.name}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Harga paket</span><span>{formatCurrency(selected?.price || 0)}</span></div>
                  {selectedAddons.length > 0 && selectedAddons.map(a => (
                    <div key={a.id} className="flex justify-between"><span className="text-zinc-500">+ {a.name} ×{a.quantity}</span><span>{formatCurrency(a.price * a.quantity)}</span></div>
                  ))}
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-bold text-base"><span>Total</span><span style={{ color: primaryColor }}>{formatCurrency(totalAmount)}</span></div>
                  <div className="flex justify-between text-xs text-zinc-500 mt-1"><span>DP (30%)</span><span>{formatCurrency(dpAmount)}</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Terms */}
            {vendor.termsHtml && (
              <div className="p-3 text-xs text-zinc-500 bg-zinc-50 rounded-lg max-h-32 overflow-y-auto" dangerouslySetInnerHTML={{ __html: vendor.termsHtml }} />
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1"><ArrowLeft className="h-4 w-4 mr-2" /> Kembali</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1" style={{ backgroundColor: primaryColor }}>
                {submitting ? 'Mengirim...' : 'Kirim Pemesanan'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Selesai */}
        {step === 4 && bookingResult && (
          <div className="text-center space-y-4 py-8">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
              <Check className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold">Pemesanan Berhasil!</h2>
            <p className="text-zinc-500">Kode pemesanan Anda:</p>
            <p className="text-2xl font-mono font-bold" style={{ color: primaryColor }}>{bookingResult.bookingCode}</p>
            {bookingResult.paymentUrl ? (
              <div className="space-y-3">
                <p className="text-sm text-zinc-500">Anda akan diarahkan ke halaman pembayaran...</p>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto" />
              </div>
            ) : (
              <>
                <p className="text-sm text-zinc-500">Simpan kode ini untuk melacak status pesanan.</p>
                <Link href={`/${slug}/status/${bookingResult.bookingCode}`}>
                  <Button variant="outline" className="mt-2">Lihat Status Pesanan</Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-zinc-400 border-t mt-12">
        Powered by <span className="font-medium" style={{ color: primaryColor }}>Potretku</span>
      </footer>
    </div>
  );
}
