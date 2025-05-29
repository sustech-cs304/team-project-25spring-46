import supabase from '../../src/supabaseClient';

// 定义基本类型
interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface Message {
    text: string;
    time: string;
    sender: number;
    users: User;
}

// 类型守卫函数
function isUser(obj: any): obj is User {
    return obj && 
           typeof obj.id === 'number' && 
           typeof obj.name === 'string' && 
           typeof obj.email === 'string' && 
           typeof obj.role === 'string';
}

function isMessage(obj: any): obj is Message {
    return obj && 
           typeof obj.text === 'string' && 
           typeof obj.time === 'string' && 
           typeof obj.sender === 'number' && 
           isUser(obj.users);
}

describe('Chat Service Tests', () => {
    // 测试数据
    const testUsers = [
        { name: 'Test User 1', email: 'test1@example.com', password: 'password1', role: 'student' },
        { name: 'Test User 2', email: 'test2@example.com', password: 'password2', role: 'student' }
    ];
    let userId1: number;
    let userId2: number;
    let groupId: number;

    // 在每个测试前设置测试数据
    beforeAll(async () => {
        // 清理旧数据
        await supabase.from('group_message').delete().neq('id', 0);
        await supabase.from('friend_message').delete().neq('id', 0);
        await supabase.from('group_members').delete().neq('group_id', 0);
        await supabase.from('groups').delete().neq('id', 0);
        await supabase.from('friends').delete().neq('user_id', 0);
        await supabase.from('users').delete().neq('id', 0);

        // 创建测试用户
        const { data: user1 } = await supabase.from('users').insert(testUsers[0]).select().single();
        const { data: user2 } = await supabase.from('users').insert(testUsers[1]).select().single();

        if (!user1 || !user2) {
            throw new Error('Failed to create test users');
        }

        userId1 = user1.id;
        userId2 = user2.id;

        // 创建好友关系
        await supabase.from('friends').insert([
            { user_id: userId1, friend_id: userId2 },
            { user_id: userId2, friend_id: userId1 }
        ]);

        // 创建群组
        const { data: group } = await supabase.from('groups').insert({
            name: 'Test Group',
            owner: userId1
        }).select().single();

        if (!group) {
            throw new Error('Failed to create test group');
        }

        groupId = group.id;

        // 添加群组成员
        await supabase.from('group_members').insert([
            { group_id: groupId, member_id: userId1 },
            { group_id: groupId, member_id: userId2 }
        ]);
    });

    // 在每个测试后清理数据
    afterAll(async () => {
        await supabase.from('group_message').delete().neq('id', 0);
        await supabase.from('friend_message').delete().neq('id', 0);
        await supabase.from('group_members').delete().neq('group_id', 0);
        await supabase.from('groups').delete().neq('id', 0);
        await supabase.from('friends').delete().neq('user_id', 0);
        await supabase.from('users').delete().neq('id', 0);
    });

    // 测试好友消息功能
    describe('Friend Messages', () => {
        test('should send and receive friend messages', async () => {
            // 发送消息
            const { data: message, error: sendError } = await supabase
                .from('friend_message')
                .insert({
                    sender: userId1,
                    receiver: userId2,
                    text: 'Hello from user 1!'
                })
                .select()
                .single();

            expect(sendError).toBeNull();
            expect(message).toBeDefined();
            expect(message?.text).toBe('Hello from user 1!');

            // 获取消息
            const { data: messages, error: getError } = await supabase
                .from('friend_message')
                .select(`
                    text,
                    time,
                    sender,
                    users:sender (id, name, email, role)
                `)
                .or(`sender.eq.${userId1},sender.eq.${userId2}`)
                .or(`receiver.eq.${userId1},receiver.eq.${userId2}`)
                .order('time', { ascending: true });

            expect(getError).toBeNull();
            expect(messages).not.toBeNull();
            expect(messages).toHaveLength(1);
            const typedMessages = ((messages || []).filter(isMessage) as unknown) as Message[];
            expect(typedMessages[0].text).toBe('Hello from user 1!');
            expect(typedMessages[0].users.name).toBe('Test User 1');
        });
    });

    // 测试群组消息功能
    describe('Group Messages', () => {
        test('should send and receive group messages', async () => {
            // 发送群组消息
            const { data: message, error: sendError } = await supabase
                .from('group_message')
                .insert({
                    group_id: groupId,
                    sender: userId1,
                    text: 'Hello group!'
                })
                .select()
                .single();

            expect(sendError).toBeNull();
            expect(message).toBeDefined();
            expect(message?.text).toBe('Hello group!');

            // 获取群组消息
            const { data: messages, error: getError } = await supabase
                .from('group_message')
                .select(`
                    text,
                    time,
                    sender,
                    users:sender (id, name, email, role)
                `)
                .eq('group_id', groupId)
                .order('time', { ascending: true });

            expect(getError).toBeNull();
            expect(messages).not.toBeNull();
            expect(messages).toHaveLength(1);
            const typedMessages = ((messages || []).filter(isMessage) as unknown) as Message[];
            expect(typedMessages[0].text).toBe('Hello group!');
            expect(typedMessages[0].users.name).toBe('Test User 1');
        });
    });
}); 