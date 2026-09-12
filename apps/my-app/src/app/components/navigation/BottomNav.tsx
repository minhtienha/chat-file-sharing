import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { WORKSPACE_NAV_ITEMS } from './navConfig';
import { useBearerTokenStore } from '../../stores/auth.store';
import { getChatRooms } from '../../services/chatRoom.service';
import { getSocket } from '../../services/socket';
import { ChatRoom } from '../../types/chat.types';

interface BottomNavProps {
  hidden?: boolean;
}

const BottomNav = ({ hidden = false }: BottomNavProps) => {
  const accessToken = useBearerTokenStore((state) => state.accessToken);
  const [unreadRoomsCount, setUnreadRoomsCount] = useState(0);

  useEffect(() => {
    if (!accessToken) return;

    const fetchUnreadCount = async () => {
      try {
        const data = await getChatRooms();
        const rooms: ChatRoom[] = Array.isArray(data) ? data : data.data || [];
        const count = rooms.filter((r) => (r.unreadCount || 0) > 0).length;
        setUnreadRoomsCount(count);
      } catch (error) {
        console.error('Lỗi tải số lượng tin nhắn chưa đọc:', error);
      }
    };

    fetchUnreadCount();

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const handleUpdate = () => {
      fetchUnreadCount();
    };

    socket.on('newMessage', handleUpdate);
    socket.on('newRoomMessage', handleUpdate);
    socket.on('roomRead', handleUpdate);
    socket.on('roomDeleted', handleUpdate);

    return () => {
      socket.off('newMessage', handleUpdate);
      socket.off('newRoomMessage', handleUpdate);
      socket.off('roomRead', handleUpdate);
      socket.off('roomDeleted', handleUpdate);
    };
  }, [accessToken]);

  if (hidden) return null;

  return (
    <nav className="w-full bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-lg shadow-slate-200/60 px-3 py-1.5 flex items-center justify-around select-none">
      {WORKSPACE_NAV_ITEMS.map(({ id, label, to, icon: Icon }) => (
        <NavLink
          key={id}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs transition-all duration-200 cursor-pointer relative ${
              isActive
                ? 'bg-indigo-50 text-indigo-600 font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 font-medium'
            }`
          }
        >
          <div className="relative flex items-center justify-center">
            <Icon className="text-lg shrink-0" />
            {id === 'chat' && unreadRoomsCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 flex items-center justify-center font-bold text-white bg-indigo-600 rounded-full text-[9px] shadow-xs ring-2 ring-white">
                {unreadRoomsCount > 99 ? '99+' : unreadRoomsCount}
              </span>
            )}
          </div>
          <span className="text-xs">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
