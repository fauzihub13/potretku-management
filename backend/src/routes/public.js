const router = require('express').Router();
const prisma = require('../config/db');

router.get('/booking/:code', async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { bookingCode: req.params.code },
      select: {
        id: true, bookingCode: true, clientName: true, eventType: true,
        sessionDate: true, sessionTime: true, location: true,
        packageName: true, packagePrice: true, totalAmount: true,
        dpAmount: true, dpPaid: true, finalPaid: true, status: true,
        notes: true, deadline: true, createdAt: true
      }
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/services/:userId', async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      where: { userId: req.params.userId, isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
