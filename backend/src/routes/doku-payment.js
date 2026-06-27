const router = require('express').Router();
const prisma = require('../config/db');
const { createPayment, verifyNotification } = require('../utils/doku');

router.post('/create', async (req, res) => {
  try {
    const { bookingId, slug } = req.body;
    if (!bookingId || !slug) return res.status(400).json({ error: 'bookingId dan slug wajib diisi' });

    const setting = await prisma.setting.findUnique({ where: { vendorSlug: slug } });
    if (!setting) return res.status(404).json({ error: 'Vendor tidak ditemukan' });

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId: setting.userId },
      include: { bookingAddons: true }
    });
    if (!booking) return res.status(404).json({ error: 'Pemesanan tidak ditemukan' });

    if (!process.env.DOKU_CLIENT_ID || !process.env.DOKU_CLIENT_SECRET) {
      await prisma.booking.delete({ where: { id: booking.id } });
      return res.status(500).json({ error: 'Payment gateway belum dikonfigurasi' });
    }

    const result = await createPayment(booking, setting, booking.bookingAddons);

    if (result.success) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          dokuInvoiceNo: result.invoiceNumber,
          dokuSessionId: result.sessionId,
          dokuPaymentUrl: result.paymentUrl,
          dokuExpiredAt: result.expiredDate,
          dokuStatus: 'pending'
        }
      });
      res.json({ paymentUrl: result.paymentUrl, invoiceNumber: result.invoiceNumber });
    } else {
      await prisma.booking.delete({ where: { id: booking.id } });
      res.status(400).json({ error: result.error || 'Gagal membuat pembayaran' });
    }
  } catch (err) {
    console.error('[DOKU] Error:', err);
    if (req.body.bookingId) await prisma.booking.delete({ where: { id: req.body.bookingId } }).catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

router.post('/notification', async (req, res) => {
  try {
    const notification = req.body;
    console.log('[DOKU] Notification received:', JSON.stringify(notification));

    const invoiceNumber = notification.order?.invoice_number;
    if (!invoiceNumber) return res.status(400).json({ error: 'Invoice not found' });

    const booking = await prisma.booking.findFirst({ where: { dokuInvoiceNo: invoiceNumber } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const dokuStatus = notification.order?.status || notification.payment?.status || notification.status;
    console.log('[DOKU] DOKU status:', dokuStatus, 'for booking:', booking.bookingCode);

    let newStatus = 'pending';
    let dpPaid = booking.dpPaid;
    let finalPaid = booking.finalPaid;

    if (dokuStatus === 'SUCCESS' || dokuStatus === 'PAID') {
      newStatus = 'paid';
      dpPaid = true;
    } else if (dokuStatus === 'EXPIRED' || dokuStatus === 'FAILED' || dokuStatus === 'CANCELLED') {
      newStatus = 'cancelled';
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        dokuStatus: dokuStatus,
        status: newStatus,
        dpPaid,
        dpPaidAt: dpPaid && !booking.dpPaid ? new Date() : booking.dpPaidAt,
        finalPaid,
        finalPaidAt: finalPaid && !booking.finalPaid ? new Date() : booking.finalPaidAt
      }
    });

    console.log(`[DOKU] Booking ${booking.bookingCode} updated: status=${newStatus}`);
    res.json({ status: 'OK' });
  } catch (err) {
    console.error('[DOKU] Notification error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/status/:bookingId', async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.bookingId },
      select: { dokuStatus: true, dokuPaymentUrl: true, dokuInvoiceNo: true, status: true, dpPaid: true }
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
