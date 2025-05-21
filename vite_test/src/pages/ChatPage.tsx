import React, { useState } from 'react';
import Modal from 'react-modal';
import './ChatPage.css';

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
  const [membersList] = useState<string[]>(['Alice', 'Bob', 'Charlie', '我']); // List of possible members (static list)
  const [isModalOpen, setIsModalOpen] = useState(false); // Whether the modal is open or not
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false); // Invite members modal
  const [selectedMembersForInvite, setSelectedMembersForInvite] = useState<string[]>([]); // Selected members for invitation
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false); // State for members modal

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

  // Select a chat from the list and view its messages
  const selectChat = (chat: Chat) => {
    setSelectedChat(chat); // Set the selected chat
    setChatType('none'); // Reset chat type (no modal is open anymore)
  };

  // Send a message to the selected chat
  const sendMessage = () => {
    if (newMessage.trim() && selectedChat) { // Check if there's a new message and a selected chat
      const message = {
        sender: userName,
        text: newMessage,
        time: new Date().toLocaleTimeString().slice(0, 5), // Get the current time in hh:mm format
      };
      selectedChat.messages.push(message); // Add the new message to the selected chat's messages
      setChats([...chats]); // Update the chats list to trigger re-render
      setNewMessage(''); // Clear the message input
    }
  };

  // Create a new friend chat
  const createFriendChat = () => {
    if (selectedFriend) { // Check if a friend has been selected
      const newChat: Chat = {
        id: Math.random().toString(36).substr(2, 9), // Generate a random chat ID
        name: `${userName} 和 ${selectedFriend}`, // Set chat name based on the user and selected friend
        messages: [],
        isGroup: false, // Mark as a non-group chat
      };
      setChats([...chats, newChat]); // Add the new chat to the chat list
      setSelectedChat(newChat); // Set the newly created chat as the selected chat
      setIsModalOpen(false); // Close the modal
    }
  };

  // Create a new group chat
  const createGroupChat = () => {
    if (selectedMembers.length > 0) { // Ensure at least one member is selected
      const newChat: Chat = {
        id: Math.random().toString(36).substr(2, 9),
        name: chatName,
        messages: [],
        isGroup: true,
        members: [userName, ...selectedMembers],
        groupOwner: userName,
      };
      setChats([...chats, newChat]); // Add the new group chat to the chat list
      setChatName(''); // Reset chat name input
      setSelectedMembers([]); // Reset selected members
      setIsModalOpen(false); // Close the modal
      setSelectedChat(newChat); // Set the newly created group chat as the selected chat
    } else {
      alert('请至少选择一个成员');
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
  const inviteMembersToGroupChat = () => {
    if (selectedChat && selectedChat.isGroup) {
      const updatedChat = {
        ...selectedChat,
        members: [...selectedChat.members!, ...selectedMembersForInvite],
      };
      setChats(chats.map(chat => chat.id === selectedChat.id ? updatedChat : chat));
      setIsInviteModalOpen(false);
  
      // Call updateGroupMembers after updating the members
      updateGroupMembers(); // This will update the group members list after changes
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


  const updateGroupMembers = () => {
    if (selectedChat && selectedChat.isGroup) {
      const updatedChat = {
        ...selectedChat,
        members: [...new Set([...selectedChat.members!, ...selectedMembersForInvite])], // Prevent duplicates
      };
      setChats(chats.map(chat => chat.id === selectedChat.id ? updatedChat : chat));
      setIsInviteModalOpen(false);
    }
  };
  
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
