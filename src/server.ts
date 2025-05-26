import express from 'express';
import { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pool from './serverDatabase';
import supabase, { testSupabaseConnection } from './supabaseClient';

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

// 获取所有用户
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT name FROM users ORDER BY id
    `);
    res.json(result.rows); // 返回 [{ name: "我" }, { name: "Alice" }, ...]
  } catch (e) {
    res.status(500).send('获取用户列表失败: ' + e);
  }
});


// 获取用户好友列表
app.get('/friend-chats/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(`
      SELECT u.id::text AS id, u.name AS name, 'friend' AS type
      FROM friends f
      JOIN users u ON u.id = f.friend_id
      WHERE f.user_id = $1
    `, [userId]);

    res.json(result.rows); // 返回 [{ id: '2', name: 'Alice', isGroup: 'friend' }, ...]
  } catch (e) {
    res.status(500).send('获取好友聊天失败: ' + e);
  }
});


// 创建好友
app.post('/createFriend', async (req: Request, res: Response) => {
  const { currentUserId, friendId } = req.body;

  if (!currentUserId || !friendId) {
    console.log('currentUserId 和 friendId 是必需的');
  }

  try {
    // 插入好友关系（双向）
    await pool.query(
      `INSERT INTO friends (user_id, friend_id)
       VALUES ($1, $2), ($2, $1)
       ON CONFLICT DO NOTHING`,
      [currentUserId, friendId]
    );

    // 查询 friendId 对应的用户名
    const result = await pool.query(
      `SELECT name FROM users WHERE id = $1`,
      [friendId]
    );

    const friendName = result.rows[0]?.name || `用户${friendId}`;

    res.json({
      id: `${currentUserId}-${friendId}`,
      name: friendName,
      type: 'friend',
      members: [currentUserId, friendId]
    });

  } catch (error) {
    console.error('创建好友聊天失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取群聊列表
app.get('/group-chats/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(`
      SELECT g.id::text, g.name, 'group' AS type
      FROM groups g
      JOIN group_members gm ON gm.group_id = g.id
      WHERE gm.member_id = $1
    `, [userId]);

    res.json(result.rows); // 返回 [{ id: '1', name: '编程群', isGroup: 'group' }, ...]
  } catch (e) {
    res.status(500).send('获取群聊失败: ' + e);
  }
});

// 创建群聊
app.post('/createGroup', async (req: Request, res: Response) => {
  const { name, userIds, ownerId } = req.body;

  if (!name || !Array.isArray(userIds) || userIds.length < 2 || !ownerId) {
    console.log('缺少群聊名称、成员列表或群主 ID');
  }

  try {
    // 插入到 groups 表
    const groupResult = await pool.query(
      `INSERT INTO groups (name, owner)
       VALUES ($1, $2)
       RETURNING *`,
      [name, ownerId]
    );

    const group = groupResult.rows[0];

    // 插入到 group_members 表
    const insertValues = userIds.map((_: any, i: number) => `($1, $${i + 2})`).join(', ');
    await pool.query(
      `INSERT INTO group_members (group_id, member_id)
       VALUES ${insertValues}`,
      [group.id, ...userIds]
    );

    res.json({
      id: group.id,
      name: group.name,
      isGroup: 'group',
      groupOwner: group.owner,
      members: userIds
    });
  } catch (error) {
    console.error('创建群聊失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});


// 获取好友聊天
app.get('/friend-messages/:user1/:user2', async (req, res) => {
  const { user1, user2 } = req.params;
  console.log('friend get:', user1, user2)
  try {
    const result = await pool.query(`
      SELECT fm.*, u.name AS sender_name
      FROM friend_message fm
      JOIN users u ON fm.sender = u.id
      WHERE (sender = $1 AND receiver = $2) OR (sender = $2 AND receiver = $1)
      ORDER BY time
    `, [user1, user2]);

    res.json(result.rows); // [{ text: "...", sender_name: "我", ... }]
  } catch (e) {
    res.status(500).send('获取好友消息失败: ' + e);
  }
});

// 发送好友聊天
app.post('/friend-messages', async (req, res) => {
  const { sender, receiver, text } = req.body; // 传入用户 ID
  console.log('friend post:', sender, receiver)
  try {
    const result = await pool.query(`
      INSERT INTO friend_message (sender, receiver, text)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [sender, receiver, text]);
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).send('发送好友消息失败: ' + e);
  }
});

// 获取群聊信息
app.get('/group-messages/:groupId', async (req, res) => {
  const { groupId } = req.params;
  console.log('group get:', groupId)

  try {
    const result = await pool.query(`
      SELECT gm.*, u.name AS sender_name
      FROM group_message gm
      JOIN users u ON gm.sender = u.id
      WHERE group_id = $1
      ORDER BY time
    `, [groupId]);
    res.json(result.rows);
  } catch (e) {
    res.status(500).send('获取群聊消息失败: ' + e);
  }
});

// 发送群聊信息
app.post('/group-messages', async (req, res) => {
  const { group_id, sender, text } = req.body; // sender 是用户 ID
  console.log('group post:', sender, text)
  try {
    const result = await pool.query(`
      INSERT INTO group_message (group_id, sender, text)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [group_id, sender, text]);

    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).send('发送群聊消息失败: ' + e);
  }
});

app.listen(3000, () => {
  console.log('评论服务运行于 http://localhost:3000');
});
