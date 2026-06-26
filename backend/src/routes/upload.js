const router = require('express').Router();
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:4000';

router.post('/', auth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file' });
    const url = `${BASE_URL}/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename, size: req.file.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/multiple', auth, upload.array('files', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Tidak ada file' });
    const files = req.files.map(f => ({ url: `${BASE_URL}/uploads/${f.filename}`, filename: f.filename, size: f.size }));
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
