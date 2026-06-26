const router = require('express').Router();
const prisma = require('../config/db');
const auth = require('../middleware/auth');

router.get('/summary', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = { userId: req.userId };
    if (startDate || endDate) {
      where.sessionDate = {};
      if (startDate) where.sessionDate.gte = new Date(startDate);
      if (endDate) where.sessionDate.lte = new Date(endDate);
    }

    const allBookings = await prisma.booking.findMany({
      where,
      select: { totalAmount: true, dpAmount: true, dpPaid: true, finalPaid: true }
    });

    const totalRevenue = allBookings.reduce((sum, b) => sum + b.totalAmount, 0);

    // Sudah dibayar = DP yang sudah masuk + pelunasan yang sudah masuk
    const collected = allBookings.reduce((sum, b) => {
      let paid = 0;
      if (b.dpPaid) paid += b.dpAmount;
      if (b.finalPaid) paid += (b.totalAmount - b.dpAmount);
      return sum + paid;
    }, 0);

    const outstanding = totalRevenue - collected;
    const bookingCount = allBookings.length;

    const dpPaid = allBookings.filter(b => b.dpPaid).length;
    const finalPaid = allBookings.filter(b => b.finalPaid).length;

    const statusBreakdown = await prisma.booking.groupBy({
      by: ['status'], where, _count: true, _sum: { totalAmount: true }
    });

    res.json({
      totalRevenue,
      collected,
      outstanding,
      bookingCount,
      dpPaid,
      finalPaid,
      statusBreakdown
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/monthly', auth, async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const now = new Date();
    const results = [];
    for (let i = Number(months) - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const [revenue, count] = await Promise.all([
        prisma.booking.aggregate({ where: { userId: req.userId, sessionDate: { gte: start, lte: end }, finalPaid: true }, _sum: { totalAmount: true } }),
        prisma.booking.count({ where: { userId: req.userId, sessionDate: { gte: start, lte: end } } })
      ]);
      results.push({
        month: start.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
        bulan: start.toLocaleDateString('id-ID', { month: 'long' }),
        tahun: start.getFullYear(),
        pendapatan: revenue._sum.totalAmount || 0,
        jumlah: count
      });
    }
    res.json(results);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/by-event', auth, async (req, res) => {
  try {
    const result = await prisma.booking.groupBy({
      by: ['eventType'],
      where: { userId: req.userId },
      _count: true,
      _sum: { totalAmount: true }
    });
    res.json(result.map(r => ({ eventType: r.eventType, jumlah: r._count, total: r._sum.totalAmount || 0 })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/by-package', auth, async (req, res) => {
  try {
    const result = await prisma.booking.groupBy({
      by: ['packageName'],
      where: { userId: req.userId },
      _count: true,
      _sum: { totalAmount: true }
    });
    res.json(result.map(r => ({ paket: r.packageName, jumlah: r._count, total: r._sum.totalAmount || 0 })).sort((a, b) => b.total - a.total));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/by-status', auth, async (req, res) => {
  try {
    const result = await prisma.booking.groupBy({
      by: ['status'],
      where: { userId: req.userId },
      _count: true,
      _sum: { totalAmount: true }
    });
    res.json(result.map(r => ({ status: r.status, jumlah: r._count, total: r._sum.totalAmount || 0 })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/recent', auth, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, bookingCode: true, clientName: true, eventType: true, sessionDate: true, status: true, totalAmount: true, dpPaid: true, finalPaid: true }
    });
    res.json(bookings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
