import { useState, useEffect, useMemo } from 'react';
import { IoMdSearch } from 'react-icons/io';
import { FiPlus } from 'react-icons/fi';
import Spinner from '../common/Spinner';
import { formatMessageTime } from '../../utils/formatMessageTime';
import { useBearerTokenStore } from '../../stores/auth.store';
import { getChatRooms } from '../../services/chatRoom.service';
import type { ChatRoom, Message } from '../../types/index';
import { CreateRoomModal } from './CreateRoomModal';
import { getRoomDisplayName } from '../../utils/chatNameHelper';
import { getSocket } from '../../services/socket';

const MessageList = ({
  activeRoom,
  setActiveRoom,
  refreshTrigger,
}: {
  activeRoom: ChatRoom | null;
  setActiveRoom: (room: ChatRoom) => void;
  refreshTrigger: number;
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const accessToken = useBearerTokenStore((state) => state.accessToken);
  const currentUser = useBearerTokenStore((state) => state.user);
  const socket = useMemo(() => getSocket(), []);

  // 1. Tải danh sách phòng
  useEffect(() => {
    if (!accessToken) return;

    const fetchRooms = async () => {
      try {
        setLoading(true);
        const data = await getChatRooms(searchQuery);
        setRooms(Array.isArray(data) ? data : data.data || []);
      } catch (err) {
        console.error('Lỗi tải danh sách phòng chat:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!searchQuery.trim()) {
      fetchRooms();
      return;
    }

    const timer = setTimeout(fetchRooms, 300);
    return () => clearTimeout(timer);
  }, [accessToken, searchQuery, refreshTrigger]);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleNewMessage = (newMsg: Message) => {
      setRooms((prevRooms) => {
        const targetRoomIndex = prevRooms.findIndex(
          (r) => String(r._id) === String(newMsg.roomId),
        );

        if (targetRoomIndex === -1) return prevRooms;

        const targetRoom = prevRooms[targetRoomIndex];
        const updatedRoom: ChatRoom = {
          ...targetRoom,
          lastMessage: newMsg,
          updatedAt: newMsg.createdAt || new Date().toISOString(),
        };

        return [
          updatedRoom,
          ...prevRooms.filter((_, idx) => idx !== targetRoomIndex),
        ];
      });
    };

    socket.on('newMessage', handleNewMessage);

    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, [socket]);

  return (
    <div className="w-80 h-full bg-white border-r border-slate-100 flex flex-col p-5 select-none">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Messages
          </h2>
          <p className="text-xs font-medium text-slate-400 mt-0.5">
            {rooms.length} conversations
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition cursor-pointer shadow-xs"
          title="Tạo cuộc trò chuyện mới"
        >
          <FiPlus className="text-base" />
        </button>
      </div>

      <div className="relative flex items-center mb-6">
        <IoMdSearch className="absolute left-3 text-slate-400 text-lg pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search rooms"
          className="w-full pl-9 pr-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-3 px-1">
          Recent
        </p>

        {loading ? (
          <Spinner loading={loading} />
        ) : (
          <div className="space-y-1">
            {rooms.map((item) => {
              const isSelected = activeRoom?._id === item._id;
              const senderId =
                typeof item.lastMessage?.senderId === 'object'
                  ? (item.lastMessage.senderId as any)?._id
                  : item.lastMessage?.senderId || item.lastMessage?.sender?._id;
              const isMe = String(currentUser?._id) === String(senderId);

              const roomDisplayName = getRoomDisplayName(
                item,
                currentUser?._id,
              );

              return (
                <div
                  key={item._id}
                  onClick={() => setActiveRoom(item)}
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50/70'
                      : 'hover:bg-slate-50/80 bg-transparent'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-sm font-semibold text-slate-900 truncate">
                        {roomDisplayName}
                      </h4>
                      <span className="text-[11px] text-slate-400 shrink-0 ml-2">
                        {formatMessageTime(item.updatedAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs truncate text-slate-400">
                        {isMe && (
                          <span className="font-medium text-slate-600 mr-1">
                            Bạn:
                          </span>
                        )}
                        {item.lastMessage?.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateRoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newRoom) => {
          setRooms((prev) => [
            newRoom,
            ...prev.filter((r) => r._id !== newRoom._id),
          ]);
          setActiveRoom(newRoom);
        }}
      />
    </div>
  );
};

export default MessageList;
