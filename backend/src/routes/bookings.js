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
