import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import './ChatPage.css';
import { chat } from 'vscode';

// const API_BASE = import.meta.env.VITE_API_BASE_URL;
const API_BASE = `http://localhost:3000`;

console.log('API_BASE =', API_BASE);

// Chat type definition
type Chat = {
  id: string; // Unique chat identifier
  name: string; // Chat name
  messages?: { sender: string; text: string; time: string }[]; // Array of messages in the chat
  type: string; // Whether it's a group chat or not
  members?: string[]; // List of members (for group chats)
  groupOwner?: string; // The owner of the group chat
};

// Set the app element for modal accessibility
Modal.setAppElement('#root');

const ChatPage: React.FC = () => {
  // State variables
  const [chats, setChats] = useState<Chat[]>([]); // List of all chats
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null); // Selected chat
  const [newMessage, setNewMessage] = useState<string>(''); // New message input
  const [chatName, setChatName] = useState<string>(''); // Chat name for new chat
  const [userName] = useState<string>('我'); // Current user's name (hardcoded to '我' here)
  const [chatType, setChatType] = useState<string>('none'); // Chat type ('none', 'group', or 'friend')
  const [selectedFriend, setSelectedFriend] = useState<string>(''); // Selected friend for friend chat
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]); // Selected members for group chat
  const [membersList, setMembersList] = useState<string[]>([]); // List of possible members (static list)
  const [isModalOpen, setIsModalOpen] = useState(false); // Whether the modal is open or not
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false); // Invite members modal
  const [selectedMembersForInvite, setSelectedMembersForInvite] = useState<string[]>([]); // Selected members for invitation
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false); // State for members modal
  const [currentUserId] = useState<string>('1');

  useEffect(() => {
    fetchChats(currentUserId);
    fetchAllUsers();
  }, [currentUserId]);

  const fetchAllUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/users`);
      const data = await response.json();
      setMembersList(data.map((u: any) => u.username)); // 提取 username 字符串
    } catch (error) {
      console.error('获取用户列表失败:', error);
    }
  };

  const fetchChats = async (userId: string) => {
    try {
      const [groupResp, friendResp] = await Promise.all([
        fetch(`${API_BASE}/group-chats/${userId}`),
        fetch(`${API_BASE}/friend-chats/${userId}`)
      ]);

      const groupChats = await groupResp.json();
      const friendChats = await friendResp.json();

      setChats([...groupChats, ...friendChats]); // 合并群聊和好友聊天
    } catch (error) {
      console.error('获取聊天列表失败:', error);
    }
  };


  const selectChat = async (chat: Chat) => {
    try {
      let messages: any[] = [];

      if (chat.type === 'group') {
        const response = await fetch(`${API_BASE}/group-messages/${chat.id}`);
        messages = await response.json();
      } else {
        if (!chat.id) {
          console.error('没有选中的好友 ID');
          return;
        }

        const response = await fetch(`${API_BASE}/friend-messages/${currentUserId}/${chat.id}`);
        messages = await response.json();
      }

      const enrichedChat = {
        ...chat,
        messages: (messages || []).map((msg: any) => ({
          sender: msg.sender_name,
          text: msg.text,
          time: new Date(msg.time).toLocaleTimeString().slice(0, 5)
        }))
      };

      setSelectedChat(enrichedChat);
    } catch (e) {
      if (!chat.id) {
        console.error('获取消息失败:', e);
      }
    }
  };



  // Open modal for creating a group chat or adding a friend
  const openModal = (isGroup: string) => {
    setChatType(isGroup); // Set chat type based on whether it's a group or friend chat
    setIsModalOpen(true); // Open the modal
  };

  // Close the modal and reset selected values
  const closeModal = () => {
    setIsModalOpen(false); // Close the modal
    setChatName(''); // Clear chat name
    setSelectedFriend(''); // Clear selected friend
    setSelectedMembers([]); // Clear selected members
  };

  // 公共本地 UI 更新函数
  const updateLocalMessage = () => {
    if (!selectedChat) return;
    const now = new Date().toLocaleTimeString().slice(0, 5);
    const messageToAdd = {
      sender: userName,
      text: newMessage,
      time: now
    };

    const updatedChat = {
      ...selectedChat,
      messages: [...(selectedChat.messages || []), messageToAdd]
    };

    setChats(chats.map(chat => chat.id === selectedChat.id ? updatedChat : chat));
    setSelectedChat(updatedChat);
    setNewMessage('');
  };

  const sendGroupMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    try {
      await fetch(`${API_BASE}/group-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: selectedChat.id,
          sender: parseInt(currentUserId),
          text: newMessage
        })
      });

      updateLocalMessage();
    } catch (error) {
      console.error('发送群聊消息失败:', error);
    }
  };

  const sendFriendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    try {
      await fetch(`${API_BASE}/friend-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: parseInt(currentUserId),
          receiver: parseInt(selectedChat.id),
          text: newMessage
        })
      });

      updateLocalMessage();
    } catch (error) {
      console.error('发送好友消息失败:', error);
    }
  };


  // 创建好友聊天
  const createFriendChat = async () => {
    if (selectedFriend) {
      try {
        // 在实际应用中，你需要有一个从用户名到用户ID的映射
        // 这里简化处理，假设 selectedFriend 是用户名，需要查询对应的ID
        const friendId = membersList.findIndex(member => member === selectedFriend) + 1;

        const response = await fetch(`${API_BASE}/createFriend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentUserId: currentUserId,
            friendId: friendId
          }),
        });

        const newChat = await response.json();
        setChats([...chats, newChat]);
        setSelectedChat(newChat);
        setIsModalOpen(false);
      } catch (error) {
        console.error('创建好友聊天失败:', error);
      }
    }
  };

  // 创建群聊
  // 修改 createGroupChat 函数，使用正确的变量
  const createGroupChat = async () => {
    if (selectedMembers.length > 0) {
      try {
        // 将选中的用户名转换为用户ID
        const selectedMemberIds = selectedMembers.map(member =>
          membersList.findIndex(m => m === member) + 1);

        const response = await fetch(`${API_BASE}/createGroup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: chatName,
            userIds: [currentUserId, ...selectedMemberIds],
            ownerId: currentUserId
          }),
        });

        const newChat = await response.json();
        setChats([...chats, newChat]);
        setSelectedChat(newChat);
        setIsModalOpen(false);
      } catch (error) {
        console.error('创建群聊失败:', error);
      }
    }
  };

  const handleMemberSelection = (member: string) => {
    if (chatType === 'group') {
      // Ensure the member is not already selected before adding
      if (!selectedMembers.includes(member)) {
        setSelectedMembers([...selectedMembers, member]); // Add member if not selected
      } else {
        setSelectedMembers(selectedMembers.filter(m => m !== member)); // Remove member if already selected
      }
    } else if (chatType === 'friend') {
      // For friend chat, select only one friend
      setSelectedFriend(member);
    }
  };


  // Open the invite members modal for a group chat
  const openInviteModal = () => {
    if (selectedChat?.type) {
      setIsInviteModalOpen(true);
    } else {
      alert("只能在群聊中邀请成员");
    }
  };

  // Close the invite members modal
  const closeInviteModal = () => {
    setIsInviteModalOpen(false);
    setSelectedMembersForInvite([]); // Clear selected members when modal is closed
  };

  // Handle member selection for the invite modal
  const handleMemberInviteSelection = (member: string) => {
    if (selectedMembersForInvite.includes(member)) {
      setSelectedMembersForInvite(selectedMembersForInvite.filter(m => m !== member));
    } else {
      setSelectedMembersForInvite([...selectedMembersForInvite, member]);
    }
  };

  const handleSendMessage = async (chat: Chat) => {
    if (!chat) {
      console.log(chat)
      console.warn('未选择聊天');
      return;
    }

    if (!chat?.type) {
      console.log(chat)
      console.warn('未选择属性');
      return;
    }
    
    if (chat.type === 'group') {
      sendGroupMessage();
    } else {
      sendFriendMessage();
    }
  };


  const inviteMembersToGroupChat = async () => {
    if (selectedChat && selectedChat.type === 'group') {
      try {
        const userIds = selectedMembersForInvite.map(member =>
          membersList.findIndex(m => m === member) + 1 // 简单地将用户名映射为 ID（1-based index）
        );

        await fetch(`${API_BASE}/chats/${selectedChat.id}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds })
        });

        // 更新前端成员列表，去重合并
        const updatedChat = {
          ...selectedChat,
          members: [...new Set([...selectedChat.members!, ...selectedMembersForInvite])]
        };

        setChats(chats.map(chat => chat.id === selectedChat.id ? updatedChat : chat));
        setSelectedMembersForInvite([]);
        setIsInviteModalOpen(false);
      } catch (error) {
        console.error('邀请成员失败:', error);
      }
    }
  };

  // Open the members modal
  const openMembersModal = () => {
    setIsMembersModalOpen(true);
  };

  // Close the members modal
  const closeMembersModal = () => {
    setIsMembersModalOpen(false);
  };

  return (
    <div className="chat-page">
      {/* Left side: Chat list */}
      <div className="chat-list">
        {/* <div className="search-bar">
          <input
            type="text"
            placeholder="输入聊天名称"
            onChange={(e) => setChatName(e.target.value)} // Update chat name as user types
            value={chatName} // Bind chat name input to state
          />
        </div> */}
        <div className="button-group">
          {/* Buttons to add a friend or create a group chat */}
          <button onClick={() => openModal('friend')} className="add-chat-btn">添加好友</button>
          <button onClick={() => openModal('group')} className="add-chat-btn">添加群聊</button>
        </div>
        {/* Display a list of chats */}
        {chats.map((chat) => (
          <div
            key={chat.id}
            className="chat-item"
            onClick={() => {
              setSelectedChat(chat);
              selectChat(chat); // ✅ 直接传 chat，而不是从状态里等它更新
            }}
          >
            {chat.name}
          </div>
        ))}
      </div>

      {/* Right side: Chat content */}
      <div className="chat-content">
        {selectedChat ? (
          <>
            <div className="chat-header">
              <h3>{selectedChat.name}</h3>
              {selectedChat.type === 'group' && (
                <>
                  <button onClick={openInviteModal} className="invite-btn">
                    邀请成员
                  </button>
                  <button onClick={openMembersModal} className="view-members-btn">
                    查看成员
                  </button>
                </>
              )}
            </div>
            <div className="messages">
              {/* Display messages in the selected chat */}
              {(selectedChat.messages || []).map((message, index) => (
                <div
                  key={index}
                  className={`message ${message.sender === userName ? 'my-message' : 'other-message'}`}
                >
                  <div className="message-text">{message.text}</div>
                  <div className="message-time">{message.time}</div>
                </div>
              ))}
            </div>
            {/* Message input field */}
            <div className="message-input">
              <input
                type="text"
                placeholder="输入消息..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)} // Update message input as user types
              />
              <button onClick={() => handleSendMessage(selectedChat)}>发送</button>
            </div>
          </>
        ) : (
          <div className="no-chat-selected">
            <span>请选择一个聊天</span> {/* Show message if no chat is selected */}
          </div>
        )}
      </div>

      {/* Modal for creating a new chat */}
      <Modal isOpen={isModalOpen} onRequestClose={closeModal}>
        <h2>{chatType === 'group' ? '创建群聊' : '添加好友'}</h2>
        {/* If creating a group chat */}
        {chatType === 'group' && (
          <div className="group-selection">
            <h4>设置群聊名称</h4>
            <input
              type="text"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)} // 绑定群聊名称输入
              placeholder="请输入群聊名称"
            />
            <h4>选择群聊成员</h4>
            <ul>
              {membersList.map((member) => (
                <li
                  key={member}
                  onClick={() => handleMemberSelection(member)} // Handle member selection
                  className={selectedMembers.includes(member) ? 'selected' : ''}
                >
                  {member}
                </li>
              ))}
            </ul>
            <button onClick={createGroupChat} className="add-chat-btn" disabled={selectedMembers.length === 0}>
              创建群聊
            </button>
          </div>
        )}
        {/* If adding a friend */}
        {chatType === 'friend' && (
          <div className="friend-selection">
            <h4>选择一个好友来开始聊天</h4>
            <ul>
              {membersList.map((member) => (
                <li
                  key={member}
                  onClick={() => handleMemberSelection(member)} // Handle friend selection
                  className={selectedFriend === member ? 'selected' : ''}
                >
                  {member}
                </li>
              ))}
            </ul>
            {selectedFriend && (
              <div>
                <button onClick={createFriendChat} className="add-chat-btn">开始聊天</button>
              </div>
            )}
          </div>
        )}
        <button onClick={closeModal} className="cancel-btn">取消</button>
      </Modal>


      {/* Invite members modal */}
      <Modal isOpen={isInviteModalOpen} onRequestClose={closeInviteModal}>
        <h2>邀请成员加入 {selectedChat?.name}</h2>
        <div className="group-selection">
          <h4>选择成员</h4>
          <ul>
            {membersList.map((member) => (
              <li
                key={member}
                onClick={() => handleMemberInviteSelection(member)}
                className={selectedMembersForInvite.includes(member) ? 'selected' : ''}
              >
                {member}
              </li>
            ))}
          </ul>
          <button onClick={inviteMembersToGroupChat} disabled={selectedMembersForInvite.length === 0}>
            邀请成员
          </button>
        </div>
        <button onClick={closeInviteModal} className="cancel-btn">取消</button>
      </Modal>

      {/*Add the modal to display the group members */}
      <Modal isOpen={isMembersModalOpen} onRequestClose={closeMembersModal}>
        <h2>{selectedChat?.name} 成员</h2>
        <div className="members-list">
          <ul>
            {selectedChat?.members?.map((member, index) => (
              <li key={index}>{member}</li>
            ))}
          </ul>
        </div>
        <button onClick={closeMembersModal} className="cancel-btn">关闭</button>
      </Modal>
    </div>
  );
};

export default ChatPage;
