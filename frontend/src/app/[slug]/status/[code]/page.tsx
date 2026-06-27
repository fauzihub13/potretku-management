'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils-helpers';
import { CheckCircle, Clock, XCircle, CreditCard, ArrowLeft, Package, Calendar, Phone, Mail } from 'lucide-react';
import Link from 'next/link';

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

  useEffect(() => {
    api.get(`/vendor/${slug}/track/${code}`)
      .then(res => setBooking(res.data))
      .catch(err => setError(err.response?.data?.error || 'Pemesanan tidak ditemukan'))
      .finally(() => setLoading(false));
  }, [slug, code]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center p-4"><Card className="w-full max-w-md"><CardContent className="p-8 text-center"><p className="text-zinc-500">{error}</p><Link href={`/${slug}`}><Button variant="outline" className="mt-4">Kembali</Button></Link></CardContent></Card></div>;
  if (!booking) return null;

  const st = statusConfig[booking.status] || statusConfig.pending;
  const StatusIcon = st.icon;
  const canPay = booking.status === 'pending' && !booking.dpPaid;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b p-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href={`/${slug}`} className="text-zinc-500 hover:text-zinc-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
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

        {/* Pay Button */}
        {canPay && booking.dokuPaymentUrl && (
          <Button
            className="w-full bg-purple-600 hover:bg-purple-700"
            size="lg"
            onClick={() => window.location.href = booking.dokuPaymentUrl}
          >
            <CreditCard className="h-5 w-5 mr-2" /> Bayar Sekarang
          </Button>
        )}

        {/* Booking Details */}
        <Card>
          <CardContent className="p-4 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-zinc-500">Kode Booking</span><span className="font-mono font-bold">{booking.bookingCode}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Status</span><Badge className={st.bg + ' ' + st.color}>{st.label}</Badge></div>
            <div className="border-t pt-2 mt-2">
              <p className="font-medium mb-2">Detail Pesanan</p>
              <div className="flex justify-between"><span className="text-zinc-500">Paket</span><span>{booking.packageName}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Acara</span><span>{booking.eventType}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Tanggal</span><span>{new Date(booking.sessionDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
              {booking.sessionTime && <div className="flex justify-between"><span className="text-zinc-500">Jam</span><span>{booking.sessionTime} WIB</span></div>}
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-bold"><span>Total</span><span className="text-purple-600">{formatCurrency(booking.totalAmount)}</span></div>
              <div className="flex justify-between text-xs text-zinc-500"><span>DP (30%)</span><span>{formatCurrency(booking.dpAmount)}</span></div>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between"><span className="text-zinc-500">DP</span><Badge variant={booking.dpPaid ? 'default' : 'secondary'}>{booking.dpPaid ? 'Lunas' : 'Belum'}</Badge></div>
              <div className="flex justify-between"><span className="text-zinc-500">Pelunasan</span><Badge variant={booking.finalPaid ? 'default' : 'secondary'}>{booking.finalPaid ? 'Lunas' : 'Belum'}</Badge></div>
            </div>
          </CardContent>
        </Card>

        {/* Drive Links */}
        {(booking.driveAllPhotos || booking.driveRawPhotos || booking.driveEditedPhotos) && (
          <Card>
            <CardContent className="p-4 space-y-2 text-sm">
              <p className="font-medium mb-2">Link Foto</p>
              {booking.driveAllPhotos && <a href={booking.driveAllPhotos} target="_blank" rel="noopener" className="block text-blue-600 hover:underline">📷 Semua Foto</a>}
              {booking.driveRawPhotos && <a href={booking.driveRawPhotos} target="_blank" rel="noopener" className="block text-blue-600 hover:underline">🖼️ Foto RAW</a>}
              {booking.driveEditedPhotos && <a href={booking.driveEditedPhotos} target="_blank" rel="noopener" className="block text-blue-600 hover:underline">✨ Foto Edited</a>}
            </CardContent>
          </Card>
        )}

        <Link href={`/${slug}`}>
          <Button variant="outline" className="w-full">Kembali ke {slug}</Button>
        </Link>
      </div>
    </div>
  );
}
