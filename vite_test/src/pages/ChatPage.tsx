import React, {useState, useEffect} from 'react';
import Modal from 'react-modal';
import './ChatPage.css';
import {getVsCodeApi} from '../vscodeApi';

const vscode = getVsCodeApi();

// Type definitions
type Chat = {
    id: string;
    name: string;
    messages?: Message[];
    type: 'group' | 'friend';
    members?: User[];
    groupOwner?: string;
};

type User = {
    id: string;
    name: string;
    email?: string;
    role?: string;
};

interface Message {
    sender_name: string;
    sender_id: string;
    sender_email: string;
    sender_role: string;
    text: string;
    time: string;
}

interface Task {
    id: number;
    title: string;
    details: string | null;
    due_date: string;
    status: string;
    priority: string;
    completion: boolean;
    group_id: number | null;
    assignee_id: number | null;
    group_name: string | null;
    assignee_name: string | null;
}

Modal.setAppElement('#root');

const ChatPage: React.FC = () => {
    // State management
    const [chats, setChats] = useState<Chat[]>([]);
    const [userList, setUserList] = useState<User[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [newMessage, setNewMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDetails, setNewTaskDetails] = useState('');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('medium');
    const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');
    const [groupMembers, setGroupMembers] = useState<User[]>([]);
    const [showGroupMembersModal, setShowGroupMembersModal] = useState(false);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'friend' | 'group' | null>(null);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [groupName, setGroupName] = useState('');
  useEffect(() => {
    // 初始化加载用户 ID 和用户列表
    vscode?.postMessage({ command: 'getCurrentUserid' });
    vscode?.postMessage({ command: 'getUsers' });
  }, []); // 只在初次加载时运行

    useEffect(() => {
        // 监听 message 事件处理各种结果
        const handleMessage = (e: MessageEvent) => {
            const msg = e.data;

            switch (msg.command) {
                case 'currentUseridResult':
                    if (msg.success && msg.userId) {
                        setCurrentUserId(msg.userId.toString());
                        loadUserChats(msg.userId.toString());
                    }
                    setIsLoading(false);
                    break;

                case 'getUsersResult':
                    if (msg.success) {
                        setUserList(msg.users);
                    }
                    break;

                case 'getFriendsListResult':
                    if (msg.success) {
                        setChats(prevChats => {
                            const groupChats = prevChats.filter(chat => chat.type === 'group');
                            return [...groupChats, ...msg.friends];
                        });
                    }
                    break;

                case 'getGroupListResult':
                    if (msg.success) {
                        // 确保每个群组都包含成员信息
                        const groupsWithMembers = msg.groups.map((group: Chat) => ({
                            ...group,
                            members: group.members || []
                        }));
                        setChats(prevChats => {
                            const friendChats = prevChats.filter(chat => chat.type === 'friend');
                            return [...friendChats, ...groupsWithMembers];
                        });
                    }
                    break;

                case 'getFriendMessagesResult':
                case 'getGroupMessagesResult':
                    if (msg.success && selectedChat) {
                        // 保持现有的成员信息
                        const currentMembers = selectedChat.members || [];
                        setSelectedChat(prev => ({
                            ...prev!,
                            messages: msg.messages.map((m: Message) => ({
                                ...m,
                                time: new Date(m.time).toLocaleTimeString().slice(0, 5)
                            })),
                            members: currentMembers
                        }));
                    }
                    break;

                case 'newFriendResult':
                case 'createGroupResult':
                    if (msg.success) {
                        console.log(msg.group)
                        // 确保群组成员信息被正确保存
                        const groupWithMembers = {
                            ...msg.group,
                            members: msg.group.members || []
                        };
                        setChats(prev => [...prev, groupWithMembers]);
                        setSelectedChat(groupWithMembers);
                        setIsModalOpen(false);
                        setSelectedUsers([]);
                        setGroupName('');

                        // ✅ 添加重新加载用户群聊列表（解决"被动进群后界面不刷新"问题）
                        if (currentUserId) {
                            loadUserChats(currentUserId);
                        }
                    }
                    break;


                case 'sendFriendsMessageResult':
                case 'sendGroupMessageResult':
                    if (msg.success) {
                        if (selectedChat) {
                            if (selectedChat.type === 'group') {
                                vscode?.postMessage({
                                    command: 'getGroupMessages',
                                    groupId: selectedChat.id
                                });
                            } else {
                                vscode?.postMessage({
                                    command: 'getFriendMessages',
                                    userId: currentUserId,
                                    friendId: selectedChat.id
                                });
                            }
                        }
                        setNewMessage('');
                    }
                    break;
                case 'getGroupUsersResult':
                    if (msg.success && msg.users) {
                        setGroupMembers(msg.users); // 重用已存在的 selectedUsers 状态
                        setShowGroupMembersModal(true);
                    }
                    break;
                case 'getGroupTasksResult':
                    if (msg.success) {
                        setTasks(msg.tasks);
                    }
                    break;

                case 'createTaskResult':
                case 'updateTaskResult':
                case 'deleteTaskResult':
                    if (msg.success && selectedChat?.type === 'group') {
                        vscode?.postMessage({
                            command: 'getGroupTasks',
                            groupId: selectedChat.id
                        });
                    }
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [selectedChat, currentUserId]); // 这里只监听必要项

    useEffect(() => {
        // 如果 selectedChat 改变了，主动请求消息记录
        if (!selectedChat || !currentUserId) return;

        if (selectedChat.type === 'group') {
            vscode?.postMessage({command: 'getGroupMessages', groupId: selectedChat.id});
        } else {
            vscode?.postMessage({
                command: 'getFriendMessages',
                userId: currentUserId,
                friendId: selectedChat.id
            });
        }
    }, [selectedChat, currentUserId]);

    // 自动刷新聊天记录
    useEffect(() => {
        if (!selectedChat || !currentUserId) return;

        const interval = setInterval(() => {
            if (selectedChat.type === 'group') {
                vscode?.postMessage({command: 'getGroupMessages', groupId: selectedChat.id});
            } else {
                vscode?.postMessage({
                    command: 'getFriendMessages',
                    userId: currentUserId,
                    friendId: selectedChat.id
                });
            }
        }, 1000); // 每1秒刷新一次

        return () => clearInterval(interval); // 清理定时器
    }, [selectedChat, currentUserId]);

    useEffect(() => {
        // 如果选中的是群聊，加载任务列表和群组成员
        if (selectedChat?.type === 'group') {
            vscode?.postMessage({
                command: 'getGroupTasks',
                groupId: selectedChat.id
            });
            // 获取群组成员
            vscode?.postMessage({
                command: 'getGroupUsers',
                groupId: selectedChat.id
            });
        } else {
            setTasks([]);
            setGroupMembers([]);
        }
    }, [selectedChat]);

    const loadUserChats = (userId: string) => {
        vscode?.postMessage({command: 'getFriendsList', userId});
        vscode?.postMessage({command: 'getGroupList', userId});
    };

    const selectChat = (chat: Chat) => {
        // 如果是群聊，确保有成员信息
        if (chat.type === 'group' && (!chat.members || chat.members.length === 0)) {
            // 从 userList 中获取群组成员信息
            const groupMembers = userList.filter(user =>
                chat.members?.some(member => member.id === user.id)
            );
            chat = {
                ...chat,
                members: groupMembers
            };
        }
        setSelectedChat(chat);
        if (chat.type === 'group') {
            vscode?.postMessage({command: 'getGroupMessages', groupId: chat.id});
        } else {
            vscode?.postMessage({
                command: 'getFriendMessages',
                userId: currentUserId,
                friendId: chat.id
            });
        }
    };

    const handleSendMessage = () => {
        if (!newMessage.trim() || !selectedChat || !currentUserId) return;

        if (selectedChat.type === 'group') {
            vscode?.postMessage({
                command: 'sendGroupMessage',
                group_id: selectedChat.id,
                sender: parseInt(currentUserId),
                text: newMessage.trim()
            });
        } else {
            vscode?.postMessage({
                command: 'sendFriendsMessage',
                sender: parseInt(currentUserId),
                receiver: parseInt(selectedChat.id),
                text: newMessage.trim()
            });
        }
    };

    const openModal = (type: 'friend' | 'group') => {
        setModalType(type);
        setIsModalOpen(true);
    };

    const handleUserSelection = (user: User) => {
        if (modalType === 'friend') {
            setSelectedUsers([user]);
        } else {
            setSelectedUsers(prev => {
                const isSelected = prev.some(u => u.id === user.id);
                if (isSelected) {
                    return prev.filter(u => u.id !== user.id);
                }
                return [...prev, user];
            });
        }
    };

    const handleCreateChat = () => {
        if (!currentUserId) return;

        if (modalType === 'friend' && selectedUsers.length === 1) {
            vscode?.postMessage({
                command: 'newFriend',
                currentUserId: currentUserId,
                friendId: selectedUsers[0].id
            });
        } else if (modalType === 'group' && selectedUsers.length > 0 && groupName) {
            vscode?.postMessage({
                command: 'createGroup',
                name: groupName,
                userIds: [currentUserId, ...selectedUsers.map(u => u.id)].map(id => Number(id)),
                ownerId: currentUserId
            });
        }
        closeModal();
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedUsers([]);
        setGroupName('');
    };

    const handleCreateTask = () => {
        if (!selectedChat || !currentUserId) return;

        console.log('Creating task with data:', {
            title: newTaskTitle,
            details: newTaskDetails,
            due_date: newTaskDueDate,
            priority: newTaskPriority,
            status: 'upcoming',
            group_id: parseInt(selectedChat.id),
            assignee_id: newTaskAssignee ? parseInt(newTaskAssignee) : parseInt(currentUserId)
        });

        vscode?.postMessage({
            command: 'createTask',
            data: {
                title: newTaskTitle,
                details: newTaskDetails,
                due_date: newTaskDueDate,
                priority: newTaskPriority,
                status: 'upcoming',
                group_id: parseInt(selectedChat.id),
                assignee_id: newTaskAssignee ? parseInt(newTaskAssignee) : parseInt(currentUserId)
            }
        });

        // Reset form
        setNewTaskTitle('');
        setNewTaskDetails('');
        setNewTaskDueDate('');
        setNewTaskPriority('medium');
        setNewTaskAssignee('');
        setIsTaskModalOpen(false);
    };

    const handleUpdateTask = (task: Task) => {
        setEditingTask(task);
        setNewTaskTitle(task.title);
        setNewTaskDetails(task.details || '');
        setNewTaskDueDate(task.due_date);
        setNewTaskPriority(task.priority);
        setNewTaskAssignee(task.assignee_id?.toString() || '');
        setIsTaskModalOpen(true);
    };

    const handleSaveTaskUpdate = () => {
        if (!editingTask) return;

        vscode?.postMessage({
            command: 'updateTask',
            data: {
                id: editingTask.id,
                title: newTaskTitle,
                details: newTaskDetails,
                due_date: newTaskDueDate,
                priority: newTaskPriority,
                assignee_id: newTaskAssignee ? parseInt(newTaskAssignee) : editingTask.assignee_id
            }
        });

        // Reset form
        setEditingTask(null);
        setNewTaskTitle('');
        setNewTaskDetails('');
        setNewTaskDueDate('');
        setNewTaskPriority('medium');
        setNewTaskAssignee('');
        setIsTaskModalOpen(false);
    };

    const handleDeleteTask = (taskId: number) => {
        vscode?.postMessage({
            command: 'deleteTask',
            taskId: taskId
        });
    };

    if (isLoading) {
        return <div className="loading">Loading...</div>;
    }

    if (!currentUserId) {
        return <div className="error">Please login first</div>;
    }

    return (
        <div className="chat-page">
            <div className="chat-list">
                <div className="button-group">
                    <button onClick={() => openModal('friend')}>Add Friend</button>
                    <br></br>
                    <button onClick={() => openModal('group')}>Create Group</button>
                </div>
                {chats.map(chat => (
                    <div
                        key={chat.id}
                        className={`chat-item ${selectedChat?.id === chat.id ? 'selected' : ''}`}
                        onClick={() => selectChat(chat)}
                    >
                        {chat.name}
                    </div>
                ))}
            </div>

            <div className="chat-content">
                {selectedChat ? (
                    <>
                        <div className="chat-header">
                            <h3>{selectedChat.name}</h3>
                            {selectedChat.type === 'group' && (
                                <button
                                    className="view-members-button"
                                    onClick={() => vscode?.postMessage({ command: 'getGroupUsers', groupId: selectedChat.id })}
                                >
                                    查看群成员
                                </button>
                            )}
                        </div>
                        <div className="messages">
                            {selectedChat.messages?.map((message, index) => (
                                <div
                                    key={index}
                                    className={`message ${message.sender_id === currentUserId ? 'sent' : 'received'}`}
                                >
                                    <div className="message-content">
                                        <div className="message-sender">{message.sender_name}</div>
                                        <div className="message-text">{message.text}</div>
                                        <div className="message-time">{message.time}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="message-input">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button onClick={handleSendMessage}>Send</button>
                        </div>

                        {/* Task List Section - Only show for group chats */}
                        {selectedChat.type === 'group' && (
                            <div className="task-section">
                                <div className="task-header">
                                    <h3>Group Tasks</h3>
                                    <button className="task-header-button" onClick={() => setIsTaskModalOpen(true)}>Create Task</button>
                                </div>
                                <div className="task-list">
                                    {tasks.map(task => (
                                        <div key={task.id} className="task-item">
                                            <div className="task-info">
                                                <h4>{task.title}</h4>
                                                <p>{task.details}</p>
                                                <div className="task-meta">
                                                    <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                                                    <span>Priority: {task.priority}</span>
                                                    <span>Assignee: {task.assignee_name || 'Unassigned'}</span>
                                                </div>
                                            </div>
                                            <div className="task-actions">
                                                <button className="task-action-button" onClick={() => handleUpdateTask(task)}>Edit</button>
                                                <button className="task-action-button" onClick={() => handleDeleteTask(task.id)}>Delete</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="no-chat-selected">Select a chat to start messaging</div>
                )}
            </div>

            {/* Task Modal */}
            <Modal
                isOpen={isTaskModalOpen}
                onRequestClose={() => {
                    setIsTaskModalOpen(false);
                    setEditingTask(null);
                    setNewTaskTitle('');
                    setNewTaskDetails('');
                    setNewTaskDueDate('');
                    setNewTaskPriority('medium');
                    setNewTaskAssignee('');
                }}
                className="modal-content"
                overlayClassName="modal-overlay"
            >
                <h2>{editingTask ? 'Edit Task' : 'Create Task'}</h2>
                <div className="task-form">
                    <div className="form-group">
                        <label htmlFor="taskTitle">Task Title *</label>
                        <input
                            id="taskTitle"
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Enter task title"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="taskDetails">Task Details</label>
                        <textarea
                            id="taskDetails"
                            value={newTaskDetails}
                            onChange={(e) => setNewTaskDetails(e.target.value)}
                            placeholder="Enter task details"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="taskDueDate">Due Date *</label>
                        <input
                            id="taskDueDate"
                            type="date"
                            value={newTaskDueDate}
                            onChange={(e) => setNewTaskDueDate(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="taskPriority">Priority *</label>
                        <select
                            id="taskPriority"
                            value={newTaskPriority}
                            onChange={(e) => setNewTaskPriority(e.target.value)}
                        >
                            <option value="low">Low Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="high">High Priority</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="taskAssignee">Assignee *</label>
                        <select
                            id="taskAssignee"
                            value={newTaskAssignee}
                            onChange={(e) => setNewTaskAssignee(e.target.value)}
                        >
                            <option value="">Select Assignee</option>
                            {groupMembers.map(member => (
                                <option key={member.id} value={member.id}>
                                    {member.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button onClick={editingTask ? handleSaveTaskUpdate : handleCreateTask}>
                        {editingTask ? 'Save Changes' : 'Create Task'}
                    </button>
                </div>
            </Modal>

            <Modal
                isOpen={isModalOpen}
                onRequestClose={closeModal}
                className="modal-content"
                overlayClassName="modal-overlay"
            >
                <h2>{modalType === 'friend' ? 'Add Friend' : 'Create Group'}</h2>
                {modalType === 'group' && (
                    <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Enter group name"
                    />
                )}
                <div className="user-list">
                    {userList
                        .filter(user => user.id !== currentUserId)
                        .map(user => (
                            <div
                                key={user.id}
                                className={`user-item ${selectedUsers.some(u => u.id === user.id) ? 'selected' : ''}`}
                                onClick={() => handleUserSelection(user)}
                            >
                                {user.name}
                            </div>
                        ))}
                </div>
                <button onClick={handleCreateChat}>
                    {modalType === 'friend' ? 'Add Friend' : 'Create Group'}
                </button>
            </Modal>

            <Modal
                isOpen={showGroupMembersModal}
                onRequestClose={() => setShowGroupMembersModal(false)}
                className="modal-content"
                overlayClassName="modal-overlay"
            >
                <h2>群成员</h2>
                <div className="user-list">
                    {groupMembers.map(user => (
                        <div
                            key={user.id}
                            className="user-item"
                            data-avatar={user.name?.charAt(0).toUpperCase() || '?'}
                        >
                            <div>
                                <div>{user.name}</div>
                                <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={() => setShowGroupMembersModal(false)}>关闭</button>
            </Modal>
        </div>
    );
};

export default ChatPage;
