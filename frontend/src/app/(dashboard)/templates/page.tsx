'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', type: 'whatsapp', content: '', variables: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    api.get('/templates').then(res => setTemplates(res.data)).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Nama templat wajib diisi";
    if (!form.content.trim()) newErrors.content = "Konten templat wajib diisi";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    try {
      await api.post('/templates', form);
      toast.success('Templat dibuat');
      setForm({ name: '', type: 'whatsapp', content: '', variables: '' });
      const res = await api.get('/templates');
      setTemplates(res.data);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await api.delete(`/templates/${deleteId}`); toast.success('Berhasil dihapus'); setTemplates(t => t.filter(x => x.id !== deleteId)); } catch { toast.error('Gagal'); }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Templat</h2>

      <Card>
        <CardHeader><CardTitle className="text-base">Buat Templat Baru</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nama *</Label><Input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); if (errors.name) setErrors(p => { const { name: _, ...r } = p; return r; }); }} required />{errors.name && <p className="text-xs text-red-500">{errors.name}</p>}</div>
              <div className="space-y-2"><Label>Tipe</Label><Input value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} placeholder="whatsapp / invoice" /></div>
            </div>
            <div className="space-y-2">
              <Label>Konten</Label>
              <Textarea value={form.content} onChange={e => { setForm(f => ({ ...f, content: e.target.value })); if (errors.content) setErrors(p => { const { content: _, ...r } = p; return r; }); }} rows={4} placeholder="Gunakan sintaks {variable} untuk konten dinamis" />
              {errors.content && <p className="text-xs text-red-500">{errors.content}</p>}
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
