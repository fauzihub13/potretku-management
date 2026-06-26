'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', type: 'whatsapp', content: '', variables: '' });

  useEffect(() => {
    api.get('/templates').then(res => setTemplates(res.data)).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/templates', form);
      toast.success('Templat dibuat');
      setForm({ name: '', type: 'whatsapp', content: '', variables: '' });
      const res = await api.get('/templates');
      setTemplates(res.data);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus?')) return;
    try { await api.delete(`/templates/${id}`); toast.success('Berhasil dihapus'); setTemplates(t => t.filter(x => x.id !== id)); } catch { toast.error('Gagal'); }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Templat</h2>

      <Card>
        <CardHeader><CardTitle className="text-base">Buat Templat Baru</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nama *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Tipe</Label><Input value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} placeholder="whatsapp / invoice" /></div>
            </div>
            <div className="space-y-2">
              <Label>Konten</Label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} placeholder="Gunakan sintaks {variable} untuk konten dinamis" />
            </div>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Buat Templat</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {templates.map(t => (
          <Card key={t.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-zinc-500 mt-1 whitespace-pre-wrap">{t.content}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="text-red-600">Hapus</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
