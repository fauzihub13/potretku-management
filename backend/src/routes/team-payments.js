const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../config/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { teamMemberId, status } = req.query;
    const where = { userId: req.userId };
    if (teamMemberId) where.teamMemberId = teamMemberId;
    if (status) where.status = status;

    const payments = await prisma.teamPayment.findMany({
      where,
      include: { teamMember: true, booking: { select: { id: true, bookingCode: true, clientName: true, eventType: true, sessionDate: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(payments);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/summary', auth, async (req, res) => {
  try {
    const members = await prisma.teamMember.findMany({
      where: { userId: req.userId, isActive: true },
      include: {
        bookings: { select: { id: true, totalAmount: true, dpPaid: true, finalPaid: true, status: true } },
        teamPayments: { select: { amount: true, status: true } }
      }
    });

    const summary = members.map(m => {
      const totalEarning = m.bookings.reduce((sum, b) => sum + (b.totalAmount * 0.1), 0); // 10% default
      const totalPaid = m.teamPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
      const totalUnpaid = m.teamPayments.filter(p => p.status === 'unpaid').reduce((sum, p) => sum + p.amount, 0);
      return {
        id: m.id,
        name: m.name,
        role: m.role,
        bookingCount: m.bookings.length,
        totalPaid,
        totalUnpaid,
        totalAll: totalPaid + totalUnpaid
      };
    });
    res.json(summary);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const schema = z.object({
      teamMemberId: z.string().min(1),
      bookingId: z.string().optional(),
      amount: z.number().min(0),
      description: z.string().optional()
    });
    const data = schema.parse(req.body);
    const payment = await prisma.teamPayment.create({
      data: { ...data, userId: req.userId },
      include: { teamMember: true, booking: true }
    });
    res.json(payment);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/pay', auth, async (req, res) => {
  try {
    const payment = await prisma.teamPayment.update({
      where: { id: req.params.id },
      data: { status: 'paid', paidAt: new Date() },
      include: { teamMember: true, booking: true }
    });
    res.json(payment);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/unpay', auth, async (req, res) => {
  try {
    const payment = await prisma.teamPayment.update({
      where: { id: req.params.id },
      data: { status: 'unpaid', paidAt: null },
      include: { teamMember: true, booking: true }
    });
    res.json(payment);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.teamPayment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Pembayaran dihapus' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
