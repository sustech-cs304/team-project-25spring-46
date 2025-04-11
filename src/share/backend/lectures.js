const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('./db');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.post('/upload', upload.single('lecture'), async (req, res) => {
  const { originalname, filename } = req.file;
  const url = `http://localhost:3000/uploads/${filename}`;
  await db.query('INSERT INTO lectures (name, url) VALUES ($1, $2)', [originalname, url]);
  res.json({ name: originalname, url });
});

router.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM lectures ORDER BY id DESC');
  res.json(result.rows);
});

module.exports = router;