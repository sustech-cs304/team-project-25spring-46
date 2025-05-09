import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pool from './serverDatabase';

const app = express();
app.use(cors()); // 允许跨域
app.use(bodyParser.json());

// 新建评论
app.post('/comments', async (req, res) => {
  const { file_id, page_number, position, type, content, extra, author } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO comments(file_id, page_number, position, type, content, extra, author)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [file_id, page_number, position, type, content, extra, author]);
    res.status(200).send('评论添加成功');
  } catch (e) {
    res.status(500).send('服务器错误: ' + e);
  }
});

// 获取评论
app.get('/comments', async (req, res) => {
  const { file_id, page } = req.query;
  const page_number = page ? parseInt(page as string) : null;
  try {
    const query = page_number
      ? 'SELECT * FROM comments WHERE file_id = $1 AND page_number = $2'
      : 'SELECT * FROM comments WHERE file_id = $1';
    const values = page_number ? [file_id, page_number] : [file_id];
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (e) {
    res.status(500).send('获取失败: ' + e);
  }
});

// 删除指定 ID 的评论
app.delete('/comments/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM comments WHERE id = $1', [id]);
      res.status(200).send('评论已删除');
    } catch (e) {
      res.status(500).send('删除失败: ' + e);
    }
  });
  
  // 删除指定文件的所有评论
  app.delete('/comments/by-file/:file_id', async (req, res) => {
    const { file_id } = req.params;
    try {
      await pool.query('DELETE FROM comments WHERE file_id = $1', [file_id]);
      res.status(200).send('该文件的所有评论已删除');
    } catch (e) {
      res.status(500).send('删除失败: ' + e);
    }
  });

app.listen(3000, () => {
  console.log('评论服务运行于 http://10.32.112.180:3000');
});
