const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../config/db');
const auth = require('../middleware/auth');

const templateSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  content: z.string().min(1),
  variables: z.string().optional()
});

router.get('/', auth, async (req, res) => {
  try {
    const { type } = req.query;
    const where = { userId: req.userId };
    if (type) where.type = type;
    const templates = await prisma.template.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const data = templateSchema.parse(req.body);
    const template = await prisma.template.create({ data: { ...data, userId: req.userId } });
    res.json(template);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const data = templateSchema.partial().parse(req.body);
    const template = await prisma.template.update({ where: { id: req.params.id }, data });
    res.json(template);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.template.delete({ where: { id: req.params.id } });
    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
