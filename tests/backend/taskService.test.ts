import supabase from '../../src/supabaseClient';

// 定义基本类型
interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface Task {
    id: number;
    title: string;
    details: string | null;
    due_date: string;
    status: 'completed' | 'upcoming' | 'inprogress' | 'need review';
    priority: 'low' | 'medium' | 'high';
    completion: boolean;
    group_id: number | null;
    assignee_id: number | null;
}

// 类型守卫函数
function isUser(obj: any): obj is User {
    return obj && 
           typeof obj.id === 'number' && 
           typeof obj.name === 'string' && 
           typeof obj.email === 'string' && 
           typeof obj.role === 'string';
}

function isTask(obj: any): obj is Task {
    return obj && 
           typeof obj.id === 'number' &&
           typeof obj.title === 'string' &&
           (obj.details === null || typeof obj.details === 'string') &&
           typeof obj.due_date === 'string' &&
           ['completed', 'upcoming', 'inprogress', 'need review'].includes(obj.status) &&
           ['low', 'medium', 'high'].includes(obj.priority) &&
           typeof obj.completion === 'boolean' &&
           (obj.group_id === null || typeof obj.group_id === 'number') &&
           (obj.assignee_id === null || typeof obj.assignee_id === 'number');
}

describe('Task Service Tests', () => {
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
        await supabase.from('tasks').delete().neq('id', 0);
        await supabase.from('group_members').delete().neq('group_id', 0);
        await supabase.from('groups').delete().neq('id', 0);
        await supabase.from('users').delete().neq('id', 0);

        // 创建测试用户
        const { data: user1 } = await supabase.from('users').insert(testUsers[0]).select().single();
        const { data: user2 } = await supabase.from('users').insert(testUsers[1]).select().single();

        if (!user1 || !user2) {
            throw new Error('Failed to create test users');
        }

        userId1 = user1.id;
        userId2 = user2.id;

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
        await supabase.from('tasks').delete().neq('id', 0);
        await supabase.from('group_members').delete().neq('group_id', 0);
        await supabase.from('groups').delete().neq('id', 0);
        await supabase.from('users').delete().neq('id', 0);
    });

    // 测试任务创建功能
    describe('Task Creation', () => {
        test('should create a new task', async () => {
            const taskData = {
                title: 'Test Task',
                details: 'This is a test task',
                due_date: new Date().toISOString(),
                status: 'upcoming' as const,
                priority: 'medium' as const,
                group_id: groupId,
                assignee_id: userId1
            };

            const { data: task, error } = await supabase
                .from('tasks')
                .insert([taskData])
                .select()
                .single();

            expect(error).toBeNull();
            expect(task).toBeDefined();
            expect(task?.title).toBe('Test Task');
            expect(task?.details).toBe('This is a test task');
            expect(task?.status).toBe('upcoming');
            expect(task?.priority).toBe('medium');
            expect(task?.completion).toBe(false);
            expect(task?.group_id).toBe(groupId);
            expect(task?.assignee_id).toBe(userId1);
        });
    });

    // 测试任务更新功能
    describe('Task Update', () => {
        test('should update task status and completion', async () => {
            // 先创建一个任务
            const { data: task } = await supabase
                .from('tasks')
                .insert([{
                    title: 'Task to Update',
                    details: 'This task will be updated',
                    due_date: new Date().toISOString(),
                    status: 'upcoming',
                    priority: 'medium',
                    group_id: groupId,
                    assignee_id: userId1
                }])
                .select()
                .single();

            expect(task).toBeDefined();

            // 更新任务
            const { data: updatedTask, error } = await supabase
                .from('tasks')
                .update({
                    status: 'completed',
                    completion: true
                })
                .eq('id', task.id)
                .select()
                .single();

            expect(error).toBeNull();
            expect(updatedTask).toBeDefined();
            expect(updatedTask?.status).toBe('completed');
            expect(updatedTask?.completion).toBe(true);
        });
    });

    // 测试任务删除功能
    describe('Task Deletion', () => {
        test('should delete a task', async () => {
            // 先创建一个任务
            const { data: task } = await supabase
                .from('tasks')
                .insert([{
                    title: 'Task to Delete',
                    details: 'This task will be deleted',
                    due_date: new Date().toISOString(),
                    status: 'upcoming',
                    priority: 'medium',
                    group_id: groupId,
                    assignee_id: userId1
                }])
                .select()
                .single();

            expect(task).toBeDefined();

            // 删除任务
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', task.id);

            expect(error).toBeNull();

            // 验证任务已被删除
            const { data: deletedTask } = await supabase
                .from('tasks')
                .select()
                .eq('id', task.id)
                .single();

            expect(deletedTask).toBeNull();
        });
    });
}); 