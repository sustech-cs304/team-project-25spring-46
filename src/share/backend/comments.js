const express = require('express');
const router = express.Router();
const db = require('./db');

router.get('/:lectureId', async (req, res) => {
  const { lectureId } = req.params;
  const result = await db.query('SELECT * FROM comments WHERE lecture_id = $1 ORDER BY created_at', [lectureId]);
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { lectureId, author, content, position } = req.body;
  try {
    await db.query(
      'INSERT INTO comments (lecture_id, author, content, position) VALUES ($1, $2, $3, $4)',
      [lectureId, author, content, position || null]
    );
    res.sendStatus(200);
  } catch (error) {
    console.error('Error inserting comment:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;