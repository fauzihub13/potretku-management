const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../config/db');
const auth = require('../middleware/auth');

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: { ...data, password: hash }
    });
    await prisma.setting.create({ data: { userId: user.id } });
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const session = await prisma.session.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
    });
    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan },
      token
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    await prisma.session.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
    });
    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan, studioName: user.studioName },
      token
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, role: true, plan: true, studioName: true, studioAddress: true, studioPhone: true, studioLogo: true, avatar: true, createdAt: true }
  });
  res.json(user);
});

router.put('/me', auth, async (req, res) => {
  const { name, studioName, studioAddress, studioPhone, studioLogo, avatar } = req.body;
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { name, studioName, studioAddress, studioPhone, studioLogo, avatar },
    select: { id: true, name: true, email: true, role: true, plan: true, studioName: true, studioAddress: true, studioPhone: true, studioLogo: true, avatar: true }
  });
  res.json(user);
});

router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Password lama dan baru wajib diisi' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password baru minimal 6 karakter' });
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Password lama salah' });
    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.userId }, data: { password: hash } });
    res.json({ message: 'Password berhasil diubah' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', auth, async (req, res) => {
  const header = req.headers.authorization;
  const token = header.split(' ')[1];
  await prisma.session.deleteMany({ where: { token } });
  res.json({ message: 'Logged out' });
});

module.exports = router;
