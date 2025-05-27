import express from 'express';
import { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import supabase, { testSupabaseConnection } from './supabaseClient';

const app = express();
app.use(cors()); // 允许跨域
app.use(bodyParser.json());

// // 新建评论
// app.post('/comments', async (req, res) => {
//   const { file_id, page_number, position, type, content, extra, author } = req.body;
//   try {
//     const result = await pool.query(`
//       INSERT INTO comments(file_id, page_number, position, type, content, extra, author)
//       VALUES ($1, $2, $3, $4, $5, $6, $7)
//     `, [file_id, page_number, position, type, content, extra, author]);
//     res.status(200).send('评论添加成功');
//   } catch (e) {
//     res.status(500).send('服务器错误: ' + e);
//   }
// });

// // 获取评论
// app.get('/comments', async (req, res) => {
//   const { file_id, page } = req.query;
//   const page_number = page ? parseInt(page as string) : null;
//   try {
//     const query = page_number
//       ? 'SELECT * FROM comments WHERE file_id = $1 AND page_number = $2'
//       : 'SELECT * FROM comments WHERE file_id = $1';
//     const values = page_number ? [file_id, page_number] : [file_id];
//     const result = await pool.query(query, values);
//     res.json(result.rows);
//   } catch (e) {
//     res.status(500).send('获取失败: ' + e);
//   }
// });

// // 删除指定 ID 的评论
// app.delete('/comments/:id', async (req, res) => {
//   const { id } = req.params;
//   try {
//     await pool.query('DELETE FROM comments WHERE id = $1', [id]);
//     res.status(200).send('评论已删除');
//   } catch (e) {
//     res.status(500).send('删除失败: ' + e);
//   }
// });

// // 删除指定文件的所有评论
// app.delete('/comments/by-file/:file_id', async (req, res) => {
//   const { file_id } = req.params;
//   try {
//     await pool.query('DELETE FROM comments WHERE file_id = $1', [file_id]);
//     res.status(200).send('该文件的所有评论已删除');
//   } catch (e) {
//     res.status(500).send('删除失败: ' + e);
//   }
// });

// 获取所有用户
app.get('/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .order('id', { ascending: true });

    if (error) throw error;

    console.log('users: ', data)
    res.json(data);
  } catch (e) {
    res.status(500).send('获取用户列表失败: ' + e);
  }
});

// 删除用户
app.delete('/users/:id', async (req, res) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    console.log('无效的用户 ID');
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
      .select(); // 返回删除的记录

    if (error) throw error;

    if (data.length === 0) {
      console.log('用户不存在');
    } ~

      res.json({ message: '用户删除成功', user: data[0] });
  } catch (e) {
    console.error('Supabase 删除用户失败:', e);
    res.status(500).json({ error: '服务器错误' });
  }
});


