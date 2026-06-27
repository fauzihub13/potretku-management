const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../config/db');
const auth = require('../middleware/auth');

const formatRp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');

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
      where: { userId: req.userId },
      include: {
        bookings: {
          select: { id: true, bookingCode: true, clientName: true, eventType: true, sessionDate: true, totalAmount: true, status: true, dpPaid: true, finalPaid: true },
          orderBy: { sessionDate: 'desc' }
        },
        teamPayments: { select: { amount: true, status: true } }
      }
    });

    const summary = members.map(m => {
      const totalPaid = m.teamPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
      const totalUnpaid = m.teamPayments.filter(p => p.status === 'unpaid').reduce((sum, p) => sum + p.amount, 0);
      return {
        id: m.id,
        name: m.name,
        role: m.role,
        isActive: m.isActive,
        bookingCount: m.bookings.length,
        bookings: m.bookings,
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
      amount: z.number().min(1, 'Jumlah minimal Rp1'),
      description: z.string().optional()
    });
    const data = schema.parse(req.body);

    // Validasi jumlah tidak melebihi harga pesanan
    if (data.bookingId && data.amount > 0) {
      const booking = await prisma.booking.findFirst({
        where: { id: data.bookingId, userId: req.userId }
      });
      if (!booking) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
      if (data.amount > booking.totalAmount) {
        return res.status(400).json({ error: `Jumlah maksimal ${formatRp(booking.totalAmount)}` });
      }
    }

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
