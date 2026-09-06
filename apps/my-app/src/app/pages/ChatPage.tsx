import { useState } from 'react';
import MessageList from '../components/chat/MessageList';
import { ChatRoom } from '../types/chat.types';
import ChatBox from '../components/chat/ChatBox';
import RoomDetail from '../components/chat/RoomDetail';
import WelcomeChat from './WelcomePage';

const ChatPage = () => {
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-white">
      <MessageList
        activeRoom={selectedRoom}
        setActiveRoom={setSelectedRoom}
        refreshTrigger={refreshTrigger}
      />
      {selectedRoom ? (
        <>
          <ChatBox
            currentRoom={selectedRoom}
            onToggleDetails={() => setShowDetails((prev) => !prev)}
            onSendMessageSuccess={() => setRefreshTrigger((prev) => prev + 1)}
          />
          <RoomDetail currentRoom={selectedRoom} isOpen={showDetails} />
        </>
      ) : (
        <WelcomeChat />
      )}
    </div>
  );
};

export default ChatPage;
