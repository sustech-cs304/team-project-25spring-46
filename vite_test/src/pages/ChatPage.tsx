import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import './ChatPage.css';
import { getVsCodeApi } from '../vscodeApi';

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

Modal.setAppElement('#root');

const ChatPage: React.FC = () => {
  // State management
  const [chats, setChats] = useState<Chat[]>([]);
  const [userList, setUserList] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'friend' | 'group' | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');

  const [showGroupMembersModal, setShowGroupMembersModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);


  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [addableUsers, setAddableUsers] = useState<User[]>([]);

  const [selectedRemoveUsers, setSelectedRemoveUsers] = useState<User[]>([]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);


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
            setChats(prevChats => {
              const friendChats = prevChats.filter(chat => chat.type === 'friend');
              return [...friendChats, ...msg.groups];
            });
          }
          break;

        case 'getFriendMessagesResult':
        case 'getGroupMessagesResult':
          if (msg.success && selectedChat) {
            setSelectedChat(prev => ({
              ...prev!,
              messages: msg.messages.map((m: Message) => ({
                ...m,
                time: new Date(m.time).toLocaleTimeString().slice(0, 5)
              }))
            }));
          }
          break;

        case 'newFriendResult':
        case 'createGroupResult':
          if (msg.success) {
            console.log(msg.group)
            setChats(prev => [...prev, msg.group]);
            setSelectedChat(msg.group);
            setIsModalOpen(false);
            setSelectedUsers([]);
            setGroupName('');

            // ✅ 添加重新加载用户群聊列表（解决“被动进群后界面不刷新”问题）
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
        // case 'getGroupUsersResult':
        //   if (msg.success && msg.users) {
        //     setGroupMembers(msg.users); // 重用已存在的 selectedUsers 状态
        //   }
        //   break;

        case 'getGroupUsersResult':
          if (msg.success && msg.users) {
            setGroupMembers(msg.users);
            if (showAddMembersModal && selectedChat) {
              const memberIds = msg.users.map((u: User) => u.id);
              setAddableUsers(userList.filter(u => !memberIds.includes(u.id) && u.id !== currentUserId));
            }
          }
          break;
        case 'removeGroupMembersResult':
          if (msg.success) {
            if (selectedChat) {
              vscode.postMessage({ command: 'getGroupUsers', groupId: selectedChat.id });
            }
            setSelectedRemoveUsers([]);
            setShowGroupMembersModal(false);
          } else {
            setErrorMessage('删除失败：' + (msg.error || '未知错误'));
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
      vscode?.postMessage({ command: 'getGroupMessages', groupId: selectedChat.id });
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
        vscode?.postMessage({ command: 'getGroupMessages', groupId: selectedChat.id });
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


  const loadUserChats = (userId: string) => {
    vscode?.postMessage({ command: 'getFriendsList', userId });
    vscode?.postMessage({ command: 'getGroupList', userId });
  };

  const selectChat = (chat: Chat) => {
    // setSelectedChat(chat);
    // if (chat.type === 'group') {
    //   vscode?.postMessage({ command: 'getGroupMessages', groupId: chat.id });
    // } else {
    //   vscode?.postMessage({
    //     command: 'getFriendMessages',
    //     userId: currentUserId,
    //     friendId: chat.id
    //   });
    // }
    setSelectedChat(chat); // 改变 selectedChat 后自动触发 useEffect 请求数据
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
                <>
                  <button
                    className="view-members-button"
                    onClick={() => {
                      vscode?.postMessage({ command: 'getGroupUsers', groupId: selectedChat.id });
                      setShowGroupMembersModal(true);
                    }}
                  >
                    查看群成员
                  </button>
                  <button
                    className="view-members-button"
                    onClick={() => {
                      vscode?.postMessage({ command: 'getGroupUsers', groupId: selectedChat.id });
                      setShowAddMembersModal(true);
                    }}
                  >
                    添加成员
                  </button>
                </>
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
          </>
        ) : (
          <div className="no-chat-selected">Select a chat to start messaging</div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        <h2>{modalType === 'friend' ? 'Add Friend' : 'Create Group'}</h2>
        {modalType === 'group' && (
          <div className="form-group">
            <label htmlFor="groupName">Group Name</label>
            <input
              id="groupName"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="group-name-input"
            />
          </div>
        )}

        <div className="user-list">
          {addableUsers.map(user => (
            <div
              key={user.id}
              className={`user-item ${selectedUsers.some(u => u.id === user.id) ? 'selected' : ''}`}
              onClick={() => handleUserSelection(user)}
              data-avatar={user.name?.charAt(0).toUpperCase() || '?'}
            >
              <div>
                <div>{user.name}</div>
                <div>{user.email || '无邮箱信息'}</div>
              </div>
            </div>
          ))}
        </div>


        <button
          onClick={handleCreateChat}
        // disabled={
        //   (modalType === 'friend' && selectedUsers.length !== 1) ||
        //   (modalType === 'group' && (selectedUsers.length === 0 || !groupName))
        // }
        >
          {modalType === 'friend' ? 'Add Friend' : 'Create Group'}
        </button>
      </Modal>


      <Modal
        isOpen={showGroupMembersModal}
        onRequestClose={() => {
          setShowGroupMembersModal(false);
          setSelectedRemoveUsers([]);
        }}
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        <h2>群成员</h2>
        <div className="user-list">
          {groupMembers.map(user => (
            <div
              key={user.id}
              className={`user-item ${selectedRemoveUsers.some(u => u.id === user.id) ? 'selected' : ''}`}
              data-avatar={user.name?.charAt(0).toUpperCase() || '?'}
              onClick={() => {
                const isSelected = selectedRemoveUsers.some(u => u.id === user.id);
                setSelectedRemoveUsers(prev =>
                  isSelected ? prev.filter(u => u.id !== user.id) : [...prev, user]
                );
              }}
            >
              <div>
                <div>{user.name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setShowGroupMembersModal(false)}>关闭</button>
        <button
          onClick={() => {
            if (selectedChat && selectedRemoveUsers.length > 0) {
              vscode.postMessage({
                command: 'removeGroupMembers',
                groupId: selectedChat.id,
                memberIds: selectedRemoveUsers.map(u => u.id)
              });
            }
          }}
          style={{ backgroundColor: 'red', color: 'white', marginTop: '10px' }}
        >
          删除选中成员
        </button>
      </Modal>


      <Modal
        isOpen={showAddMembersModal}
        onRequestClose={() => setShowAddMembersModal(false)}
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        <h2>添加群成员</h2>
        <div className="user-list">
          {addableUsers.map(user => (
            <div
              key={user.id}
              className={`user-item ${selectedUsers.some(u => u.id === user.id) ? 'selected' : ''}`}
              onClick={() => handleUserSelection(user)}
              data-avatar={user.name?.charAt(0).toUpperCase() || '?'}
            >
              <div>
                <div>{user.name}</div>
                <div>{user.email || '无邮箱信息'}</div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            if (selectedUsers.length > 0 && selectedChat) {
              vscode.postMessage({
                command: 'addGroupMembers',
                groupId: selectedChat.id,
                memberIds: selectedUsers.map(u => Number(u.id))
              });
              setSelectedUsers([]);
              setShowAddMembersModal(false);
            }
          }}
        >
          添加成员
        </button>
      </Modal>

      <Modal
        isOpen={!!errorMessage}
        onRequestClose={() => setErrorMessage(null)}
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        <h2>错误</h2>
        <p>{errorMessage}</p>
        <button onClick={() => setErrorMessage(null)}>关闭</button>
      </Modal>


    </div>
  );
};

export default ChatPage;
