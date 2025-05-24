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

app.get('/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT username FROM users ORDER BY id
    `);
    res.json(result.rows); // 返回 [{ username: "我" }, { username: "Alice" }, ...]
  } catch (e) {
    res.status(500).send('获取用户列表失败: ' + e);
  }
});


// 获取用户好友列表
app.get('/friend-chats/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(`
      SELECT u.id::text AS id, u.username AS name, false AS is_group
      FROM friends f
      JOIN users u ON u.id = f.friend_id
      WHERE f.user_id = $1
    `, [userId]);

    res.json(result.rows); // 返回 [{ id: '2', name: 'Alice', is_group: false }, ...]
  } catch (e) {
    res.status(500).send('获取好友聊天失败: ' + e);
  }
});



// 获取群聊列表
app.get('/group-chats/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(`
      SELECT g.id::text, g.name, true AS is_group
      FROM groups g
      JOIN group_members gm ON gm.group_id = g.id
      WHERE gm.member_id = $1
    `, [userId]);

    res.json(result.rows); // 返回 [{ id: '1', name: '编程群', is_group: true }, ...]
  } catch (e) {
    res.status(500).send('获取群聊失败: ' + e);
  }
});


app.get('/chats/:username', async (req, res) => {
  const { username } = req.params;
  try {
    // 群聊
    const groupChats = await pool.query(`
      SELECT g.id::text, g.name, true AS is_group
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      JOIN users u ON gm.member_id = u.id
      WHERE u.username = $1
    `, [username]);

    // 好友私聊（基于消息记录）
    const friendChats = await pool.query(`
      SELECT DISTINCT
        CASE
          WHEN sender = $1 THEN receiver
          ELSE sender
        END AS friend_name
      FROM friend_message
      WHERE sender = $1 OR receiver = $1
    `, [username]);

    const formattedFriendChats = friendChats.rows.map(row => ({
      id: `${username}-${row.friend_name}`, // 自定义id
      name: `${username} 和 ${row.friend_name}`,
      is_group: false
    }));

    const formattedGroupChats = groupChats.rows.map(row => ({
      id: row.id,
      name: row.name,
      is_group: true
    }));

    res.json([...formattedGroupChats, ...formattedFriendChats]);
  } catch (e) {
    res.status(500).send('获取聊天失败: ' + e);
  }
});


// 获取聊天记录
app.get('/friend-messages/:user1/:user2', async (req, res) => {
  const { user1, user2 } = req.params;
  try {
    const result = await pool.query(`
      SELECT * FROM friend_message
      WHERE (sender = $1 AND receiver = $2) OR (sender = $2 AND receiver = $1)
      ORDER BY time
    `, [user1, user2]);
    res.json(result.rows);
  } catch (e) {
    res.status(500).send('获取好友消息失败: ' + e);
  }
});

app.post('/friend-messages', async (req, res) => {
  const { sender, receiver, text } = req.body;
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

app.get('/group-messages/:groupId', async (req, res) => {
  const { groupId } = req.params;
  try {
    const result = await pool.query(`
      SELECT * FROM group_message
      WHERE group_id = $1
      ORDER BY time
    `, [groupId]);
    res.json(result.rows);
  } catch (e) {
    res.status(500).send('获取群聊消息失败: ' + e);
  }
});

app.post('/group-messages', async (req, res) => {
  const { group_id, sender, text } = req.body;
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




// // 添加好友
// app.post('/friends', async (req, res) => {
//   const { userId, friendId } = req.body;
//   try {
//     await pool.query('INSERT INTO user_friends (user_id, friend_id) VALUES ($1, $2), ($2, $1)',
//       [userId, friendId]);
//     res.status(200).send('好友添加成功');
//   } catch (e) {
//     res.status(500).send('添加好友失败: ' + e);
//   }
// });




// // 获取用户聊天列表
// app.get('/chats/:userId', async (req, res) => {
//   const { userId } = req.params;
//   try {
//     const result = await pool.query(`
//       SELECT c.id, c.name, c.is_group, c.owner_id
//       FROM chats c
//       JOIN chat_members cm ON c.id = cm.chat_id
//       WHERE cm.user_id = $1
//     `, [userId]);
//     res.json(result.rows);
//   } catch (e) {
//     res.status(500).send('获取聊天列表失败: ' + e);
//   }
// });

// // 发送消息
// app.post('/messages', async (req, res) => {
//   const { chatId, senderId, content } = req.body;
//   try {
//     const result = await pool.query(
//       'INSERT INTO messages (chat_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
//       [chatId, senderId, content]
//     );
//     res.status(200).json(result.rows[0]);
//   } catch (e) {
//     res.status(500).send('发送消息失败: ' + e);
//   }
// });

// // 获取聊天消息
// app.get('/messages/:chatId', async (req, res) => {
//   const { chatId } = req.params;
//   try {
//     const result = await pool.query(`
//       SELECT m.id, m.content, m.sent_at, u.username as sender_name
//       FROM messages m
//       JOIN users u ON m.sender_id = u.id
//       WHERE m.chat_id = $1
//       ORDER BY m.sent_at
//     `, [chatId]);
//     res.json(result.rows);
//   } catch (e) {
//     res.status(500).send('获取消息失败: ' + e);
//   }
// });

// // 添加群聊成员接口
// app.post('/chats/:chatId/members', async (req, res) => {
//   const { chatId } = req.params;
//   const { userIds } = req.body; // 接收 userIds: number[]

//   try {
//     const insertPromises = userIds.map((userId: number) =>
//       pool.query('INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2)', [chatId, userId])
//     );

//     await Promise.all(insertPromises);
//     res.status(200).send('成员添加成功');
//   } catch (e) {
//     res.status(500).send('添加成员失败: ' + e);
//   }
// });


app.listen(3000, () => {
  console.log('评论服务运行于 http://localhost:3000');
});