// 获取用户好友列表
app.get('/friend-chats/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const { data, error } = await supabase
      .from('friends')
      .select(`
        friend_id,
        users:friend_id (id, name)
      `)
      .eq('user_id', userId);

    if (error) throw error;

    const friends = data.map((item: any) => ({
      id: item.users.id,
      name: item.users.name,
      type: 'friend'
    }));

    console.log('friends: ', friends);
    res.json(friends);
  } catch (e) {
    console.error(e);
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
    const { error: error1 } = await supabase.from('friends').insert([
      { user_id: currentUserId, friend_id: friendId },
      { user_id: friendId, friend_id: currentUserId }
    ]);

    if (error1 && !error1.message.includes('duplicate key')) {
      throw error1; // 如果是其他错误则抛出
    }

    // 查询 friendId 对应的用户名
    const { data, error: error2 } = await supabase
      .from('users')
      .select('name')
      .eq('id', friendId)
      .single();

    if (error2) throw error2;

    const friendName = data?.name || `用户${friendId}`;

    console.log('new friend: ', friendName)
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
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        group_id,
        groups (
          id,
          name,
          owner
        )
      `)
      .eq('member_id', userId);

    if (error) throw error;

    // 整理格式：将 group_members + groups 转为纯 group 列表
    const groups = data.map((item: any) => ({
      id: item.groups.id,
      name: item.groups.name,
      type: 'group',
      groupOwner: item.groups.owner
    }));

    console.log('group: ', groups);
    res.json(groups);
  } catch (e) {
    console.error(e);
    res.status(500).send('获取群聊失败: ' + e);
  }
});

// 创建群聊
app.post('/createGroup', async (req: Request, res: Response) => {
  const { name, userIds, ownerId } = req.body;

  // ✅ 1. 参数校验
  if (!name || !Array.isArray(userIds) || userIds.length < 2 || !ownerId) {
    console.log('缺少群聊名称、成员列表或群主 ID');
  }

  try {
    // ✅ 2. 插入 groups 表
    const { data: groupData, error: insertGroupError } = await supabase
      .from('groups')
      .insert([{ name, owner: ownerId }])
      .select()
      .single();

    if (insertGroupError) throw insertGroupError;
    const group = groupData;

    // ✅ 3. 插入 group_members（防止重复）
    const memberRows = userIds.map((userId: number) => ({
      group_id: group.id,
      member_id: userId,
    }));

    const { error: insertMembersError } = await supabase
      .from('group_members')
      .upsert(memberRows, { onConflict: 'group_id,member_id' }); // ✅ 防止主键冲突

    if (insertMembersError) throw insertMembersError;

    // ✅ 4. 查询用户信息
    const { data: memberUsers, error: userQueryError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .in('id', userIds);

    if (userQueryError) throw userQueryError;

    console.log()
    // ✅ 5. 返回前端格式一致的 Chat 对象
    res.json({
      id: group.id,
      name: group.name,
      type: 'group',
      groupOwner: group.owner,
      members: memberUsers
    });
  } catch (error) {
    console.error('创建群聊失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});




// 获取好友聊天
app.get('/friend-messages/:userId/:friendId', async (req, res) => {
  const { userId, friendId } = req.params;

  try {
    const { data, error } = await supabase
      .from('friend_message')
      .select(`
        text,
        time,
        sender,
        users:sender (id, name, email, role)
      `)
      .or(`sender.eq.${userId},sender.eq.${friendId}`)
      .or(`receiver.eq.${userId},receiver.eq.${friendId}`)
      .order('time', { ascending: true });

    if (error) throw error;

    const messages = data.map((msg: any) => ({
      text: msg.text,
      time: msg.time,
      sender_name: msg.users?.name || `用户${msg.sender}`,
      sender_id: msg.users?.id || msg.sender,
      sender_email: msg.users?.email || '',
      sender_role: msg.users?.role || ''
    }));

    res.json(messages);
  } catch (e) {
    res.status(500).send('获取好友消息失败: ' + e);
  }
});

// 发送好友聊天
app.post('/friend-messages', async (req, res) => {
  const { sender, receiver, text } = req.body; // 传入用户 ID
  console.log('friend post:', sender, receiver)
  try {
    const { data, error } = await supabase
      .from('friend_message')
      .insert([
        { sender, receiver, text }
      ])
      .select()  // 等价于 RETURNING *
      .single(); // 只返回一条

    if (error) {
      throw error;
    }

    console.log('send friend message: ', data)
    res.json(data);
  } catch (e) {
    res.status(500).send('发送好友消息失败: ' + e);
  }
});

// 获取群聊信息
app.get('/group-messages/:groupId', async (req, res) => {
  const { groupId } = req.params;
  console.log('group get:', groupId);

  try {
    const { data, error } = await supabase
      .from('group_message')
      .select(`
        text,
        time,
        sender,
        users:sender (id, name, email, role)
      `)
      .eq('group_id', groupId)
      .order('time', { ascending: true });

    if (error) throw error;

    // 格式化为前端需要的结构
    const messages = data.map((msg: any) => ({
      text: msg.text,
      time: msg.time,
      sender_name: msg.users?.name || `用户${msg.sender}`,
      sender_id: msg.users?.id || msg.sender,
      sender_email: msg.users?.email || '',
      sender_role: msg.users?.role || ''
    }));

    console.log('get group message: ', messages);
    res.json(messages);
  } catch (e) {
    res.status(500).send('获取群聊消息失败: ' + e);
  }
});


// 发送群聊信息
app.post('/group-messages', async (req, res) => {
  const { group_id, sender, text } = req.body; // sender 是用户 ID
  console.log('group post:', sender, text)
  try {
    const { data, error } = await supabase
      .from('group_message')
      .insert([
        { group_id, sender, text }
      ])
      .select()  // 等价于 RETURNING *
      .single(); // 只插入一条，直接返回对象

    if (error) {
      throw error;
    }

    console.log('send group message: ', data)
    res.json(data);
  } catch (e) {
    res.status(500).send('发送群聊消息失败: ' + e);
  }
});

app.listen(3000, () => {
  console.log('评论服务运行于 http://localhost:3000');
});
