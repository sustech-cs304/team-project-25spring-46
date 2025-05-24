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


// -- 用户表
// CREATE TABLE users (
//     id SERIAL PRIMARY KEY,
//     username VARCHAR(50) UNIQUE NOT NULL,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );

// -- 好友关系表
// CREATE TABLE user_friends (
//     user_id INTEGER REFERENCES users(id),
//     friend_id INTEGER REFERENCES users(id),
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     PRIMARY KEY (user_id, friend_id)
// );

// -- 聊天表 (包括私聊和群聊)
// CREATE TABLE chats (
//     id SERIAL PRIMARY KEY,
//     name VARCHAR(100),
//     is_group BOOLEAN DEFAULT FALSE,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     owner_id INTEGER REFERENCES users(id)
// );

// -- 聊天成员表
// CREATE TABLE chat_members (
//     chat_id INTEGER REFERENCES chats(id),
//     user_id INTEGER REFERENCES users(id),
//     joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     PRIMARY KEY (chat_id, user_id)
// );

// -- 消息表
// CREATE TABLE messages (
//     id SERIAL PRIMARY KEY,
//     chat_id INTEGER REFERENCES chats(id),
//     sender_id INTEGER REFERENCES users(id),
//     content TEXT,
//     sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );


// -- 初始化用户
// INSERT INTO users (username) VALUES
// ('Alice'), ('Bob'), ('Charlie'), ('我');

// -- 初始化好友关系
// INSERT INTO user_friends (user_id, friend_id) VALUES
// (1, 2), (2, 1), -- Alice 和 Bob 是好友
// (1, 3), (3, 1), -- Alice 和 Charlie 是好友
// (4, 1), (1, 4); -- 我和 Alice 是好友

// 获取用户好友列表
app.get('/friends/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(`
      SELECT u.id, u.username 
      FROM users u
      JOIN user_friends uf ON u.id = uf.friend_id
      WHERE uf.user_id = $1
    `, [userId]);
    res.json(result.rows);
  } catch (e) {
    res.status(500).send('获取好友列表失败: ' + e);
  }
});

// 添加好友
app.post('/friends', async (req, res) => {
  const { userId, friendId } = req.body;
  try {
    await pool.query('INSERT INTO user_friends (user_id, friend_id) VALUES ($1, $2), ($2, $1)',
      [userId, friendId]);
    res.status(200).send('好友添加成功');
  } catch (e) {
    res.status(500).send('添加好友失败: ' + e);
  }
});

// 创建聊天
app.post('/chats', async (req, res) => {
  const { name, isGroup, userIds, ownerId } = req.body;
  try {
    // 使用事务确保数据一致性
    await pool.query('BEGIN');

    // 创建聊天
    const chatResult = await pool.query(
      'INSERT INTO chats (name, is_group, owner_id) VALUES ($1, $2, $3) RETURNING id',
      [name, isGroup, ownerId]
    );
    const chatId = chatResult.rows[0].id;

    // 添加聊天成员
    for (const userId of userIds) {
      await pool.query(
        'INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2)',
        [chatId, userId]
      );
    }

    await pool.query('COMMIT');
    res.status(200).json({ chatId });
  } catch (e) {
    await pool.query('ROLLBACK');
    res.status(500).send('创建聊天失败: ' + e);
  }
});

// 获取用户聊天列表
app.get('/chats/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(`
      SELECT c.id, c.name, c.is_group, c.owner_id
      FROM chats c
      JOIN chat_members cm ON c.id = cm.chat_id
      WHERE cm.user_id = $1
    `, [userId]);
    res.json(result.rows);
  } catch (e) {
    res.status(500).send('获取聊天列表失败: ' + e);
  }
});

// 发送消息
app.post('/messages', async (req, res) => {
  const { chatId, senderId, content } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO messages (chat_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
      [chatId, senderId, content]
    );
    res.status(200).json(result.rows[0]);
  } catch (e) {
    res.status(500).send('发送消息失败: ' + e);
  }
});

// 获取聊天消息
app.get('/messages/:chatId', async (req, res) => {
  const { chatId } = req.params;
  try {
    const result = await pool.query(`
      SELECT m.id, m.content, m.sent_at, u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = $1
      ORDER BY m.sent_at
    `, [chatId]);
    res.json(result.rows);
  } catch (e) {
    res.status(500).send('获取消息失败: ' + e);
  }
});

// 添加群聊成员接口
app.post('/chats/:chatId/members', async (req, res) => {
  const { chatId } = req.params;
  const { userIds } = req.body; // 接收 userIds: number[]

  try {
    const insertPromises = userIds.map((userId: number) =>
      pool.query('INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2)', [chatId, userId])
    );

    await Promise.all(insertPromises);
    res.status(200).send('成员添加成功');
  } catch (e) {
    res.status(500).send('添加成员失败: ' + e);
  }
});


app.listen(3000, () => {
  console.log('评论服务运行于 http://localhost:3000');
});
