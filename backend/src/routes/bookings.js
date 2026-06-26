const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../config/db');
const auth = require('../middleware/auth');

const bookingSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientPhone: z.string().optional(),
  eventType: z.string().min(1),
  sessionDate: z.string(),
  sessionTime: z.string().optional().refine((val) => {
    if (!val) return true;
    const match = val.match(/^(\d{2}):(\d{2})$/);
    if (!match) return false;
    const minutes = parseInt(match[2]);
    return minutes === 0 || minutes === 30;
  }, { message: 'Time must be in 30-minute intervals (e.g. 09:00, 09:30, 10:00)' }),
  location: z.string().optional(),
  packageName: z.string().min(1),
  packagePrice: z.number().min(0),
  addons: z.string().optional(),
  totalAmount: z.number().min(0),
  dpAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
  freelancerId: z.string().optional(),
  deadline: z.string().optional(),
  driveAllPhotos: z.string().optional(),
  driveRawPhotos: z.string().optional(),
  driveEditedPhotos: z.string().optional(),
  customFields: z.string().optional()
});

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'BK-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

router.get('/', auth, async (req, res) => {
  try {
    const { search, status, eventType, freelancerId, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = req.query;
    const where = { userId: req.userId };
    if (search) where.OR = [
      { clientName: { contains: search } },
      { bookingCode: { contains: search } }
    ];
    if (status) where.status = status;
    if (eventType) where.eventType = eventType;
    if (freelancerId) where.freelancerId = freelancerId;
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: { freelancer: true },
        orderBy: { [sortBy]: sortOrder },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.booking.count({ where })
    ]);
    res.json({ bookings, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [totalBookings, monthBookings, pendingBookings, totalRevenue, monthRevenue] = await Promise.all([
      prisma.booking.count({ where: { userId: req.userId } }),
      prisma.booking.count({ where: { userId: req.userId, createdAt: { gte: startOfMonth } } }),
      prisma.booking.count({ where: { userId: req.userId, status: 'pending' } }),
      prisma.booking.aggregate({ where: { userId: req.userId, finalPaid: true }, _sum: { totalAmount: true } }),
      prisma.booking.aggregate({ where: { userId: req.userId, finalPaid: true, createdAt: { gte: startOfMonth } }, _sum: { totalAmount: true } })
    ]);
    res.json({
      totalBookings,
      monthBookings,
      pendingBookings,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      monthRevenue: monthRevenue._sum.totalAmount || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export', auth, async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const { status, startDate, endDate } = req.query;
    const where = { userId: req.userId };
    if (status) where.status = status;
    if (startDate || endDate) {
      where.sessionDate = {};
      if (startDate) where.sessionDate.gte = new Date(startDate);
      if (endDate) where.sessionDate.lte = new Date(endDate);
    }
    const bookings = await prisma.booking.findMany({
      where,
      include: { freelancer: true },
      orderBy: { sessionDate: 'desc' }
    });

    const statusMap = {
      pending: 'Menunggu', confirmed: 'Dikonfirmasi', scheduled: 'Terjadwal',
      in_progress: 'Sedang Berlangsung', completed: 'Selesai', cancelled: 'Dibatalkan'
    };

    const rows = bookings.map(b => ({
      'Kode': b.bookingCode,
      'Nama Klien': b.clientName,
      'Email': b.clientEmail || '',
      'Telepon': b.clientPhone || '',
      'Jenis Acara': b.eventType,
      'Tanggal Sesi': new Date(b.sessionDate).toLocaleDateString('id-ID'),
      'Jam Mulai': b.sessionTime || '',
      'Paket': b.packageName,
      'Total': b.totalAmount,
      'DP': b.dpAmount,
      'DP Terbayar': b.dpPaid ? 'Lunas' : 'Belum',
      'Pelunasan': b.finalPaid ? 'Lunas' : 'Belum',
      'Status': statusMap[b.status] || b.status,
      'Freelancer': b.freelancer?.name || '',
      'Lokasi': b.location || '',
      'Catatan': b.notes || '',
      'Link All Foto': b.driveAllPhotos || '',
      'Link RAW': b.driveRawPhotos || '',
      'Link Edited': b.driveEditedPhotos || '',
      'Dibuat': new Date(b.createdAt).toLocaleDateString('id-ID')
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 16 },
      { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 20 },
      { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 25 },
      { wch: 35 }, { wch: 35 }, { wch: 35 }, { wch: 14 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Pemesanan');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=pemesanan.xlsx');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/invoice', auth, async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { freelancer: true }
    });
    if (!booking) return res.status(404).json({ error: 'Pemesanan tidak ditemukan' });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    const statusMap = {
      pending: 'Menunggu', confirmed: 'Dikonfirmasi', scheduled: 'Terjadwal',
      in_progress: 'Sedang Berlangsung', completed: 'Selesai', cancelled: 'Dibatalkan'
    };
    const statusColor = {
      pending: '#f59e0b', confirmed: '#3b82f6', scheduled: '#8b5cf6',
      in_progress: '#6366f1', completed: '#22c55e', cancelled: '#ef4444'
    };

    const formatRp = function(n) { return 'Rp ' + Number(n).toLocaleString('id-ID'); };
    const formatDate = function(d) { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); };

    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=faktur-' + booking.bookingCode + '.pdf');
    doc.pipe(res);

    var purple = '#7c3aed';
    var darkPurple = '#5b21b6';
    var gray = '#6b7280';
    var lightGray = '#f9fafb';
    var border = '#e5e7eb';
    var black = '#111827';
    var W = 595.28;
    var LM = 50;
    var RM = W - 50;

    // === HEADER BAND ===
    doc.rect(0, 0, W, 100).fill(purple);
    doc.rect(0, 98, W, 4).fill(darkPurple);

    doc.fontSize(22).font('Helvetica-Bold').fillColor('#ffffff')
      .text(user.studioName || 'Studio', LM, 25, { width: 300 });
    doc.fontSize(9).font('Helvetica').fillColor('rgba(255,255,255,0.8)');
    var studioInfo = '';
    if (user.studioAddress) studioInfo += user.studioAddress;
    if (user.studioPhone) studioInfo += (studioInfo ? '  |  ' : '') + user.studioPhone;
    studioInfo += (studioInfo ? '  |  ' : '') + user.email;
    doc.text(studioInfo, LM, 52, { width: 400 });

    doc.fontSize(28).font('Helvetica-Bold').fillColor('#ffffff')
      .text('FAKTUR', RM - 150, 22, { width: 150, align: 'right' });

    // === INVOICE INFO BOX ===
    var infoY = 120;
    doc.roundedRect(LM, infoY, RM - LM, 55, 6).fill(lightGray);

    doc.fontSize(8).font('Helvetica').fillColor(gray);
    doc.text('NO. FAKTUR', LM + 12, infoY + 10, { width: 100 });
    doc.text('TANGGA', LM + 140, infoY + 10, { width: 100 });
    doc.text('STATUS', LM + 290, infoY + 10, { width: 100 });
    doc.text('JATUH TEMPO', LM + 400, infoY + 10, { width: 100 });

    doc.fontSize(10).font('Helvetica-Bold').fillColor(black);
    doc.text(booking.bookingCode, LM + 12, infoY + 25, { width: 120 });
    doc.text(formatDate(booking.createdAt), LM + 140, infoY + 25, { width: 130 });

    // Status badge
    var stColor = statusColor[booking.status] || gray;
    var stLabel = statusMap[booking.status] || booking.status;
    doc.roundedRect(LM + 290, infoY + 22, 85, 18, 4).fill(stColor);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff')
      .text(stLabel, LM + 290, infoY + 26, { width: 85, align: 'center' });

    // Deadline
    var deadline = booking.deadline ? formatDate(booking.deadline) : '-';
    doc.fontSize(10).font('Helvetica-Bold').fillColor(black)
      .text(deadline, LM + 400, infoY + 25, { width: 130 });

    // === CLIENT & SESSION - SIDE BY SIDE ===
    var sectionY = 195;

    // Client box
    doc.roundedRect(LM, sectionY, 235, 85, 6).lineWidth(0.5).stroke(border);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(purple)
      .text('DITUJUKAN KE', LM + 12, sectionY + 10);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(black)
      .text(booking.clientName, LM + 12, sectionY + 24, { width: 210 });
    doc.fontSize(9).font('Helvetica').fillColor(gray);
    var cy = sectionY + 40;
    if (booking.clientEmail) { doc.text(booking.clientEmail, LM + 12, cy, { width: 210 }); cy += 13; }
    if (booking.clientPhone) { doc.text(booking.clientPhone, LM + 12, cy, { width: 210 }); cy += 13; }

    // Session box
    doc.roundedRect(LM + 250, sectionY, 295, 85, 6).lineWidth(0.5).stroke(border);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(purple)
      .text('DETAIL SESI', LM + 262, sectionY + 10);
    doc.fontSize(9).font('Helvetica').fillColor(black);
    var sy = sectionY + 25;
    doc.text('Acara    : ' + booking.eventType, LM + 262, sy, { width: 270 }); sy += 14;
    doc.text('Tanggal  : ' + formatDate(booking.sessionDate), LM + 262, sy, { width: 270 }); sy += 14;
    if (booking.sessionTime) { doc.text('Jam      : ' + booking.sessionTime + ' WIB', LM + 262, sy, { width: 270 }); sy += 14; }
    if (booking.location) { doc.text('Lokasi   : ' + booking.location, LM + 262, sy, { width: 270 }); }

    // === TABLE ===
    var tableY = 300;

    // Table header
    doc.roundedRect(LM, tableY, RM - LM, 25, 4).fill(purple);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('DESKRIPSI', LM + 12, tableY + 8, { width: 280 });
    doc.text('QTY', LM + 300, tableY + 8, { width: 40, align: 'center' });
    doc.text('HARGA', LM + 350, tableY + 8, { width: 100, align: 'right' });
    doc.text('SUBTOTAL', RM - 120, tableY + 8, { width: 108, align: 'right' });

    var rowY = tableY + 30;
    var rowNum = 0;

    // Package row
    if (rowNum % 2 === 0) doc.rect(LM, rowY, RM - LM, 28).fill(lightGray);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(black);
    doc.text(booking.packageName, LM + 12, rowY + 8, { width: 280 });
    doc.font('Helvetica').fillColor(gray);
    doc.text('1', LM + 300, rowY + 8, { width: 40, align: 'center' });
    doc.text(formatRp(booking.packagePrice || booking.totalAmount), LM + 350, rowY + 8, { width: 100, align: 'right' });
    doc.font('Helvetica-Bold').fillColor(black);
    doc.text(formatRp(booking.totalAmount), RM - 120, rowY + 8, { width: 108, align: 'right' });
    rowY += 28;
    rowNum++;

    // Additional costs from addons
    var addons = JSON.parse(booking.addons || '[]');
    addons.forEach(function(addon) {
      if (rowNum % 2 === 0) doc.rect(LM, rowY, RM - LM, 25).fill(lightGray);
      doc.fontSize(9).font('Helvetica').fillColor(black);
      doc.text(addon.name || 'Tambahan', LM + 12, rowY + 6, { width: 280 });
      doc.fillColor(gray).text('1', LM + 300, rowY + 6, { width: 40, align: 'center' });
      doc.text(formatRp(addon.price || 0), LM + 350, rowY + 6, { width: 100, align: 'right' });
      doc.font('Helvetica-Bold').fillColor(black);
      doc.text(formatRp(addon.price || 0), RM - 120, rowY + 6, { width: 108, align: 'right' });
      rowY += 25;
      rowNum++;
    });

    // Separator
    rowY += 5;
    doc.moveTo(LM, rowY).lineTo(RM, rowY).lineWidth(0.5).stroke(border);
    rowY += 10;

    // === TOTALS ===
    var totalX = RM - 230;
    var totLabelW = 120;
    var totValW = 108;

    doc.fontSize(9).font('Helvetica').fillColor(gray);
    doc.text('Subtotal', totalX, rowY, { width: totLabelW });
    doc.text(formatRp(booking.totalAmount), RM - 12, rowY, { width: totValW, align: 'right' });
    rowY += 18;

    doc.text('DP (' + formatRp(booking.dpAmount) + ')', totalX, rowY, { width: totLabelW });
    doc.fillColor(booking.dpPaid ? '#22c55e' : '#ef4444');
    doc.text(booking.dpPaid ? '- ' + formatRp(booking.dpAmount) : 'Belum', RM - 12, rowY, { width: totValW, align: 'right' });
    rowY += 18;

    doc.moveTo(totalX, rowY).lineTo(RM, rowY).lineWidth(1).stroke(purple);
    rowY += 8;

    var remaining = booking.totalAmount - (booking.dpPaid ? booking.dpAmount : 0);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(purple);
    doc.text('SISA BAYAR', totalX, rowY, { width: totLabelW });
    doc.text(formatRp(remaining), RM - 12, rowY, { width: totValW, align: 'right' });

    // === PAYMENT STATUS BOX ===
    rowY += 40;
    doc.roundedRect(LM, rowY, RM - LM, 40, 6).fill(lightGray);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(gray).text('STATUS PEMBAYARAN', LM + 12, rowY + 8);

    // DP status dot
    doc.circle(LM + 12, rowY + 27, 4).fill(booking.dpPaid ? '#22c55e' : '#f59e0b');
    doc.fontSize(9).font('Helvetica').fillColor(black)
      .text('DP: ' + (booking.dpPaid ? 'Lunas' : 'Belum'), LM + 22, rowY + 22);

    // Final status dot
    doc.circle(LM + 150, rowY + 27, 4).fill(booking.finalPaid ? '#22c55e' : '#f59e0b');
    doc.text('Pelunasan: ' + (booking.finalPaid ? 'Lunas' : 'Belum'), LM + 160, rowY + 22);

    // === FOOTER ===
    var footerY = rowY + 65;
    doc.moveTo(LM, footerY).lineTo(RM, footerY).lineWidth(0.5).stroke(border);
    footerY += 15;
    doc.fontSize(8).font('Helvetica').fillColor(gray)
      .text('Terima kasih atas kepercayaan Anda.', LM, footerY, { width: RM - LM, align: 'center' });
    footerY += 13;
    doc.fontSize(7).fillColor('#9ca3af')
      .text((user.studioName || '') + '  |  ' + user.email + '  |  Dicetak: ' + formatDate(new Date()), LM, footerY, { width: RM - LM, align: 'center' });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/calendar', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const start = new Date(year || new Date().getFullYear(), (month || new Date().getMonth()) - 1, 1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    const bookings = await prisma.booking.findMany({
      where: { userId: req.userId, sessionDate: { gte: start, lt: end } },
      select: { id: true, bookingCode: true, clientName: true, sessionDate: true, sessionTime: true, eventType: true, status: true, packageName: true }
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { freelancer: true, paymentProofs: true, settlements: true }
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const data = bookingSchema.parse(req.body);
    const booking = await prisma.booking.create({
      data: {
        userId: req.userId,
        bookingCode: generateCode(),
        clientName: data.clientName,
        clientEmail: data.clientEmail || null,
        clientPhone: data.clientPhone || null,
        eventType: data.eventType,
        sessionDate: new Date(data.sessionDate),
        sessionTime: data.sessionTime || null,
        location: data.location || null,
        packageName: data.packageName,
        packagePrice: data.packagePrice,
        addons: data.addons || '[]',
        totalAmount: data.totalAmount,
        dpAmount: data.dpAmount || 0,
        notes: data.notes || null,
        freelancerId: data.freelancerId || null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        customFields: data.customFields || '{}'
      },
      include: { freelancer: true }
    });
    res.json(booking);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const booking = await prisma.booking.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const data = bookingSchema.partial().parse(req.body);
    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: {
        ...data,
        sessionDate: data.sessionDate ? new Date(data.sessionDate) : undefined,
        deadline: data.deadline ? new Date(data.deadline) : undefined
      },
      include: { freelancer: true }
    });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending', 'confirmed', 'scheduled', 'in_progress', 'completed', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status },
      include: { freelancer: true }
    });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/dp', auth, async (req, res) => {
  try {
    const { dpPaid } = req.body;
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { dpPaid, dpPaidAt: dpPaid ? new Date() : null },
      include: { freelancer: true }
    });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/final-payment', auth, async (req, res) => {
  try {
    const { finalPaid } = req.body;
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { finalPaid, finalPaidAt: finalPaid ? new Date() : null },
      include: { freelancer: true }
    });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.booking.deleteMany({ where: { id: req.params.id, userId: req.userId } });
    res.json({ message: 'Booking deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
