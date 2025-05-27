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
  messages?: Message[]; // Array of messages in the chat
  type: string; // Whether it's a group chat or not
  members?: User[]; // List of members (for group chats)
  groupOwner?: string; // The owner of the group chat
};

type User = {
  id: string;      // Unique user identifier
  name: string;    // Display name
  email?: string;  // Optional email
  role?: string;   // Optional role (e.g., 'student', 'teacher')
};

type Message = {
  sender: User;  // sender ID (matches User.id)
  text: string;    // message content
  time: string;    // ISO timestamp (e.g., "2025-05-27T12:34:56Z")
};


// Set the app element for modal accessibility
Modal.setAppElement('#root');

const ChatPage: React.FC = () => {
  // State variables
  const [chats, setChats] = useState<Chat[]>([]); // List of all chats
  const [userList, setUserList] = useState<User[]>([]); // List of possible members (static list)


  // new 
  const [newMessage, setNewMessage] = useState<Message | null>(null); // New message input
  const [newChat, setNewChat] = useState<Chat | null>(null); // Chat name for new chat
  const [newChatType, setNewChatType] = useState<'group' | 'friend' | null>(null); // Chat name for new chat

  // current
  const [currentUser] = useState<User>({
    id: '1',
    name: 'Alan',
    email: 'alan@gmail.com',
    role: 'student'
  });


  //selected
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null); // Selected friend for friend chat
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]); // Selected members for group chat
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null); // Selected chat

  //modal
  const [isModalOpen, setIsModalOpen] = useState(false); // Whether the modal is open or not
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false); // Invite members modal
  const [selectedMembersForInvite, setSelectedMembersForInvite] = useState<User[]>([]); // Selected members for invitation
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false); // State for members modal

  useEffect(() => {
    fetchChats(currentUser.id);
    fetchAllUsers();
  }, [currentUser.id]);

  useEffect(() => {
    console.log('userList 更新了:', userList);
  }, [userList]);

  useEffect(() => {
    if (selectedChat) {
      setNewMessage({ sender: currentUser, text: '', time: '' });
    }
  }, [selectedChat]);


  const fetchAllUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/users`);
      const data = await response.json();
      setUserList(data.map((u: User) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role
      })));
      console.log('userList: ', userList)
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

        const response = await fetch(`${API_BASE}/friend-messages/${currentUser.id}/${chat.id}`);
        messages = await response.json();
      }

      const enrichedChat = {
        ...chat,
        messages: (messages || []).map((msg: any) => ({
          sender: { name: msg.sender_name, id: msg.sender_id, email: msg.sender_email, role: msg.sender_role } as User,
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
  const openModal = (type: string) => {
    setNewChatType(type as "group" | "friend"); // Set chat type based on whether it's a group or friend chat
    setIsModalOpen(true); // Open the modal
  };

  // Close the modal and reset selected values
  const closeModal = () => {
    setIsModalOpen(false); // Close the modal
    setSelectedFriend(null); // Clear selected friend
    setSelectedMembers([]); // Clear selected members
  };

  const updateLocalMessage = () => {
    if (!selectedChat) return;

    const now = new Date().toLocaleTimeString().slice(0, 5);
    const messageToAdd: Message = {
      sender: currentUser,     // ✅ 是 User 类型
      text: newMessage?.text || '',        // ✅ 是 string 类型
      time: now                // ✅ 可考虑换成 new Date().toISOString()
    };

    const updatedChat = {
      ...selectedChat,
      messages: [...(selectedChat.messages || []), messageToAdd]
    };

    setChats(chats.map(chat => chat.id === selectedChat.id ? updatedChat : chat));
    setSelectedChat(updatedChat);
    setNewMessage(null); // ✅ 清空输入
  };


  const sendGroupMessage = async () => {
    if (!newMessage?.text.trim() || !selectedChat) return;
    try {
      await fetch(`${API_BASE}/group-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: selectedChat.id,
          sender: parseInt(currentUser.id),
          text: newMessage.text
        })
      });

      updateLocalMessage();
    } catch (error) {
      console.error('发送群聊消息失败:', error);
    }
  };

  const sendFriendMessage = async () => {
    if (!newMessage?.text.trim() || !selectedChat) return;
    try {
      await fetch(`${API_BASE}/friend-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: parseInt(currentUser.id),
          receiver: parseInt(selectedFriend!.id),
          text: newMessage.text
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
        const friendId = selectedFriend.id;

        const response = await fetch(`${API_BASE}/createFriend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentUserId: currentUser.id,
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
  const createGroupChat = async (chatName: string) => {
    if (selectedMembers.length > 0) {
      try {
        // 将选中的用户名转换为用户ID
        const selectedMemberIds = selectedMembers.map(member => member.id);

        const response = await fetch(`${API_BASE}/createGroup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: chatName,
            userIds: [currentUser.id, ...selectedMemberIds].map(id => Number(id)),
            ownerId: currentUser.id
          }),
        });
        const newChatRaw = await response.json();

        const memberUsers = userList.filter(user =>
          newChatRaw.members.includes(user.id)
        );
        
        const newChat = {
          ...newChatRaw,
          members: memberUsers
        };
        
        setChats([...chats, newChat]);
        setSelectedChat(newChat);
        setIsModalOpen(false);
      } catch (error) {
        console.error('创建群聊失败:', error);
      }
    }
  };

  const handleMemberSelection = (member: User) => {
    if (newChatType === 'group') {
      // Ensure the member is not already selected before adding
      if (!selectedMembers.includes(member)) {
        setSelectedMembers([...selectedMembers, member]); // Add member if not selected
      } else {
        setSelectedMembers(selectedMembers.filter(m => m !== member)); // Remove member if already selected
      }
    } else if (newChatType === 'friend') {
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
  const handleMemberInviteSelection = (member: User) => {
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
          member.id // 简单地将用户名映射为 ID（1-based index）
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

        setChats(chats.map(chat =>
          chat.id === selectedChat.id ? updatedChat : chat
        ));
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
                  className={`message ${message.sender.name === currentUser.name ? 'my-message' : 'other-message'}`}
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
                value={newMessage?.text}
                onChange={(e) => {
                  if (newMessage) {
                    setNewMessage({
                      ...newMessage,
                      text: e.target.value
                    });
                  }
                }}
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
        <h2>{newChatType === 'group' ? '创建群聊' : '添加好友'}</h2>
        {/* If creating a group chat */}
        {newChatType === 'group' && (
          <div className="group-selection">
            <h4>设置群聊名称</h4>
            <input
              type="text"
              value={newChat?.name}
              onChange={(e) => {
                if (newChat) {
                  setNewChat({
                    ...newChat,
                    name: e.target.value
                  });
                }
              }}
              placeholder="请输入群聊名称"
            />
            <h4>选择群聊成员</h4>
            <ul>
              {userList.map((member) => (
                <li
                  key={member.name}
                  onClick={() => handleMemberSelection(member)} // Handle member selection
                  className={selectedMembers.includes(member) ? 'selected' : ''}
                >
                  {member.name}
                </li>
              ))}
            </ul>
            <button onClick={() => createGroupChat(newChat?.name || '新建群聊')} className="add-chat-btn" disabled={selectedMembers.length === 0}>
              创建群聊
            </button>
          </div>
        )}
        {/* If adding a friend */}
        {newChatType === 'friend' && (
          <div className="friend-selection">
            <h4>选择一个好友来开始聊天</h4>
            <ul>
              {userList.map((member) => (
                <li
                  key={member.name}
                  onClick={() => handleMemberSelection(member)} // Handle friend selection
                  className={selectedFriend === member ? 'selected' : ''}
                >
                  {member.name}
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
            {userList.map((member) => (
              <li
                key={member.name}
                onClick={() => handleMemberInviteSelection(member)}
                className={selectedMembersForInvite.includes(member) ? 'selected' : ''}
              >
                {member.name}
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
              <li key={index}>{member.name}</li>
            ))}
          </ul>
        </div>
        <button onClick={closeMembersModal} className="cancel-btn">关闭</button>
      </Modal>
    </div>
  );
};

export default ChatPage;
