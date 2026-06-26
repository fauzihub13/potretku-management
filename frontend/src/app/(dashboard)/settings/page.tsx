'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    api.get('/settings').then(res => setSettings(res.data)).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', settings);
      toast.success('Pengaturan disimpan');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal');
    } finally {
      setSaving(false);
    }
  };

  const update = (field: string, value: any) => setSettings((s: any) => ({ ...s, [field]: value }));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>;

  const tabs = [
    { id: 'general', label: 'Umum' },
    { id: 'payment', label: 'Pembayaran' },
    { id: 'booking-form', label: 'Formulir Pemesanan' },
    { id: 'seo', label: 'SEO' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pengaturan</h2>
        <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
          <Save className="h-4 w-4 mr-2" /> {saving ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </div>

      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        {tabs.map(t => (
          <Button
            key={t.id}
            variant={activeTab === t.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(t.id)}
            className={activeTab === t.id ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {activeTab === 'general' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Pengaturan Umum</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Sapaan Formulir Pemesanan</Label><Textarea value={settings?.bookingFormGreeting || ''} onChange={e => update('bookingFormGreeting', e.target.value)} rows={3} placeholder="Pesan selamat datang untuk formulir pemesanan" /></div>
              <div className="space-y-2"><Label>Sapaan Formulir Pelunasan</Label><Textarea value={settings?.settlementGreeting || ''} onChange={e => update('settlementGreeting', e.target.value)} rows={3} placeholder="Pesan selamat datang untuk pelunasan" /></div>
            </div>
            <div className="space-y-2">
              <Label>Tipe Acara (pisahkan dengan koma)</Label>
              <Input value={settings?.eventTypes?.replace(/[\[\]"]/g, '') || ''} onChange={e => update('eventTypes', JSON.stringify(e.target.value.split(',').map(s => s.trim())))} placeholder="Wedding, Pre-wedding, Portrait, Event" />
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'payment' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Pengaturan Pembayaran</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Rekening Bank (format JSON)</Label>
              <Textarea value={settings?.bankAccounts || '[]'} onChange={e => update('bankAccounts', e.target.value)} rows={4} placeholder='[{"bank":"BCA","number":"123","name":"Studio"}]' />
            </div>
            <div className="space-y-2">
              <Label>URL Gambar QRIS</Label>
              <Input value={settings?.qrisImage || ''} onChange={e => update('qrisImage', e.target.value)} placeholder="URL gambar QRIS" />
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'booking-form' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Pengaturan Formulir Pemesanan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Status Kustom (JSON)</Label><Textarea value={settings?.customStatuses || '[]'} onChange={e => update('customStatuses', e.target.value)} rows={3} /></div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'seo' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Pengaturan SEO</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Judul Meta</Label><Input value={settings?.seoTitle || ''} onChange={e => update('seoTitle', e.target.value)} placeholder="Nama studio Anda - Fotografi" /></div>
            <div className="space-y-2"><Label>Deskripsi Meta</Label><Textarea value={settings?.seoDescription || ''} onChange={e => update('seoDescription', e.target.value)} rows={2} placeholder="Layanan fotografi profesional" /></div>
            <div className="space-y-2"><Label>Kata Kunci</Label><Input value={settings?.seoKeywords || ''} onChange={e => update('seoKeywords', e.target.value)} placeholder="fotografi, wedding, studio" /></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
