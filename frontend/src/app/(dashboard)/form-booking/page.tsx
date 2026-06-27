'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, Plus, Trash2, Eye, ExternalLink, Palette } from 'lucide-react';

interface CustomField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options: string;
  placeholder: string;
}

const fieldTypes = [
  { value: 'text', label: 'Teks Singkat' },
  { value: 'textarea', label: 'Teks Panjang' },
  { value: 'number', label: 'Angka' },
  { value: 'select', label: 'Pilihan' },
  { value: 'checkbox', label: 'Centang' },
  { value: 'date', label: 'Tanggal' },
  { value: 'phone', label: 'Telepon' },
];

export default function FormBookingPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    api.get('/settings').then(res => {
      setSettings(res.data);
      setCustomFields(JSON.parse(res.data.vendorCustomFields || '[]'));
    }).finally(() => setLoading(false));
  }, []);

  const update = (field: string, value: any) => setSettings((s: any) => ({ ...s, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', { ...settings, vendorCustomFields: JSON.stringify(customFields) });
      toast.success('Pengaturan disimpan');
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  const checkSlug = async (slug: string) => {
    if (!slug) { setSlugAvailable(null); return; }
    try {
      const res = await api.get(`/vendor/${slug}`);
      setSlugAvailable(false);
    } catch { setSlugAvailable(true); }
  };

  const addField = () => {
    const id = 'field_' + Date.now();
    setCustomFields(f => [...f, { id, label: '', type: 'text', required: false, options: '', placeholder: '' }]);
  };

  const updateField = (id: string, key: keyof CustomField, value: any) => {
    setCustomFields(f => f.map(field => field.id === id ? { ...field, [key]: value } : field));
  };

  const removeField = (id: string) => {
    setCustomFields(f => f.filter(field => field.id !== id));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Form Booking Publik</h2>
          <p className="text-sm text-zinc-500">Setup halaman pemesanan untuk klien Anda</p>
        </div>
        <div className="flex gap-2">
          {settings?.vendorSlug && (
            <Button variant="outline" size="sm" onClick={() => window.open(`/${settings.vendorSlug}`, '_blank')}>
              <Eye className="h-4 w-4 mr-1" /> Preview
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </div>

      {/* Vendor URL */}
      <Card>
        <CardHeader><CardTitle className="text-base">URL Publik</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500">potretku.com/</span>
            <Input
              value={settings?.vendorSlug || ''}
              onChange={e => {
                const val = e.target.value.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9-_]/g, '');
                update('vendorSlug', val);
                checkSlug(val);
              }}
              placeholder="namavendor"
              className="flex-1 max-w-xs lowercase"
            />
            {slugAvailable === true && <span className="text-xs text-green-600">✓ Tersedia</span>}
            {slugAvailable === false && <span className="text-xs text-red-600">✗ Sudah dipakai</span>}
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4" /> Branding & Warna</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama Vendor / Studio</Label>
              <Input value={settings?.user?.studioName || ''} onChange={e => update('user', { ...settings.user, studioName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input value={settings?.vendorTagline || ''} onChange={e => update('vendorTagline', e.target.value)} placeholder="Fotografer profesional Jakarta" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Deskripsi Usaha</Label>
            <Textarea value={settings?.vendorDescription || ''} onChange={e => update('vendorDescription', e.target.value)} rows={3} placeholder="Deskripsi singkat tentang usaha Anda..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-3">
                {settings?.vendorLogo && <img src={settings.vendorLogo} alt="Logo" className="h-12 w-12 rounded-lg object-cover border" />}
                <label className="flex-1">
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.append('file', file);
                    try {
                      const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                      update('vendorLogo', res.data.url);
                      toast.success('Logo diunggah');
                    } catch { toast.error('Gagal upload'); }
                  }} />
                  <span className="flex items-center justify-center gap-2 p-2 border-2 border-dashed rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm text-zinc-500">
                    📷 {settings?.vendorLogo ? 'Ganti Logo' : 'Pilih Logo'}
                  </span>
                </label>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Warna Primer</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={settings?.vendorPrimaryColor || '#7c3aed'} onChange={e => update('vendorPrimaryColor', e.target.value)} className="h-10 w-10 rounded border cursor-pointer" />
                <Input value={settings?.vendorPrimaryColor || '#7c3aed'} onChange={e => update('vendorPrimaryColor', e.target.value)} className="font-mono text-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Warna Aksen</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={settings?.vendorAccentColor || '#a78bfa'} onChange={e => update('vendorAccentColor', e.target.value)} className="h-10 w-10 rounded border cursor-pointer" />
                <Input value={settings?.vendorAccentColor || '#a78bfa'} onChange={e => update('vendorAccentColor', e.target.value)} className="font-mono text-sm" />
              </div>
            </div>
          </div>
          {/* Color Preview */}
          <div className="p-4 rounded-lg border" style={{ backgroundColor: settings?.vendorPrimaryColor || '#7c3aed' }}>
            <div className="flex items-center gap-3">
              {settings?.vendorLogo && <img src={settings.vendorLogo} alt="Logo" className="h-10 w-10 rounded-full object-cover border border-white/30" />}
              <div>
                <p className="text-white font-bold">{settings?.user?.studioName || 'Studio Name'}</p>
                <p className="text-white/80 text-sm">{settings?.vendorTagline || 'Tagline'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader><CardTitle className="text-base">Kontak</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Telepon</Label><Input value={settings?.vendorPhone || ''} onChange={e => update('vendorPhone', e.target.value)} placeholder="628123456789" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={settings?.vendorEmail || ''} onChange={e => update('vendorEmail', e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Alamat</Label><Textarea value={settings?.vendorAddress || ''} onChange={e => update('vendorAddress', e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Instagram</Label><Input value={settings?.vendorSocialInstagram || ''} onChange={e => update('vendorSocialInstagram', e.target.value)} placeholder="@username" /></div>
            <div className="space-y-2"><Label>TikTok</Label><Input value={settings?.vendorSocialTiktok || ''} onChange={e => update('vendorSocialTiktok', e.target.value)} placeholder="@username" /></div>
            <div className="space-y-2"><Label>Facebook</Label><Input value={settings?.vendorSocialFacebook || ''} onChange={e => update('vendorSocialFacebook', e.target.value)} placeholder="URL profil" /></div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Fields */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Field Kustom (Form Pemesanan)</CardTitle>
          <Button variant="outline" size="sm" onClick={addField}><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {customFields.length === 0 && <p className="text-sm text-zinc-500 italic">Belum ada field kustom. Form hanya berisi nama, telepon, tanggal, dan paket.</p>}
          {customFields.map(field => (
            <div key={field.id} className="flex items-start gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                <Input value={field.label} onChange={e => updateField(field.id, 'label', e.target.value)} placeholder="Label field" />
                <Select value={field.type} onValueChange={(v) => updateField(field.id, 'type', v || 'text')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{fieldTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
                <Input value={field.placeholder} onChange={e => updateField(field.id, 'placeholder', e.target.value)} placeholder="Placeholder" />
                <div className="flex items-center gap-2">
                  <Switch checked={field.required} onCheckedChange={(v) => updateField(field.id, 'required', v)} />
                  <Label className="text-xs">Wajib</Label>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeField(field.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Terms & Greeting */}
      <Card>
        <CardHeader><CardTitle className="text-base">Sapaan & Ketentuan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Sapaan Formulir</Label><Textarea value={settings?.bookingFormGreeting || ''} onChange={e => update('bookingFormGreeting', e.target.value)} rows={2} placeholder="Selamat datang! Silakan isi form berikut untuk pemesanan." /></div>
          <div className="space-y-2"><Label>Syarat & Ketentuan (HTML)</Label><Textarea value={settings?.vendorTermsHtml || ''} onChange={e => update('vendorTermsHtml', e.target.value)} rows={4} placeholder="<p>DP 30% dari total harga</p><p>Pembatalan H-7 tidak refund</p>" /></div>
        </CardContent>
      </Card>
    </div>
  );
}
