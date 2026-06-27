'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';

function CallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'success' | 'pending' | 'error'>('pending');
  const bookingCode = searchParams.get('bookingCode') || '';

  useEffect(() => {
    const order = searchParams.get('order') || searchParams.get('invoice_number');
    if (order) setStatus('success');
    else if (searchParams.get('error')) setStatus('error');
    else setStatus('success');
  }, [searchParams]);

  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-8 text-center space-y-4">
        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold">Pembayaran Berhasil!</h1>
            {bookingCode && <p className="text-lg font-mono font-bold text-purple-600">{bookingCode}</p>}
            <p className="text-sm text-zinc-500">Pembayaran telah diterima. Silakan tunggu konfirmasi dari vendor.</p>
          </>
        )}
        {status === 'pending' && (
          <>
            <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mx-auto flex items-center justify-center">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <h1 className="text-xl font-bold">Menunggu Pembayaran</h1>
            <p className="text-sm text-zinc-500">Pembayaran sedang diproses. Silakan tunggu.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold">Pembayaran Gagal</h1>
            <p className="text-sm text-zinc-500">Terjadi kesalahan. Silakan coba lagi.</p>
          </>
        )}
        <div className="flex gap-2 justify-center pt-4">
          <Link href="/"><Button variant="outline">Kembali</Button></Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PaymentCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <Suspense fallback={<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />}>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
