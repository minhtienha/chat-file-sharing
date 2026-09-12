import { useState, useEffect } from 'react';
import MessageList from '../components/chat/MessageList';
import ChatBox from '../components/chat/ChatBox';
import RoomDetail from '../components/chat/RoomDetail';
import { ChatRoom } from '../types/chat.types';
import { getChatRooms } from '../services/chatRoom.service';
import { useBearerTokenStore } from '../stores/auth.store';

const DESKTOP_QUERY = '(min-width: 1024px)';

const ChatPage = () => {
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const accessToken = useBearerTokenStore((state) => state.accessToken);

  // Desktop (lg+): Tự động chọn phòng đầu tiên để khung chat không bị trống
  useEffect(() => {
    if (!accessToken || selectedRoom) return;

    const autoSelectFirstRoom = async () => {
      if (!window.matchMedia(DESKTOP_QUERY).matches) return;

      try {
        const data = await getChatRooms();
        const rooms: ChatRoom[] = Array.isArray(data) ? data : data.data || [];
        if (rooms.length > 0) {
          setSelectedRoom(rooms[0]);
        }
      } catch (error) {
        console.error('Lỗi tự động chọn phòng chat:', error);
      }
    };

    autoSelectFirstRoom();

    const media = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => {
      if (media.matches && !selectedRoom) {
        autoSelectFirstRoom();
      }
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [accessToken, selectedRoom]);

  const hasRoom = Boolean(selectedRoom);

  return (
    <div className="flex flex-1 h-full w-full overflow-hidden bg-white">
      {/* 
        MessageList (Danh sách phòng):
        - Desktop: Cố định width 320px (lg:w-80), luôn hiển thị
        - Mobile: Rộng 100% khi chưa chọn phòng, Ẩn đi khi đã chọn phòng
      */}
      <div
        className={`h-full min-h-0 ${
          hasRoom
            ? 'hidden lg:flex lg:w-80 shrink-0 border-r border-slate-100'
            : 'flex w-full lg:w-80 shrink-0 border-r border-slate-100'
        }`}
      >
        <MessageList
          activeRoom={selectedRoom}
          setActiveRoom={setSelectedRoom}
        />
      </div>

      {/* 
        ChatBox (Khung chat):
        - Desktop: flex-1 (chiếm phần còn lại), luôn hiển thị
        - Mobile: Ẩn khi chưa chọn phòng, bung 100% khi chọn phòng
      */}
      <div
        className={`h-full min-w-0 min-h-0 ${
          hasRoom ? 'flex flex-1' : 'hidden lg:flex lg:flex-1'
        }`}
      >
        {selectedRoom ? (
          <>
            <ChatBox
              currentRoom={selectedRoom}
              onToggleDetails={() => setShowDetails((prev) => !prev)}
              onBack={() => setSelectedRoom(null)} // Quay lại danh sách phòng (mobile)
            />
            {/* Component chi tiết phòng bên phải (Desktop: sidebar, Mobile: full screen) */}
            <RoomDetail
              currentRoom={selectedRoom}
              isOpen={showDetails}
              onClose={() => setShowDetails(false)}
              refreshTrigger={refreshTrigger}
              onRoomDeleted={() => {
                setSelectedRoom(null);
                setRefreshTrigger((prev) => prev + 1);
              }}
              onRoomCreated={(newRoom) => {
                setSelectedRoom(newRoom);
                setRefreshTrigger((prev) => prev + 1);
              }}
            />
          </>
        ) : (
          <div className="flex-1 hidden lg:flex flex-col items-center justify-center p-8 text-center bg-slate-50/40 select-none">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-sm shadow-indigo-100/50">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Chưa chọn cuộc trò chuyện
            </h3>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Chọn một người bạn từ danh sách bên trái hoặc tìm kiếm thành viên mới để bắt đầu cuộc trò chuyện.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
