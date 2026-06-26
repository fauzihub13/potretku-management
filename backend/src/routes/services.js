const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../config/db');
const auth = require('../middleware/auth');

const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  discountPrice: z.number().optional().nullable(),
  durationHours: z.number().min(0).optional(),
  durationMinutes: z.number().min(0).max(59).optional(),
  photoEditCount: z.number().min(0).optional(),
  category: z.string().optional(),
  eventTypes: z.string().optional(),
  city: z.string().optional(),
  additionalCosts: z.string().optional(),
  location: z.string().optional(),
  isActive: z.boolean().optional()
});

router.get('/', auth, async (req, res) => {
  try {
    const { category, search } = req.query;
    const where = { userId: req.userId };
    if (category) where.category = category;
    if (search) where.name = { contains: search };
    const services = await prisma.service.findMany({ where, orderBy: { sortOrder: 'asc' } });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const service = await prisma.service.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const data = serviceSchema.parse(req.body);
    const maxOrder = await prisma.service.aggregate({ where: { userId: req.userId }, _max: { sortOrder: true } });
    const service = await prisma.service.create({
      data: {
        userId: req.userId,
        name: data.name,
        description: data.description || null,
        price: data.price,
        discountPrice: data.discountPrice || null,
        durationHours: data.durationHours || 0,
        durationMinutes: data.durationMinutes || 0,
        photoEditCount: data.photoEditCount || 0,
        category: data.category || 'main',
        eventTypes: data.eventTypes || '[]',
        city: data.city || null,
        additionalCosts: data.additionalCosts || '[]',
        location: data.location || null,
        isActive: data.isActive ?? true,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1
      }
    });
    res.json(service);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const data = serviceSchema.partial().parse(req.body);
    const service = await prisma.service.update({
      where: { id: req.params.id },
      data: {
        ...data,
        durationHours: data.durationHours !== undefined ? data.durationHours : undefined,
        durationMinutes: data.durationMinutes !== undefined ? data.durationMinutes : undefined,
        photoEditCount: data.photoEditCount !== undefined ? data.photoEditCount : undefined,
      }
    });
    res.json(service);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.service.delete({ where: { id: req.params.id } });
    res.json({ message: 'Service deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/reorder', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    for (let i = 0; i < ids.length; i++) {
      await prisma.service.update({ where: { id: ids[i] }, data: { sortOrder: i } });
    }
    res.json({ message: 'Reordered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
