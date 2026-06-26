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
    const [totalRevenue, paidRevenue, outstanding, bookingCount, dpPaid, finalPaid] = await Promise.all([
      prisma.booking.aggregate({ where: { ...where }, _sum: { totalAmount: true } }),
      prisma.booking.aggregate({ where: { ...where, finalPaid: true }, _sum: { totalAmount: true } }),
      prisma.booking.aggregate({ where: { ...where, finalPaid: false }, _sum: { dpAmount: true } }),
      prisma.booking.count({ where }),
      prisma.booking.count({ where: { ...where, dpPaid: true } }),
      prisma.booking.count({ where: { ...where, finalPaid: true } })
    ]);
    const statusBreakdown = await prisma.booking.groupBy({
      by: ['status'],
      where,
      _count: true
    });
    res.json({
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      paidRevenue: paidRevenue._sum.totalAmount || 0,
      outstanding: outstanding._sum.dpAmount || 0,
      bookingCount,
      dpPaid,
      finalPaid,
      statusBreakdown
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/monthly', auth, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.userId, finalPaid: true },
      select: { totalAmount: true, sessionDate: true }
    });
    const monthly = {};
    bookings.forEach(b => {
      const key = b.sessionDate.toISOString().slice(0, 7);
      monthly[key] = (monthly[key] || 0) + b.totalAmount;
    });
    res.json(monthly);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/by-status', auth, async (req, res) => {
  try {
    const result = await prisma.booking.groupBy({
      by: ['status'],
      where: { userId: req.userId },
      _count: true,
      _sum: { totalAmount: true }
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
