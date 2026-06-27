const router = require("express").Router();
const { z } = require("zod");
const prisma = require("../config/db");
const auth = require("../middleware/auth");

const bookingSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  eventType: z.string().min(1),
  sessionDate: z.string(),
  sessionTime: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const match = val.match(/^(\d{2}):(\d{2})$/);
        if (!match) return false;
        const minutes = parseInt(match[2]);
        return minutes === 0 || minutes === 30;
      },
      {
        message:
          "Time must be in 30-minute intervals (e.g. 09:00, 09:30, 10:00)",
      },
    ),
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
  customFields: z.string().optional(),
});

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "BK-";
  for (let i = 0; i < 6; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

router.get("/", auth, async (req, res) => {
  try {
    const {
      search,
      status,
      eventType,
      freelancerId,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = req.query;
    const where = { userId: req.userId };
    if (search)
      where.OR = [
        { clientName: { contains: search } },
        { bookingCode: { contains: search } },
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
        take: Number(limit),
      }),
      prisma.booking.count({ where }),
    ]);
    res.json({
      bookings,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stats", auth, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [
      totalBookings,
      monthBookings,
      pendingBookings,
      totalRevenue,
      monthRevenue,
    ] = await Promise.all([
      prisma.booking.count({ where: { userId: req.userId } }),
      prisma.booking.count({
        where: { userId: req.userId, createdAt: { gte: startOfMonth } },
      }),
      prisma.booking.count({
        where: { userId: req.userId, status: "pending" },
      }),
      prisma.booking.aggregate({
        where: { userId: req.userId, finalPaid: true },
        _sum: { totalAmount: true },
      }),
      prisma.booking.aggregate({
        where: {
          userId: req.userId,
          finalPaid: true,
          createdAt: { gte: startOfMonth },
        },
        _sum: { totalAmount: true },
      }),
    ]);
    res.json({
      totalBookings,
      monthBookings,
      pendingBookings,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      monthRevenue: monthRevenue._sum.totalAmount || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/export", auth, async (req, res) => {
  try {
    const XLSX = require("xlsx");
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
      orderBy: { sessionDate: "desc" },
    });

    const statusMap = {
      pending: "Menunggu",
      confirmed: "Dikonfirmasi",
      scheduled: "Terjadwal",
      in_progress: "Sedang Berlangsung",
      completed: "Selesai",
      cancelled: "Dibatalkan",
    };

    const rows = bookings.map((b) => ({
      Kode: b.bookingCode,
      "Nama Klien": b.clientName,
      Email: b.clientEmail || "",
      Telepon: b.clientPhone || "",
      "Jenis Acara": b.eventType,
      "Tanggal Sesi": new Date(b.sessionDate).toLocaleDateString("id-ID"),
      "Jam Mulai": b.sessionTime || "",
      Paket: b.packageName,
      Total: b.totalAmount,
      DP: b.dpAmount,
      "DP Terbayar": b.dpPaid ? "Lunas" : "Belum",
      Pelunasan: b.finalPaid ? "Lunas" : "Belum",
      Status: statusMap[b.status] || b.status,
      Freelancer: b.freelancer?.name || "",
      Lokasi: b.location || "",
      Catatan: b.notes || "",
      "Link All Foto": b.driveAllPhotos || "",
      "Link RAW": b.driveRawPhotos || "",
      "Link Edited": b.driveEditedPhotos || "",
      Dibuat: new Date(b.createdAt).toLocaleDateString("id-ID"),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws["!cols"] = [
      { wch: 12 },
      { wch: 22 },
      { wch: 22 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 18 },
      { wch: 20 },
      { wch: 25 },
      { wch: 35 },
      { wch: 35 },
      { wch: 35 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Pemesanan");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", "attachment; filename=pemesanan.xlsx");
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/invoice", auth, async (req, res) => {
  try {
    const PDFDocument = require("pdfkit");
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { freelancer: true },
    });
    if (!booking)
      return res.status(404).json({ error: "Pemesanan tidak ditemukan" });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    const statusMap = {
      pending: "Menunggu",
      confirmed: "Dikonfirmasi",
      scheduled: "Terjadwal",
      in_progress: "Sedang Berlangsung",
      completed: "Selesai",
      cancelled: "Dibatalkan",
    };
    const statusColor = {
      pending: "#f59e0b",
      confirmed: "#3b82f6",
      scheduled: "#8b5cf6",
      in_progress: "#6366f1",
      completed: "#22c55e",
      cancelled: "#ef4444",
    };

    const formatRp = (n) => "Rp " + Number(n).toLocaleString("id-ID");
    const formatDate = (d) =>
      new Date(d).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=faktur-${booking.bookingCode}.pdf`,
    );
    doc.pipe(res);

    const M = 40;
    const contentW = 515.28;
    const purple = "#7c3aed";
    const darkPurple = "#5b21b6";
    const gray = "#6b7280";
    const lightGray = "#f9fafb";
    const border = "#e5e7eb";
    const black = "#111827";

    // === 1. HEADER BAND ===
    doc.rect(0, 0, 595.28, 90).fill(purple);
    doc.rect(0, 86, 595.28, 4).fill(darkPurple);

    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .fillColor("#ffffff")
      .text("FAKTUR", M, 25, { width: contentW, align: "right" });

    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .fillColor("#ffffff")
      .text(user.studioName || "Studio Photo", M, 22, { width: 300 });

    doc.fontSize(8).font("Helvetica").fillColor("rgba(255,255,255,0.8)");
    const infoLine = `${user.studioAddress || ""} ${user.studioPhone ? "  |  " + user.studioPhone : ""}  |  ${user.email}`;
    doc.text(infoLine, M, 48, { width: 350 });

    // === 2. INVOICE METADATA ROW ===
    let currentY = 105;
    doc.roundedRect(M, currentY, contentW, 45, 4).fill(lightGray);

    const col1 = M + 15;
    const col2 = M + 140;
    const col3 = M + 280;
    const col4 = M + 400;

    doc.fontSize(7).font("Helvetica").fillColor(gray);
    doc.text("NO. FAKTUR", col1, currentY + 8, { width: 100 });
    doc.text("TANGGAL", col2, currentY + 8, { width: 120 });
    doc.text("STATUS", col3, currentY + 8, { width: 90 });
    doc.text("JATUH TEMPO", col4, currentY + 8, { width: 100 });

    doc.fontSize(10).font("Helvetica-Bold").fillColor(black);
    doc.text(booking.bookingCode, col1, currentY + 20, { width: 110 });
    doc.text(formatDate(booking.createdAt), col2, currentY + 20, {
      width: 120,
    });

    // Status Badge
    const stColor = statusColor[booking.status] || gray;
    const stLabel = statusMap[booking.status] || booking.status;
    const badgeW = 85;
    const badgeH = 16;
    doc.roundedRect(col3, currentY + 18, badgeW, badgeH, 3).fill(stColor);
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff");
    const textW = doc.widthOfString(stLabel);
    doc.text(stLabel, col3 + (badgeW - textW) / 2, currentY + 22, {
      width: badgeW,
      align: "left",
    });

    // Deadline
    const deadline = booking.deadline ? formatDate(booking.deadline) : "-";
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(black)
      .text(deadline, col4, currentY + 20, { width: 100 });

    // === 3. KLIEN & DETAIL SESI ===
    currentY += 58;
    const cardH = 80;
    const halfW = (contentW - 15) / 2;

    // Data Klien
    doc.roundedRect(M, currentY, halfW, cardH, 4).lineWidth(0.5).stroke(border);
    doc
      .fontSize(7)
      .font("Helvetica-Bold")
      .fillColor(purple)
      .text("DITUJUKAN KE", M + 12, currentY + 8);
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(black)
      .text(booking.clientName, M + 12, currentY + 20, { width: halfW - 24 });

    doc.fontSize(8).font("Helvetica").fillColor(gray);
    let clientDetailsY = currentY + 36;
    if (booking.clientEmail) {
      doc.text(booking.clientEmail, M + 12, clientDetailsY, {
        width: halfW - 24,
      });
      clientDetailsY += 12;
    }
    if (booking.clientPhone) {
      doc.text(booking.clientPhone, M + 12, clientDetailsY, {
        width: halfW - 24,
      });
    }

    // Detail Sesi Foto
    const rightColX = M + halfW + 15;
    doc
      .roundedRect(rightColX, currentY, halfW, cardH, 4)
      .lineWidth(0.5)
      .stroke(border);
    doc
      .fontSize(7)
      .font("Helvetica-Bold")
      .fillColor(purple)
      .text("DETAIL SESI", rightColX + 12, currentY + 8);

    doc.fontSize(8).font("Helvetica").fillColor(black);
    let sessionY = currentY + 20;
    const sLX = rightColX + 12;
    const sVX = rightColX + 65;
    const sW = halfW - 75;

    doc.text("Acara", sLX, sessionY, { width: 50 });
    doc.text(`: ${booking.eventType}`, sVX, sessionY, { width: sW });
    sessionY += 13;
    doc.text("Tanggal", sLX, sessionY, { width: 50 });
    doc.text(`: ${formatDate(booking.sessionDate)}`, sVX, sessionY, {
      width: sW,
    });
    sessionY += 13;
    if (booking.sessionTime) {
      doc.text("Jam", sLX, sessionY, { width: 50 });
      doc.text(`: ${booking.sessionTime} WIB`, sVX, sessionY, { width: sW });
      sessionY += 13;
    }
    if (booking.location) {
      doc.text("Lokasi", sLX, sessionY, { width: 50 });
      doc.text(`: ${booking.location}`, sVX, sessionY, {
        width: sW,
        maxRows: 1,
      });
    }

    // === 4. TABEL LAYANAN DAN HARGA ===
    currentY += cardH + 18;

    const tDesc = M;
    const tQty = M + 260;
    const tHrg = M + 310;
    const tSub = M + 410;
    const cDesc = 250,
      cQty = 40,
      cHrg = 90,
      cSub = 105;

    // Header Tabel
    doc.roundedRect(M, currentY, contentW, 20, 3).fill(purple);
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text("DESKRIPSI", tDesc + 8, currentY + 6, { width: cDesc });
    doc.text("QTY", tQty + 2, currentY + 6, { width: cQty, align: "center" });
    doc.text("HARGA", tHrg, currentY + 6, { width: cHrg, align: "right" });
    doc.text("SUBTOTAL", tSub, currentY + 6, { width: cSub, align: "right" });

    let rowY = currentY + 20;
    const rowH = 24;
    let rowCount = 0;

    // Paket Utama
    if (rowCount % 2 === 0) doc.rect(M, rowY, contentW, rowH).fill(lightGray);
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(black)
      .text(booking.packageName, tDesc + 8, rowY + 7, { width: cDesc });
    doc.font("Helvetica").fillColor(gray);
    doc.text("1", tQty + 2, rowY + 7, { width: cQty, align: "center" });
    doc.text(
      formatRp(booking.packagePrice || booking.totalAmount),
      tHrg,
      rowY + 7,
      { width: cHrg, align: "right" },
    );
    doc
      .font("Helvetica-Bold")
      .fillColor(black)
      .text(formatRp(booking.totalAmount), tSub, rowY + 7, {
        width: cSub,
        align: "right",
      });
    rowY += rowH;
    rowCount++;

    // Addons
    const addons = JSON.parse(booking.addons || "[]");
    addons.forEach((addon) => {
      if (rowCount % 2 === 0) doc.rect(M, rowY, contentW, rowH).fill(lightGray);
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor(black)
        .text(addon.name || "Tambahan", tDesc + 8, rowY + 7, { width: cDesc });
      doc
        .fillColor(gray)
        .text("1", tQty + 2, rowY + 7, { width: cQty, align: "center" });
      doc.text(formatRp(addon.price || 0), tHrg, rowY + 7, {
        width: cHrg,
        align: "right",
      });
      doc
        .font("Helvetica-Bold")
        .fillColor(black)
        .text(formatRp(addon.price || 0), tSub, rowY + 7, {
          width: cSub,
          align: "right",
        });
      rowY += rowH;
      rowCount++;
    });

    // Garis Penutup Tabel (Aman dari benturan teks bawah)
    doc
      .moveTo(M, rowY)
      .lineTo(M + contentW, rowY)
      .lineWidth(0.5)
      .stroke(border);
    rowY += 15; // Padding ditambah agar tidak menempel dengan baris Subtotal

    // === 5. RINGKASAN PEMBAYARAN (TOTALS BLOCK) ===
    const totX = M + 260;
    const totLabelW = 110;
    const totValX = totX + totLabelW;
    const totValW = contentW - 260 - totLabelW;

    // Subtotal
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(gray)
      .text("Subtotal", totX, rowY, { width: totLabelW });
    doc
      .fillColor(black)
      .text(formatRp(booking.totalAmount), totValX, rowY, {
        width: totValW,
        align: "right",
      });
    rowY += 18;

    // Down Payment (DP)
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(gray)
      .text("DP (Uang Muka)", totX, rowY, { width: totLabelW });
    doc
      .fillColor(booking.dpPaid ? "#22c55e" : "#ef4444")
      .text(
        (booking.dpPaid ? "- " : "") + formatRp(booking.dpAmount),
        totValX,
        rowY,
        { width: totValW, align: "right" },
      );
    rowY += 18; // Ditambah koordinatnya agar teks nominal DP selesai ditulis seutuhnya

    // FIX VISUAL: Garis pembatas total diposisikan di bawah teks DP (tidak tumpang tindih)
    doc
      .moveTo(totX, rowY)
      .lineTo(M + contentW, rowY)
      .lineWidth(1)
      .stroke(purple);
    rowY += 8;

    // FIX LOGIKA: Sisa bayar hanya dikurangi nominal DP jika status DP sudah lunas (dpPaid === true)
    const remaining = booking.dpPaid
      ? booking.totalAmount - booking.dpAmount
      : booking.totalAmount;

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor(purple)
      .text("SISA BAYAR", totX, rowY, { width: totLabelW });
    doc.text(formatRp(remaining), totValX, rowY, {
      width: totValW,
      align: "right",
    });

    // === 6. NOTIFIKASI STATUS UTAMA ===
    rowY += 35;
    doc.roundedRect(M, rowY, contentW, 32, 4).fill(lightGray);
    doc
      .fontSize(7)
      .font("Helvetica-Bold")
      .fillColor(gray)
      .text("STATUS PEMBAYARAN DIGITAL", M + 12, rowY + 6);

    // Titik Indikator DP
    doc
      .circle(M + 15, rowY + 20, 3)
      .fill(booking.dpPaid ? "#22c55e" : "#f59e0b");
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(black)
      .text(
        `DP: ${booking.dpPaid ? "Lunas" : "Belum Terbayar"}`,
        M + 24,
        rowY + 15,
      );

    // Titik Indikator Pelunasan
    doc
      .circle(M + 160, rowY + 20, 3)
      .fill(booking.finalPaid ? "#22c55e" : "#f59e0b");
    doc.text(
      `Pelunasan: ${booking.finalPaid ? "Lunas" : "Belum Terbayar"}`,
      M + 169,
      rowY + 15,
    );

    // === 7. FOOTER BRAND DATA ===
    rowY += 48;
    doc
      .moveTo(M, rowY)
      .lineTo(M + contentW, rowY)
      .lineWidth(0.5)
      .stroke(border);
    rowY += 8;

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(gray)
      .text(
        "Terima kasih atas kepercayaan Anda bekerja sama dengan kami.",
        M,
        rowY,
        { width: contentW, align: "center" },
      );
    rowY += 12;
    doc
      .fontSize(7)
      .fillColor("#9ca3af")
      .text(
        `${user.studioName || "Photo Studio"}  |  ${user.email}  |  Tanggal Cetak Dokumen: ${formatDate(new Date())}`,
        M,
        rowY,
        { width: contentW, align: "center" },
      );

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/calendar", auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const start = new Date(
      year || new Date().getFullYear(),
      (month || new Date().getMonth()) - 1,
      1,
    );
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    const bookings = await prisma.booking.findMany({
      where: { userId: req.userId, sessionDate: { gte: start, lt: end } },
      select: {
        id: true,
        bookingCode: true,
        clientName: true,
        sessionDate: true,
        sessionTime: true,
        eventType: true,
        status: true,
        packageName: true,
      },
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { freelancer: true, paymentProofs: true, settlements: true, bookingAddons: true },
    });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const data = bookingSchema.parse(req.body);
    const addonData = data.addons ? JSON.parse(data.addons) : [];
    
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
        totalAmount: data.totalAmount,
        dpAmount: data.dpAmount || 0,
        notes: data.notes || null,
        freelancerId: data.freelancerId || null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        customFields: data.customFields || "{}",
        bookingAddons: {
          create: addonData.map((a) => ({
            serviceId: a.id || null,
            name: a.name || 'Tambahan',
            price: a.price || 0,
            quantity: a.quantity || 1
          }))
        }
      },
      include: { freelancer: true, bookingAddons: true },
    });
    res.json(booking);
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    const data = bookingSchema.partial().parse(req.body);
    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: {
        ...data,
        sessionDate: data.sessionDate ? new Date(data.sessionDate) : undefined,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      },
      include: { freelancer: true },
    });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = [
      "pending",
      "paid",
      "completed",
      "cancelled",
    ];
    if (!valid.includes(status))
      return res.status(400).json({ error: "Invalid status" });
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status },
      include: { freelancer: true },
    });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/dp", auth, async (req, res) => {
  try {
    const { dpPaid } = req.body;
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { dpPaid, dpPaidAt: dpPaid ? new Date() : null },
      include: { freelancer: true },
    });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/final-payment", auth, async (req, res) => {
  try {
    const { finalPaid } = req.body;
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { finalPaid, finalPaidAt: finalPaid ? new Date() : null },
      include: { freelancer: true },
    });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    await prisma.booking.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });
    res.json({ message: "Booking deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
