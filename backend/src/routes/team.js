const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../config/db');
const auth = require('../middleware/auth');

const teamSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  tags: z.string().optional(),
  isActive: z.boolean().optional()
});

router.get('/', auth, async (req, res) => {
  try {
    const { role, search } = req.query;
    const where = { userId: req.userId };
    if (role) where.role = role;
    if (search) where.name = { contains: search };
    const members = await prisma.teamMember.findMany({ where, orderBy: { sortOrder: 'asc' } });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const member = await prisma.teamMember.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!member) return res.status(404).json({ error: 'Team member not found' });
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const data = teamSchema.parse(req.body);
    const maxOrder = await prisma.teamMember.aggregate({ where: { userId: req.userId }, _max: { sortOrder: true } });
    const member = await prisma.teamMember.create({
      data: { ...data, userId: req.userId, sortOrder: (maxOrder._max.sortOrder || 0) + 1 }
    });
    res.json(member);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const data = teamSchema.partial().parse(req.body);
    const member = await prisma.teamMember.update({ where: { id: req.params.id }, data });
    res.json(member);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.teamMember.delete({ where: { id: req.params.id } });
    res.json({ message: 'Team member deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
