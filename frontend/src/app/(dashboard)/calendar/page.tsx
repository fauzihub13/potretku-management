'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { statusColors, statusLabels, formatCurrency } from '@/lib/utils-helpers';
import { ChevronLeft, ChevronRight, Clock, MapPin, Plus, Eye, Edit } from 'lucide-react';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function CalendarPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [detailBooking, setDetailBooking] = useState<any>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    setLoading(true);
    api.get(`/bookings/calendar?year=${year}&month=${month + 1}`)
      .then(res => setBookings(res.data))
      .finally(() => setLoading(false));
  }, [year, month]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1));
  const today = () => { setCurrentDate(new Date()); setSelectedDate(new Date()); };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const cells: { day: number; currentMonth: boolean; date: Date }[] = [];

    // Previous month fill
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      cells.push({ day: daysInPrevMonth - i, currentMonth: false, date: d });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, currentMonth: true, date: new Date(year, month, d) });
    }
    // Next month fill
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, currentMonth: false, date: new Date(year, month + 1, d) });
    }
    return cells;
  }, [year, month]);

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(b => {
      const bDate = new Date(b.sessionDate);
      return bDate.getFullYear() === date.getFullYear()
        && bDate.getMonth() === date.getMonth()
        && bDate.getDate() === date.getDate();
    });
  };

  const isToday = (date: Date) => {
    const t = new Date();
    return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return date.getDate() === selectedDate.getDate() && date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear();
  };

  const selectedBookings = selectedDate ? getBookingsForDate(selectedDate) : [];

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <h2 className="text-lg font-semibold min-w-[180px] text-center">{MONTHS[month]} {year}</h2>
          <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={today}>Hari Ini</Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <span className="w-3 h-3 rounded bg-purple-500" /> Dijadwalkan
            <span className="w-3 h-3 rounded bg-blue-500 ml-2" /> Dikonfirmasi
            <span className="w-3 h-3 rounded bg-green-500 ml-2" /> Selesai
            <span className="w-3 h-3 rounded bg-yellow-500 ml-2" /> Menunggu
          </div>
          <Button onClick={() => router.push('/bookings/create')} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-1" /> Tambah
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Calendar Grid */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-3">
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-zinc-500 py-2">{d}</div>
                ))}
              </div>
              {/* Calendar cells */}
              <div className="grid grid-cols-7 gap-px bg-zinc-200 dark:bg-zinc-700 rounded-lg overflow-hidden">
                {calendarDays.map((cell, i) => {
                  const dayBookings = getBookingsForDate(cell.date);
                  const hasBookings = dayBookings.length > 0;
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedDate(cell.date)}
                      className={`min-h-[90px] p-1.5 cursor-pointer transition-colors ${
                        cell.currentMonth
                          ? 'bg-white dark:bg-zinc-900 hover:bg-purple-50 dark:hover:bg-zinc-800'
                          : 'bg-zinc-50 dark:bg-zinc-950'
                      } ${isSelected(cell.date) ? 'ring-2 ring-purple-500 ring-inset' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${
                          !cell.currentMonth ? 'text-zinc-300 dark:text-zinc-600' :
                          isToday(cell.date) ? 'bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center' :
                          'text-zinc-700 dark:text-zinc-300'
                        }`}>
                          {cell.day}
                        </span>
                        {hasBookings && (
                          <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full px-1.5 font-medium">
                            {dayBookings.length}
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {dayBookings.slice(0, 3).map(b => {
                          const statusColor: Record<string, string> = {
                            pending: 'bg-yellow-400', confirmed: 'bg-blue-400', scheduled: 'bg-purple-400',
                            in_progress: 'bg-indigo-400', completed: 'bg-green-400', cancelled: 'bg-red-400'
                          };
                          return (
                            <div
                              key={b.id}
                              onClick={(e) => { e.stopPropagation(); setDetailBooking(b); }}
                              className={`text-[10px] text-white px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${statusColor[b.status] || 'bg-zinc-400'}`}
                              title={`${b.clientName} - ${b.packageName}`}
                            >
                              {b.sessionTime && <span className="font-mono">{b.sessionTime} </span>}
                              {b.clientName}
                            </div>
                          );
                        })}
                        {dayBookings.length > 3 && (
                          <div className="text-[10px] text-zinc-500 text-center">+{dayBookings.length - 3} lagi</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Selected Date Detail */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {selectedDate
                  ? selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Pilih tanggal'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                selectedBookings.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-6">Tidak ada jadwal</p>
                ) : (
                  <div className="space-y-2">
                    {selectedBookings.map(b => (
                      <div
                        key={b.id}
                        onClick={() => setDetailBooking(b)}
                        className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[10px] text-zinc-500">{b.sessionTime || '-'}</span>
                          <Badge className={`${statusColors[b.status]} text-[10px]`} variant="outline">{statusLabels[b.status]}</Badge>
                        </div>
                        <p className="text-sm font-medium">{b.clientName}</p>
                        <p className="text-xs text-zinc-500">{b.eventType} · {b.packageName}</p>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-sm text-zinc-500 text-center py-6">Klik tanggal di kalender</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Booking Detail Dialog */}
      <Dialog open={!!detailBooking} onOpenChange={() => setDetailBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Jadwal</DialogTitle>
          </DialogHeader>
          {detailBooking && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-zinc-500">{detailBooking.bookingCode}</span>
                <Badge className={statusColors[detailBooking.status]}>{statusLabels[detailBooking.status]}</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-zinc-500">Klien</span><span className="font-medium">{detailBooking.clientName}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Acara</span><span>{detailBooking.eventType}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Paket</span><span>{detailBooking.packageName}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Tanggal</span><span>{new Date(detailBooking.sessionDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                {detailBooking.sessionTime && (
                  <div className="flex justify-between"><span className="text-zinc-500">Jam</span><span className="font-mono">{detailBooking.sessionTime} WIB</span></div>
                )}
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { setDetailBooking(null); router.push(`/bookings/${detailBooking.id}`); }}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> Lihat Detail
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { setDetailBooking(null); router.push(`/bookings/${detailBooking.id}/edit`); }}>
                  <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
