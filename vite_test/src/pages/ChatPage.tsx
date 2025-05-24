import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import './ChatPage.css';

// const API_BASE = import.meta.env.VITE_API_BASE_URL;
const API_BASE = `http://localhost:3000`;

console.log('API_BASE =', API_BASE);

// Chat type definition
type Chat = {
  id: string; // Unique chat identifier
  name: string; // Chat name
  messages: { sender: string; text: string; time: string }[]; // Array of messages in the chat
  isGroup: boolean; // Whether it's a group chat or not
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
  const [chatType, setChatType] = useState<'none' | 'group' | 'friend'>('none'); // Chat type ('none', 'group', or 'friend')
  const [selectedFriend, setSelectedFriend] = useState<string>(''); // Selected friend for friend chat
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]); // Selected members for group chat
  const [membersList, setMembersList] = useState<string[]>([]); // List of possible members (static list)
  const [isModalOpen, setIsModalOpen] = useState(false); // Whether the modal is open or not
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false); // Invite members modal
  const [selectedMembersForInvite, setSelectedMembersForInvite] = useState<string[]>([]); // Selected members for invitation
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false); // State for members modal
  const [currentUserId] = useState<string>('1'); // 假设当前用户ID为1，实际应用中应从登录状态获取

  // 数据获取effect
  // useEffect(() => {
  //   fetchChats(currentUserId);
  //   fetchFriends(currentUserId);
  // }, [currentUserId]);
  useEffect(() => {
    fetchChats(currentUserId);
    fetchAllUsers(); // 代替 fetchFriends
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
  
  

  // // 获取用户聊天列表
  // const fetchChats = async (userId: string) => {
  //   try {
  //     const response = await fetch(`${API_BASE}/group-chats/${userId}`);
  //     const data = await response.json();
  //     setChats(data);
  //   } catch (error) {
  //     console.error('获取聊天列表失败:', error);
  //   }
  // };

  // // 获取好友列表
  // const fetchFriends = async (userId: string) => {
  //   try {
  //     const response = await fetch(`${API_BASE}/friends/${userId}`);
  //     const data = await response.json();
  //     setMembersList(data.map((friend: any) => friend.username));
  //   } catch (error) {
  //     console.error('获取好友列表失败:', error);
  //   }
  // };

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


  // Select a chat from the list and view its messages
  const selectChat = async (chat: Chat) => {
    try {
      let messages: any[] = [];

      if (chat.isGroup) {
        const response = await fetch(`${API_BASE}/group-messages/${chat.id}`);
        messages = await response.json();
      } else {
        const otherName = chat.name.replace(`${userName} 和 `, '').replace(` 和 ${userName}`, '');
        const response = await fetch(`${API_BASE}/friend-messages/${userName}/${otherName}`);
        messages = await response.json();
      }

      const enrichedChat = {
        ...chat,
        messages: messages.map((msg: any) => ({
          sender: msg.sender,
          text: msg.text,
          time: new Date(msg.time).toLocaleTimeString().slice(0, 5)
        }))
      };

      setSelectedChat(enrichedChat);
    } catch (e) {
      console.error('获取消息失败:', e);
    }
  };


  // Open modal for creating a group chat or adding a friend
  const openModal = (isGroup: boolean) => {
    setChatType(isGroup ? 'group' : 'friend'); // Set chat type based on whether it's a group or friend chat
    setIsModalOpen(true); // Open the modal
  };

  // Close the modal and reset selected values
  const closeModal = () => {
    setIsModalOpen(false); // Close the modal
    setChatName(''); // Clear chat name
    setSelectedFriend(''); // Clear selected friend
    setSelectedMembers([]); // Clear selected members
  };

  // // Send a message to the selected chat
  // const sendMessage = () => {
  //   if (newMessage.trim() && selectedChat) { // Check if there's a new message and a selected chat
  //     const message = {
  //       sender: userName,
  //       text: newMessage,
  //       time: new Date().toLocaleTimeString().slice(0, 5), // Get the current time in hh:mm format
  //     };
  //     selectedChat.messages.push(message); // Add the new message to the selected chat's messages
  //     setChats([...chats]); // Update the chats list to trigger re-render
  //     setNewMessage(''); // Clear the message input
  //   }
  // };
  // 发送消息
  // 修改 sendMessage 函数，移除未使用的 sentMessage
  const sendMessage = async () => {
    if (newMessage.trim() && selectedChat) {
      try {
        await fetch(`${API_BASE}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: selectedChat.id,
            senderId: currentUserId,
            content: newMessage
          }),
        });

        // 更新本地状态
        const updatedChat = {
          ...selectedChat,
          messages: [...selectedChat.messages, {
            sender: userName,
            text: newMessage,
            time: new Date().toLocaleTimeString().slice(0, 5)
          }]
        };

        setChats(chats.map(chat => chat.id === selectedChat.id ? updatedChat : chat));
        setNewMessage('');
      } catch (error) {
        console.error('发送消息失败:', error);
      }
    }
  };


  // // Create a new friend chat
  // const createFriendChat = () => {
  //   if (selectedFriend) { // Check if a friend has been selected
  //     const newChat: Chat = {
  //       id: Math.random().toString(36).substr(2, 9), // Generate a random chat ID
  //       name: `${userName} 和 ${selectedFriend}`, // Set chat name based on the user and selected friend
  //       messages: [],
  //       isGroup: false, // Mark as a non-group chat
  //     };
  //     setChats([...chats, newChat]); // Add the new chat to the chat list
  //     setSelectedChat(newChat); // Set the newly created chat as the selected chat
  //     setIsModalOpen(false); // Close the modal
  //   }
  // };
  // 创建好友聊天
  const createFriendChat = async () => {
    if (selectedFriend) {
      try {
        // 在实际应用中，你需要有一个从用户名到用户ID的映射
        // 这里简化处理，假设 selectedFriend 是用户名，需要查询对应的ID
        const friendId = membersList.findIndex(member => member === selectedFriend) + 1;

        const response = await fetch(`${API_BASE}/chats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `${userName} 和 ${selectedFriend}`,
            isGroup: false,
            userIds: [currentUserId, friendId],
            ownerId: currentUserId
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

  // // Create a new group chat
  // const createGroupChat = () => {
  //   if (selectedMembers.length > 0) { // Ensure at least one member is selected
  //     const newChat: Chat = {
  //       id: Math.random().toString(36).substr(2, 9),
  //       name: chatName,
  //       messages: [],
  //       isGroup: true,
  //       members: [userName, ...selectedMembers],
  //       groupOwner: userName,
  //     };
  //     setChats([...chats, newChat]); // Add the new group chat to the chat list
  //     setChatName(''); // Reset chat name input
  //     setSelectedMembers([]); // Reset selected members
  //     setIsModalOpen(false); // Close the modal
  //     setSelectedChat(newChat); // Set the newly created group chat as the selected chat
  //   } else {
  //     alert('请至少选择一个成员');
  //   }
  // };

  // 创建群聊
  // 修改 createGroupChat 函数，使用正确的变量
  const createGroupChat = async () => {
    if (selectedMembers.length > 0) {
      try {
        // 将选中的用户名转换为用户ID
        const selectedMemberIds = selectedMembers.map(member =>
          membersList.findIndex(m => m === member) + 1);

        const response = await fetch(`${API_BASE}/chats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: chatName,
            isGroup: true,
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
    if (selectedChat?.isGroup) {
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

  // Invite selected members to the group chat
  // const inviteMembersToGroupChat = () => {
  //   if (selectedChat && selectedChat.isGroup) {
  //     const updatedChat = {
  //       ...selectedChat,
  //       members: [...selectedChat.members!, ...selectedMembersForInvite],
  //     };
  //     setChats(chats.map(chat => chat.id === selectedChat.id ? updatedChat : chat));
  //     setIsInviteModalOpen(false);

  //     // Call updateGroupMembers after updating the members
  //     updateGroupMembers(); // This will update the group members list after changes
  //   }
  // };
  const inviteMembersToGroupChat = async () => {
    if (selectedChat && selectedChat.isGroup) {
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


  // const updateGroupMembers = () => {
  //   if (selectedChat && selectedChat.isGroup) {
  //     const updatedChat = {
  //       ...selectedChat,
  //       members: [...new Set([...selectedChat.members!, ...selectedMembersForInvite])], // Prevent duplicates
  //     };
  //     setChats(chats.map(chat => chat.id === selectedChat.id ? updatedChat : chat));
  //     setIsInviteModalOpen(false);
  //   }
  // };

  return (
    <div className="chat-page">
      {/* Left side: Chat list */}
      <div className="chat-list">
        <div className="search-bar">
          <input
            type="text"
            placeholder="输入聊天名称"
            onChange={(e) => setChatName(e.target.value)} // Update chat name as user types
            value={chatName} // Bind chat name input to state
          />
        </div>
        <div className="button-group">
          {/* Buttons to add a friend or create a group chat */}
          <button onClick={() => openModal(false)} className="add-chat-btn">添加好友</button>
          <button onClick={() => openModal(true)} className="add-chat-btn">添加群聊</button>
        </div>
        {/* Display a list of chats */}
        {chats.map((chat) => (
          <div
            key={chat.id}
            className="chat-item"
            onClick={() => selectChat(chat)} // Select chat when clicked
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
              {selectedChat.isGroup && (
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
              {selectedChat.messages.map((message, index) => (
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
              <button onClick={sendMessage}>发送</button>
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
