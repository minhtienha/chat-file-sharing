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
    <nav
      className="lg:hidden w-full h-16 bg-white border-t border-slate-200 shrink-0 px-6 flex items-center justify-around select-none z-30"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {WORKSPACE_NAV_ITEMS.map(({ id, label, to, icon: Icon }) => (
        <NavLink
          key={id}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 text-xs transition cursor-pointer min-w-[64px] relative ${
              isActive
                ? 'text-indigo-600 font-semibold'
                : 'text-slate-400 hover:text-slate-600 font-medium'
            }`
          }
        >
          <div className="relative">
            <Icon className="text-xl shrink-0" />
            {id === 'chat' && unreadRoomsCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 flex items-center justify-center font-bold text-white bg-indigo-600 rounded-full text-[9px]">
                {unreadRoomsCount > 99 ? '99+' : unreadRoomsCount}
              </span>
            )}
          </div>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
