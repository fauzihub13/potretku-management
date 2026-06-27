const router = require('express').Router();
const prisma = require('../config/db');

router.get('/:slug', async (req, res) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { vendorSlug: req.params.slug },
      include: {
        user: {
          select: { id: true, name: true, studioName: true, studioLogo: true, studioAddress: true, studioPhone: true, email: true }
        }
      }
    });
    if (!setting) return res.status(404).json({ error: 'Vendor tidak ditemukan' });

    const services = await prisma.service.findMany({
      where: { userId: setting.userId, isActive: true, category: 'main' },
      orderBy: { sortOrder: 'asc' }
    });

    const addons = await prisma.service.findMany({
      where: { userId: setting.userId, isActive: true, category: 'addon' },
      orderBy: { sortOrder: 'asc' }
    });

    const eventTypes = JSON.parse(setting.eventTypes || '[]');

    res.json({
      vendor: {
        slug: setting.vendorSlug,
        name: setting.user.studioName || setting.user.name,
        tagline: setting.vendorTagline || '',
        description: setting.vendorDescription || '',
        logo: setting.vendorLogo || setting.user.studioLogo,
        banner: setting.vendorBanner,
        primaryColor: setting.vendorPrimaryColor,
        accentColor: setting.vendorAccentColor,
        phone: setting.vendorPhone || setting.user.studioPhone,
        email: setting.vendorEmail || setting.user.email,
        address: setting.vendorAddress || setting.user.studioAddress,
        social: {
          instagram: setting.vendorSocialInstagram,
          tiktok: setting.vendorSocialTiktok,
          facebook: setting.vendorSocialFacebook
        },
        landingHtml: setting.vendorLandingHtml,
        termsHtml: setting.vendorTermsHtml,
        bookingGreeting: setting.bookingFormGreeting,
        paymentMethods: JSON.parse(setting.paymentMethods || '[]'),
        bankAccounts: JSON.parse(setting.bankAccounts || '[]'),
        qrisImage: setting.qrisImage,
        customFields: JSON.parse(setting.vendorCustomFields || '[]'),
        eventTypes
      },
      services,
      addons
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:slug/book', async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase().replace(/\s+/g, '');
    if (!/^[a-z0-9\-_]+$/.test(slug)) return res.status(400).json({ error: 'URL vendor tidak valid' });
    
    const setting = await prisma.setting.findUnique({ where: { vendorSlug: slug } });
    if (!setting) return res.status(404).json({ error: 'Vendor tidak ditemukan' });

    const { z } = require('zod');
    const schema = z.object({
      clientName: z.string().min(1, 'Nama wajib diisi'),
      clientEmail: z.string().email().optional().or(z.literal('')),
      clientPhone: z.string().min(10, 'Nomor telepon minimal 10 digit'),
      eventType: z.string().min(1, 'Jenis acara wajib diisi'),
      sessionDate: z.string().min(1, 'Tanggal wajib diisi'),
      sessionTime: z.string().optional(),
      serviceId: z.string().min(1, 'Paket wajib dipilih'),
      addons: z.array(z.string()).optional(),
      notes: z.string().optional(),
      customFieldValues: z.record(z.string()).optional()
    });

    const data = schema.parse(req.body);

    const service = await prisma.service.findFirst({
      where: { id: data.serviceId, userId: setting.userId, isActive: true }
    });
    if (!service) return res.status(400).json({ error: 'Paket tidak ditemukan' });

    let totalAmount = service.price;
    const addonList = [];
    if (data.addons && data.addons.length > 0) {
      const addonServices = await prisma.service.findMany({
        where: { id: { in: data.addons }, userId: setting.userId, category: 'addon', isActive: true }
      });
      addonServices.forEach(a => { totalAmount += a.price; addonList.push({ id: a.id, name: a.name, price: a.price }); });
    }

    const dpAmount = Math.round(totalAmount * 0.3);

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let bookingCode = 'BK-';
    for (let i = 0; i < 6; i++) bookingCode += chars[Math.floor(Math.random() * chars.length)];

    const booking = await prisma.booking.create({
      data: {
        userId: setting.userId,
        bookingCode,
        clientName: data.clientName,
        clientEmail: data.clientEmail || null,
        clientPhone: data.clientPhone,
        eventType: data.eventType,
        sessionDate: new Date(data.sessionDate),
        sessionTime: data.sessionTime || null,
        packageName: service.name,
        packagePrice: service.price,
        totalAmount,
        dpAmount,
        notes: data.notes || null,
        customFields: JSON.stringify(data.customFieldValues || {}),
        status: 'pending',
        bookingAddons: {
          create: addonList.map(a => ({
            serviceId: a.id,
            name: a.name,
            price: a.price,
            quantity: 1
          }))
        }
      }
    });

    res.json({ bookingCode: booking.bookingCode, message: 'Pemesanan berhasil!' });
  } catch (err) {
    if (err instanceof require('zod').ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message });
  }
});

router.get('/:slug/track/:code', async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase().replace(/\s+/g, '');
    const setting = await prisma.setting.findUnique({ where: { vendorSlug: slug } });
    if (!setting) return res.status(404).json({ error: 'Vendor tidak ditemukan' });

    const booking = await prisma.booking.findFirst({
      where: { userId: setting.userId, bookingCode: req.params.code },
      select: {
        bookingCode: true, clientName: true, eventType: true, sessionDate: true,
        sessionTime: true, packageName: true, totalAmount: true, dpAmount: true,
        dpPaid: true, finalPaid: true, status: true, notes: true, driveAllPhotos: true,
        driveRawPhotos: true, driveEditedPhotos: true, createdAt: true
      }
    });
    if (!booking) return res.status(404).json({ error: 'Pemesanan tidak ditemukan' });
    res.json(booking);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
