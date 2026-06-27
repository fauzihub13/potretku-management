'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate, statusColors, statusLabels } from '@/lib/utils-helpers';
import { ArrowLeft, Edit, CheckCircle, Clock, ArrowRight, FileText, MessageCircle, CalendarDays, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

function addMinutes(time: string, hours: number, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMin = h * 60 + m + hours * 60 + minutes;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get(`/bookings/${params.id}`), api.get('/services')])
      .then(([b, s]) => { setBooking(b.data); setServices(s.data); })
      .finally(() => setLoading(false));
  }, [params.id]);

  const matchedService = useMemo(() => {
    if (!booking) return null;
    return services.find(s => s.name === booking.packageName);
  }, [booking, services]);

  const endTime = useMemo(() => {
    if (!matchedService || !booking?.sessionTime) return null;
    const h = matchedService.durationHours || 0;
    const m = matchedService.durationMinutes || 0;
    if (h === 0 && m === 0) return null;
    return addMinutes(booking.sessionTime, h, m);
  }, [matchedService, booking]);

  const durationText = useMemo(() => {
    if (!matchedService) return '';
    const h = matchedService.durationHours || 0;
    const m = matchedService.durationMinutes || 0;
    if (h === 0 && m === 0) return '';
    return `${h}j ${m}m`;
  }, [matchedService]);

  const updateStatus = async (status: string) => {
    try {
      await api.put(`/bookings/${params.id}/status`, { status });
      setBooking((b: any) => ({ ...b, status }));
      toast.success('Status diperbarui');
    } catch { toast.error('Gagal memperbarui'); }
  };

  const toggleDp = async () => {
    try {
      await api.put(`/bookings/${params.id}/dp`, { dpPaid: !booking.dpPaid });
      setBooking((b: any) => ({ ...b, dpPaid: !b.dpPaid, dpPaidAt: !b.dpPaid ? new Date() : null }));
      toast.success(booking.dpPaid ? 'DP dibatalkan' : 'DP ditandai lunas');
    } catch { toast.error('Gagal'); }
  };

  const toggleFinal = async () => {
    try {
      await api.put(`/bookings/${params.id}/final-payment`, { finalPaid: !booking.finalPaid });
      setBooking((b: any) => ({ ...b, finalPaid: !b.finalPaid, finalPaidAt: !b.finalPaid ? new Date() : null }));
      toast.success(booking.finalPaid ? 'Pelunasan dibatalkan' : 'Pelunasan ditandai lunas');
    } catch { toast.error('Gagal'); }
  };

  const saveDriveLink = async (field: string, value: string) => {
    try {
      await api.put(`/bookings/${params.id}`, { [field]: value || null });
      setBooking((b: any) => ({ ...b, [field]: value || null }));
      toast.success('Link berhasil disimpan');
    } catch { toast.error('Gagal menyimpan'); }
  };

  const handleDownloadInvoice = async () => {
    try {
      const res = await api.get(`/bookings/${params.id}/invoice`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `faktur-${booking.bookingCode}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Faktur berhasil diunduh');
    } catch { toast.error('Gagal mengunduh faktur'); }
  };

  const handleSendWhatsApp = () => {
    const phone = booking.clientPhone?.replace(/[^0-9]/g, '');
    if (!phone) return toast.error('Nomor telepon klien tidak tersedia');
    const remaining = booking.totalAmount - booking.dpAmount;
    const msg = `Halo ${booking.clientName}! 👋\n\n` +
      `Berikut informasi pemesanan Anda:\n` +
      `📋 Kode: *${booking.bookingCode}*\n` +
      `📸 Acara: ${booking.eventType}\n` +
      `📅 Tanggal: ${new Date(booking.sessionDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}\n` +
      `📦 Paket: ${booking.packageName}\n` +
      `💰 Total: *Rp${booking.totalAmount.toLocaleString('id-ID')}*\n` +
      `💵 DP: Rp${booking.dpAmount.toLocaleString('id-ID')} (${booking.dpPaid ? 'Lunas ✅' : 'Belum'})\n` +
      `📊 Sisa: *Rp${remaining.toLocaleString('id-ID')}*\n` +
      (booking.finalPaid ? `\n✅ Pembayaran sudah lunas. Terima kasih!` : `\nSilakan lakukan pelunasan sebelum hari H. Terima kasih!`);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSyncCalendar = async () => {
    try {
      const res = await api.post(`/google-calendar/sync/${booking.id}`);
      setBooking((b: any) => ({ ...b, calendarSynced: true, googleEventId: res.data.eventId }));
      toast.success('Tersinkronisasi ke Google Calendar', {
        description: res.data.htmlLink ? 'Klik untuk buka di Google Calendar' : undefined,
        action: res.data.htmlLink ? { label: 'Buka', onClick: () => window.open(res.data.htmlLink, '_blank') } : undefined
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Gagal sync';
      if (msg.includes('belum terhubung')) toast.error('Hubungkan Google Calendar di Pengaturan');
      else toast.error(msg);
    }
  };

  const handleUnsyncCalendar = async () => {
    try {
      await api.delete(`/google-calendar/sync/${booking.id}`);
      setBooking((b: any) => ({ ...b, calendarSynced: false, googleEventId: null }));
      toast.success('Dihapus dari Google Calendar');
    } catch { toast.error('Gagal'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>;
  if (!booking) return <div className="text-center py-10">Pemesanan tidak ditemukan</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadInvoice}>
            <FileText className="h-4 w-4 mr-1" /> Faktur
          </Button>
          <Button variant="outline" size="sm" onClick={handleSendWhatsApp} className="text-green-600 border-green-300 hover:bg-green-50">
            <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
          </Button>
          {booking.calendarSynced ? (
            <Button variant="outline" size="sm" onClick={handleUnsyncCalendar} className="text-orange-600 border-orange-300 hover:bg-orange-50">
              <CalendarDays className="h-4 w-4 mr-1" /> Batal Sync
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleSyncCalendar} className="text-blue-600 border-blue-300 hover:bg-blue-50">
              <RefreshCw className="h-4 w-4 mr-1" /> Sync Kalender
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push(`/bookings/${booking.id}/edit`)}>
            <Edit className="h-4 w-4 mr-1" /> Edit
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">{booking.bookingCode}</h2>
        <Badge className={statusColors[booking.status]}>{statusLabels[booking.status]}</Badge>
        {booking.calendarSynced && (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <CalendarDays className="h-3 w-3 mr-1" /> Tersync
          </Badge>
        )}
      </div>

      {booking.sessionTime && endTime && (
        <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
          <Clock className="h-5 w-5 text-purple-600 flex-shrink-0" />
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono font-bold text-purple-700 dark:text-purple-300 text-lg">{booking.sessionTime}</span>
            <ArrowRight className="h-4 w-4 text-purple-400" />
            <span className="font-mono font-bold text-purple-700 dark:text-purple-300 text-lg">{endTime}</span>
            <span className="text-purple-500 ml-1">({durationText})</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Informasi Klien</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-zinc-500">Nama</span><span className="font-medium">{booking.clientName}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Email</span><span>{booking.clientEmail || '-'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Telepon</span><span>{booking.clientPhone || '-'}</span></div>
            <div className="flex justify-between pt-2 border-t mt-2">
              <span className="text-zinc-500">Dibuat</span>
              <span className="text-xs">
                {new Date(booking.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                {' '}
                {new Date(booking.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Detail Sesi</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-zinc-500">Acara</span><span className="font-medium">{booking.eventType}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Tanggal</span><span>{formatDate(booking.sessionDate)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Jam</span>
              <span className="font-mono font-medium">{booking.sessionTime}{endTime ? ` → ${endTime}` : ''}</span>
            </div>
            {durationText && (
              <div className="flex justify-between"><span className="text-zinc-500">Durasi</span><span>{durationText}</span></div>
            )}
            <div className="flex justify-between"><span className="text-zinc-500">Lokasi</span><span>{booking.location || '-'}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Paket & Pembayaran</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-zinc-500">Paket</span><span className="font-medium">{booking.packageName}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Harga Paket</span><span>{formatCurrency(booking.packagePrice)}</span></div>
            
            {booking.bookingAddons && booking.bookingAddons.length > 0 && (
              <>
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs font-medium text-zinc-500 mb-1">Tambahan:</p>
                  {booking.bookingAddons.map((addon: any) => (
                    <div key={addon.id} className="flex justify-between text-xs">
                      <span className="text-zinc-600">{addon.name} {addon.quantity > 1 ? `×${addon.quantity}` : ''}</span>
                      <span>{formatCurrency(addon.price * addon.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-zinc-500">Total Tambahan</span>
                  <span>{formatCurrency(booking.bookingAddons.reduce((s: number, a: any) => s + a.price * a.quantity, 0))}</span>
                </div>
              </>
            )}
            
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Total</span><span>{formatCurrency(booking.totalAmount)}</span>
            </div>
            <div className="flex justify-between"><span className="text-zinc-500">DP</span><span>{formatCurrency(booking.dpAmount)}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">DP Terbayar</span>
              <Button variant={booking.dpPaid ? 'default' : 'outline'} size="sm" onClick={toggleDp}>
                {booking.dpPaid ? <><CheckCircle className="h-3 w-3 mr-1" /> Lunas</> : <><Clock className="h-3 w-3 mr-1" /> Belum</>}
              </Button>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">Pelunasan</span>
              <Button variant={booking.finalPaid ? 'default' : 'outline'} size="sm" onClick={toggleFinal}>
                {booking.finalPaid ? <><CheckCircle className="h-3 w-3 mr-1" /> Lunas</> : <><Clock className="h-3 w-3 mr-1" /> Belum</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Kelola Status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-zinc-500">Status "Menunggu Pembayaran" dan "Sudah Dibayar" dikelola otomatis oleh payment gateway.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={booking.status === 'cancelled' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => updateStatus('cancelled')}
                disabled={booking.status === 'cancelled'}
              >
                {booking.status === 'cancelled' ? 'Dibatalkan ✓' : 'Dibatalkan'}
              </Button>
              <Button
                variant={booking.status === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateStatus('completed')}
                disabled={booking.status === 'completed'}
                className={booking.status === 'completed' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {booking.status === 'completed' ? 'Selesai ✓' : 'Selesai'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {booking.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Catatan</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-zinc-600 dark:text-zinc-400">{booking.notes}</p></CardContent>
        </Card>
      )}

      {/* Link Google Drive */}
      <Card>
        <CardHeader><CardTitle className="text-base">Link Google Drive</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <DriveLinkRow
            label="Semua Foto (All Photos)"
            value={booking.driveAllPhotos}
            placeholder="https://drive.google.com/drive/folders/..."
            onSave={(val) => saveDriveLink('driveAllPhotos', val)}
          />
          <DriveLinkRow
            label="Foto RAW"
            value={booking.driveRawPhotos}
            placeholder="https://drive.google.com/drive/folders/..."
            onSave={(val) => saveDriveLink('driveRawPhotos', val)}
          />
          <DriveLinkRow
            label="Foto Edited"
            value={booking.driveEditedPhotos}
            placeholder="https://drive.google.com/drive/folders/..."
            onSave={(val) => saveDriveLink('driveEditedPhotos', val)}
          />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DriveLinkRow({ label, value, placeholder, onSave }: { label: string; value: string | null; placeholder: string; onSave: (val: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setTemp(value || ''); }, [value]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(temp);
    setSaving(false);
    setEditing(false);
  };

  if (!editing && !value) {
    return (
      <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
        <div className="flex-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-zinc-400 mt-0.5">Belum ada link</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Tambah Link</Button>
      </div>
    );
  }

  if (!editing && value) {
    return (
      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">{value}</a>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
      <div className="flex-1">
        <p className="text-sm font-medium mb-1">{label}</p>
        <Input value={temp} onChange={e => setTemp(e.target.value)} placeholder={placeholder} className="text-xs" />
      </div>
      <Button variant="ghost" size="sm" onClick={handleSave} disabled={saving} className="text-green-600">{saving ? '...' : 'Simpan'}</Button>
      <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setTemp(value || ''); }}>Batal</Button>
    </div>
  );
}
