const router = require('express').Router();
const prisma = require('../config/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const [
      totalBookings,
      monthBookings,
      pendingBookings,
      completedBookings,
      monthRevenue,
      totalRevenue,
      recentBookings,
      statusCounts,
      upcomingBookings,
      services,
      teamCount
    ] = await Promise.all([
      prisma.booking.count({ where: { userId: req.userId } }),
      prisma.booking.count({ where: { userId: req.userId, createdAt: { gte: startOfMonth } } }),
      prisma.booking.count({ where: { userId: req.userId, status: 'pending' } }),
      prisma.booking.count({ where: { userId: req.userId, status: 'completed' } }),
      prisma.booking.aggregate({ where: { userId: req.userId, finalPaid: true, createdAt: { gte: startOfMonth } }, _sum: { totalAmount: true } }),
      prisma.booking.aggregate({ where: { userId: req.userId, finalPaid: true }, _sum: { totalAmount: true } }),
      prisma.booking.findMany({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, bookingCode: true, clientName: true, eventType: true, sessionDate: true, status: true, totalAmount: true } }),
      prisma.booking.groupBy({ by: ['status'], where: { userId: req.userId }, _count: true }),
      prisma.booking.findMany({ where: { userId: req.userId, sessionDate: { gte: now }, status: { not: 'cancelled' } }, orderBy: { sessionDate: 'asc' }, take: 5, select: { id: true, bookingCode: true, clientName: true, sessionDate: true, sessionTime: true, eventType: true, status: true } }),
      prisma.service.count({ where: { userId: req.userId } }),
      prisma.teamMember.count({ where: { userId: req.userId } })
    ]);

    res.json({
      totalBookings,
      monthBookings,
      pendingBookings,
      completedBookings,
      monthRevenue: monthRevenue._sum.totalAmount || 0,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      recentBookings,
      statusCounts,
      upcomingBookings,
      servicesCount: services,
      teamCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
