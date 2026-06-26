const router = require('express').Router();
const prisma = require('../config/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    let settings = await prisma.setting.findUnique({ where: { userId: req.userId } });
    if (!settings) {
      settings = await prisma.setting.create({ data: { userId: req.userId } });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', auth, async (req, res) => {
  try {
    const data = req.body;
    let settings = await prisma.setting.findUnique({ where: { userId: req.userId } });
    if (!settings) {
      settings = await prisma.setting.create({ data: { userId: req.userId, ...data } });
    } else {
      settings = await prisma.setting.update({ where: { userId: req.userId }, data });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
