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

  // Load initial data
  useEffect(() => {
    // Get current user ID
    vscode?.postMessage({ command: 'getCurrentUserid' });
    
    // Get all users
    vscode?.postMessage({ command: 'getUsers' });

    const handleMessage = (e: MessageEvent) => {
      const msg = e.data;
      
      switch (msg.command) {
        case 'currentUseridResult':
          if (msg.success && msg.userId) {
            setCurrentUserId(msg.userId.toString());
            // Load user's chats
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
            setChats(prev => [...prev, msg.friend || msg.group]);
            setIsModalOpen(false);
            setSelectedUsers([]);
            setGroupName('');
          }
          break;

        case 'sendFriendsMessageResult':
        case 'sendGroupMessageResult':
          if (msg.success) {
            // Refresh messages
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
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [userList, selectedChat, currentUserId]);

  const loadUserChats = (userId: string) => {
    vscode?.postMessage({ command: 'getFriendsList', userId });
    vscode?.postMessage({ command: 'getGroupList', userId });
  };

  const selectChat = (chat: Chat) => {
    setSelectedChat(chat);
    if (chat.type === 'group') {
      vscode?.postMessage({ command: 'getGroupMessages', groupId: chat.id });
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
        <button
          onClick={handleCreateChat}
          disabled={
            (modalType === 'friend' && selectedUsers.length !== 1) ||
            (modalType === 'group' && (selectedUsers.length === 0 || !groupName))
          }
        >
          {modalType === 'friend' ? 'Add Friend' : 'Create Group'}
        </button>
      </Modal>
    </div>
  );
};

export default ChatPage;
