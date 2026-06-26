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

    var formatRp = function(n) { return 'Rp ' + Number(n).toLocaleString('id-ID'); };
    var formatDate = function(d) { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); };

    var doc = new PDFDocument({ size: 'A4', margin: 0 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=faktur-' + booking.bookingCode + '.pdf');
    doc.pipe(res);

    // Constants
    var W = 595.28;
    var H = 841.89;
    var M = 50;
    var contentW = W - (M * 2); // 495.28
    var purple = '#7c3aed';
    var darkPurple = '#5b21b6';
    var gray = '#6b7280';
    var lightGray = '#f9fafb';
    var border = '#e5e7eb';
    var black = '#111827';

    // === HEADER BAND (full width) ===
    doc.rect(0, 0, W, 90).fill(purple);
    doc.rect(0, 88, W, 4).fill(darkPurple);

    doc.fontSize(20).font('Helvetica-Bold').fillColor('#ffffff')
      .text(user.studioName || 'Studio', M, 22, { width: 300 });
    doc.fontSize(8).font('Helvetica').fillColor('rgba(255,255,255,0.8)');
    var infoLine = (user.studioAddress || '') + (user.studioPhone ? '  |  ' + user.studioPhone : '') + '  |  ' + user.email;
    doc.text(infoLine, M, 48, { width: 380 });

    // FAKTUR title
    doc.fontSize(26).font('Helvetica-Bold').fillColor('#ffffff')
      .text('FAKTUR', M, 18, { width: contentW, align: 'right' });

    // === INVOICE INFO ROW ===
    var iy = 108;
    doc.roundedRect(M, iy, contentW, 48, 4).fill(lightGray);

    var col1 = M + 10;
    var col2 = M + 120;
    var col3 = M + 270;
    var col4 = M + 380;

    doc.fontSize(7).font('Helvetica').fillColor(gray);
    doc.text('NO. FAKTUR', col1, iy + 8, { width: 90 });
    doc.text('TANGGA', col2, iy + 8, { width: 100 });
    doc.text('STATUS', col3, iy + 8, { width: 90 });
    doc.text('JATUH TEMPO', col4, iy + 8, { width: 90 });

    doc.fontSize(10).font('Helvetica-Bold').fillColor(black);
    doc.text(booking.bookingCode, col1, iy + 22, { width: 100 });
    doc.text(formatDate(booking.createdAt), col2, iy + 22, { width: 140 });

    // Status badge - centered text
    var stColor = statusColor[booking.status] || gray;
    var stLabel = statusMap[booking.status] || booking.status;
    var badgeW = 90;
    var badgeH = 16;
    var badgeX = col3;
    var badgeY = iy + 20;
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 3).fill(stColor);
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff');
    var stTextW = doc.widthOfString(stLabel);
    doc.text(stLabel, badgeX + (badgeW - stTextW) / 2, badgeY + 4, { width: badgeW, align: 'center' });

    // Deadline
    var deadline = booking.deadline ? formatDate(booking.deadline) : '-';
    doc.fontSize(10).font('Helvetica-Bold').fillColor(black)
      .text(deadline, col4, iy + 22, { width: 100 });

    // === CLIENT & SESSION (2 columns) ===
    var sy = 172;
    var halfW = (contentW - 10) / 2; // 242.64

    // Client box
    doc.roundedRect(M, sy, halfW, 72, 4).lineWidth(0.5).stroke(border);
    doc.fontSize(7).font('Helvetica-Bold').fillColor(purple)
      .text('DITUJUKAN KE', M + 10, sy + 8);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(black)
      .text(booking.clientName, M + 10, sy + 22, { width: halfW - 20 });
    doc.fontSize(8).font('Helvetica').fillColor(gray);
    var cy = sy + 38;
    if (booking.clientEmail) { doc.text(booking.clientEmail, M + 10, cy, { width: halfW - 20 }); cy += 12; }
    if (booking.clientPhone) { doc.text(booking.clientPhone, M + 10, cy, { width: halfW - 20 }); }

    // Session box
    var sx2 = M + halfW + 10;
    doc.roundedRect(sx2, sy, halfW, 72, 4).lineWidth(0.5).stroke(border);
    doc.fontSize(7).font('Helvetica-Bold').fillColor(purple)
      .text('DETAIL SESI', sx2 + 10, sy + 8);
    doc.fontSize(8).font('Helvetica').fillColor(black);
    var ssy = sy + 22;
    doc.text('Acara    : ' + booking.eventType, sx2 + 10, ssy, { width: halfW - 20 }); ssy += 13;
    doc.text('Tanggal  : ' + formatDate(booking.sessionDate), sx2 + 10, ssy, { width: halfW - 20 }); ssy += 13;
    if (booking.sessionTime) { doc.text('Jam      : ' + booking.sessionTime + ' WIB', sx2 + 10, ssy, { width: halfW - 20 }); ssy += 13; }
    if (booking.location) { doc.text('Lokasi   : ' + booking.location, sx2 + 10, ssy, { width: halfW - 20 }); }

    // === TABLE ===
    var ty = 262;

    // Column positions (total width = contentW = 495.28)
    // Col1: Deskripsi (0 - 250) width=250
    // Col2: Qty (250 - 290) width=40
    // Col3: Harga (290 - 390) width=100
    // Col4: Subtotal (390 - 495) width=105
    var tDesc = M;
    var tQty = M + 250;
    var tHrg = M + 290;
    var tSub = M + 390;
    var cDesc = 240;
    var cQty = 35;
    var cHrg = 95;
    var cSub = 100;

    // Header row
    doc.roundedRect(M, ty, contentW, 22, 3).fill(purple);
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('DESKRIPSI', tDesc + 8, ty + 7, { width: cDesc });
    doc.text('QTY', tQty + 2, ty + 7, { width: cQty, align: 'center' });
    doc.text('HARGA', tHrg, ty + 7, { width: cHrg, align: 'right' });
    doc.text('SUBTOTAL', tSub + 5, ty + 7, { width: cSub, align: 'right' });

    var rowY = ty + 26;
    var rowH = 24;
    var rowCount = 0;

    // Package row
    if (rowCount % 2 === 0) { doc.rect(M, rowY, contentW, rowH).fill(lightGray); }
    doc.fontSize(9).font('Helvetica-Bold').fillColor(black);
    doc.text(booking.packageName, tDesc + 8, rowY + 6, { width: cDesc });
    doc.font('Helvetica').fillColor(gray);
    doc.text('1', tQty + 2, rowY + 6, { width: cQty, align: 'center' });
    doc.text(formatRp(booking.packagePrice || booking.totalAmount), tHrg, rowY + 6, { width: cHrg, align: 'right' });
    doc.font('Helvetica-Bold').fillColor(black);
    doc.text(formatRp(booking.totalAmount), tSub + 5, rowY + 6, { width: cSub, align: 'right' });
    rowY += rowH;
    rowCount++;

    // Addon rows
    var addons = JSON.parse(booking.addons || '[]');
    addons.forEach(function(addon) {
      if (rowCount % 2 === 0) { doc.rect(M, rowY, contentW, rowH).fill(lightGray); }
      doc.fontSize(8).font('Helvetica').fillColor(black);
      doc.text(addon.name || 'Tambahan', tDesc + 8, rowY + 6, { width: cDesc });
      doc.fillColor(gray).text('1', tQty + 2, rowY + 6, { width: cQty, align: 'center' });
      doc.text(formatRp(addon.price || 0), tHrg, rowY + 6, { width: cHrg, align: 'right' });
      doc.font('Helvetica-Bold').fillColor(black);
      doc.text(formatRp(addon.price || 0), tSub + 5, rowY + 6, { width: cSub, align: 'right' });
      rowY += rowH;
      rowCount++;
    });

    // Bottom border of table
    doc.moveTo(M, rowY).lineTo(M + contentW, rowY).lineWidth(0.5).stroke(border);
    rowY += 12;

    // === TOTALS (right-aligned block) ===
    var totX = M + 270;
    var totW = contentW - 270; // ~225
    var totLabelW = 110;
    var totValX = totX + totLabelW;
    var totValW = totW - totLabelW - 10;

    // Subtotal
    doc.fontSize(9).font('Helvetica').fillColor(gray)
      .text('Subtotal', totX, rowY, { width: totLabelW });
    doc.fillColor(black)
      .text(formatRp(booking.totalAmount), totValX, rowY, { width: totValW, align: 'right' });
    rowY += 16;

    // DP
    doc.fillColor(gray)
      .text('DP', totX, rowY, { width: totLabelW });
    doc.fillColor(booking.dpPaid ? '#22c55e' : '#ef4444')
      .text((booking.dpPaid ? '- ' : '') + formatRp(booking.dpAmount), totValX, rowY, { width: totValW, align: 'right' });
    rowY += 6;

    // Separator line
    doc.moveTo(totX, rowY).lineTo(M + contentW, rowY).lineWidth(1).stroke(purple);
    rowY += 10;

    // Sisa Bayar
    var remaining = booking.totalAmount - (booking.dpPaid ? booking.dpAmount : 0);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(purple)
      .text('SISA BAYAR', totX, rowY, { width: totLabelW });
    doc.text(formatRp(remaining), totValX, rowY, { width: totValW, align: 'right' });

    // === PAYMENT STATUS BOX ===
    rowY += 35;
    doc.roundedRect(M, rowY, contentW, 35, 4).fill(lightGray);
    doc.fontSize(7).font('Helvetica-Bold').fillColor(gray)
      .text('STATUS PEMBAYARAN', M + 10, rowY + 8);

    // DP dot + text
    doc.circle(M + 10, rowY + 24, 3.5).fill(booking.dpPaid ? '#22c55e' : '#f59e0b');
    doc.fontSize(8).font('Helvetica').fillColor(black)
      .text('DP: ' + (booking.dpPaid ? 'Lunas' : 'Belum'), M + 18, rowY + 19);

    // Final dot + text
    doc.circle(M + 120, rowY + 24, 3.5).fill(booking.finalPaid ? '#22c55e' : '#f59e0b');
    doc.text('Pelunasan: ' + (booking.finalPaid ? 'Lunas' : 'Belum'), M + 128, rowY + 19);

    // === FOOTER ===
    var footerY = rowY + 55;
    doc.moveTo(M, footerY).lineTo(M + contentW, footerY).lineWidth(0.3).stroke(border);
    footerY += 12;
    doc.fontSize(8).font('Helvetica').fillColor(gray)
      .text('Terima kasih atas kepercayaan Anda.', M, footerY, { width: contentW, align: 'center' });
    footerY += 12;
    doc.fontSize(7).fillColor('#9ca3af')
      .text((user.studioName || '') + '  |  ' + user.email + '  |  Dicetak: ' + formatDate(new Date()), M, footerY, { width: contentW, align: 'center' });

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
