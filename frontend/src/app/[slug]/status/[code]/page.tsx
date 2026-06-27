'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils-helpers';
import { CheckCircle, Clock, XCircle, CreditCard, ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Menunggu Pembayaran' },
  paid: { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Sudah Dibayar' },
  completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Selesai' },
  cancelled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Dibatalkan' },
};

export default function BookingStatusPage() {
  const params = useParams();
  const slug = params.slug as string;
  const code = params.code as string;
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [payType, setPayType] = useState<'dp' | 'full' | 'remaining' | null>(null);

  const fetchBooking = () => {
    api.get(`/vendor/${slug}/track/${code}`)
      .then(res => setBooking(res.data))
      .catch(err => setError(err.response?.data?.error || 'Pemesanan tidak ditemukan'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBooking(); }, [slug, code]);

  const dpAmount = booking?.dpAmount || 0;
  const totalAmount = booking?.totalAmount || 0;
  const remaining = totalAmount - dpAmount;

  const handlePay = async (type: 'dp' | 'full' | 'remaining') => {
    setPaying(true);
    setPayType(type);
    try {
      const res = await api.post('/doku/create', { bookingId: booking.id, slug, paymentType: type });
      window.location.href = res.data.paymentUrl;
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal membuat pembayaran');
      setPaying(false);
      setPayType(null);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center p-4"><Card className="w-full max-w-md"><CardContent className="p-8 text-center"><p className="text-zinc-500">{error}</p><Link href={`/${slug}`}><Button variant="outline" className="mt-4">Kembali</Button></Link></CardContent></Card></div>;
  if (!booking) return null;

  const st = statusConfig[booking.status] || statusConfig.pending;
  const StatusIcon = st.icon;
  const isPending = booking.status === 'pending';
  const isPaid = booking.status === 'paid';
  const isCancelled = booking.status === 'cancelled';
  const isCompleted = booking.status === 'completed';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="bg-white dark:bg-zinc-900 border-b p-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href={`/${slug}`} className="text-zinc-500 hover:text-zinc-700"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="font-semibold">Status Pemesanan</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Status Banner */}
        <div className={`p-6 rounded-xl text-center ${st.bg}`}>
          <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${st.bg}`}>
            <StatusIcon className={`h-8 w-8 ${st.color}`} />
          </div>
          <h2 className={`text-xl font-bold mt-3 ${st.color}`}>{st.label}</h2>
          <p className="text-sm text-zinc-500 mt-1">Kode: <span className="font-mono font-bold">{booking.bookingCode}</span></p>
        </div>

        {/* Payment Breakdown */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">Rincian Pembayaran</p>
            <div className="flex justify-between text-sm"><span className="text-zinc-500">Total Pesanan</span><span className="font-bold">{formatCurrency(totalAmount)}</span></div>

            {/* DP Status */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500">DP (30%) — {formatCurrency(dpAmount)}</span>
              {booking.dpPaid ? (
                <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" /> Lunas</Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" /> Belum</Badge>
              )}
            </div>

            {/* Sisa Tagihan */}
            {!booking.dpPaid && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Sisa Tagihan — {formatCurrency(remaining)}</span>
                <Badge className="bg-zinc-100 text-zinc-600">Belum Dibayar</Badge>
              </div>
            )}

            {/* Final Payment Status */}
            {booking.dpPaid && !booking.finalPaid && !isCancelled && !isCompleted && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Pelunasan — {formatCurrency(remaining)}</span>
                <Badge className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" /> Belum</Badge>
              </div>
            )}

            {booking.dpPaid && booking.finalPaid && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Pelunasan</span>
                <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" /> Lunas</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Buttons */}
        {!isCancelled && !isCompleted && (
          <div className="space-y-2">
            {/* Belum bayar apapun — tampil opsi DP atau Lunas */}
            {!booking.dpPaid && (
              <>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  size="lg"
                  onClick={() => handlePay('dp')}
                  disabled={paying}
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  {paying && payType === 'dp' ? 'Memproses...' : `Bayar DP — ${formatCurrency(dpAmount)}`}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handlePay('full')}
                  disabled={paying}
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  {paying && payType === 'full' ? 'Memproses...' : `Bayar Lunas — ${formatCurrency(totalAmount)}`}
                </Button>
              </>
            )}

            {/* Sudah bayar DP, belum lunas — tampil tombol bayar sisa */}
            {booking.dpPaid && !booking.finalPaid && (
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="lg"
                onClick={() => handlePay('remaining')}
                disabled={paying}
              >
                <CreditCard className="h-5 w-5 mr-2" />
                {paying && payType === 'remaining' ? 'Memproses...' : `Bayar Sisa — ${formatCurrency(remaining)}`}
              </Button>
            )}
          </div>
        )}

        {/* Dibatalkan */}
        {isCancelled && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-center">
            <p className="text-sm text-red-600 font-medium">Pesanan ini telah dibatalkan oleh vendor.</p>
          </div>
        )}

        {/* Booking Details */}
        <Card>
          <CardContent className="p-4 space-y-3 text-sm">
            <p className="font-medium">Detail Pesanan</p>
            <div className="flex justify-between"><span className="text-zinc-500">Paket</span><span>{booking.packageName}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Acara</span><span>{booking.eventType}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Tanggal</span><span>{new Date(booking.sessionDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
            {booking.sessionTime && <div className="flex justify-between"><span className="text-zinc-500">Jam</span><span>{booking.sessionTime} WIB</span></div>}
          </CardContent>
        </Card>

        {/* Drive Links */}
        {(booking.driveAllPhotos || booking.driveRawPhotos || booking.driveEditedPhotos) && (
          <Card>
            <CardContent className="p-4 space-y-2 text-sm">
              <p className="font-medium">Link Foto</p>
              {booking.driveAllPhotos && <a href={booking.driveAllPhotos} target="_blank" rel="noopener" className="text-blue-600 hover:underline">📷 Semua Foto</a>}
              {booking.driveRawPhotos && <a href={booking.driveRawPhotos} target="_blank" rel="noopener" className="text-blue-600 hover:underline">🖼️ Foto RAW</a>}
              {booking.driveEditedPhotos && <a href={booking.driveEditedPhotos} target="_blank" rel="noopener" className="text-blue-600 hover:underline">✨ Foto Edited</a>}
            </CardContent>
          </Card>
        )}

        <Link href={`/${slug}`}><Button variant="outline" className="w-full">Kembali ke {slug}</Button></Link>
      </div>
    </div>
  );
}
