import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { BsLightningChargeFill, BsThreeDots } from 'react-icons/bs';
import { FiChevronLeft, FiLogOut, FiMenu } from 'react-icons/fi';
import { useBearerTokenStore } from '../../stores/auth.store';
import { getSocket } from '../../services/socket';
import { logoutApi } from '../../services/auth.service';
import { getChatRooms } from '../../services/chatRoom.service';
import { WORKSPACE_NAV_ITEMS } from './navConfig';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const user = useBearerTokenStore((state) => state.user);
  const clearAuth = useBearerTokenStore((state) => state.clearAuth);
  const accessToken = useBearerTokenStore((state) => state.accessToken);
  const navigate = useNavigate();

  const [unreadRoomsCount, setUnreadRoomsCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Lấy số lượng phòng chat có tin nhắn chưa đọc để hiển thị badge
  useEffect(() => {
    if (!accessToken) return;

    const fetchUnreadCount = async () => {
      try {
        const data = await getChatRooms();
        const rooms = Array.isArray(data) ? data : data.data || [];
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

  // Xử lý click outside để đóng menu user
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.error(err);
    } finally {
      const socket = getSocket();
      if (socket?.connected) socket.disconnect();
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <aside
      className={`hidden lg:flex h-full bg-white border-r border-slate-200 flex-col justify-between transition-all duration-300 ease-in-out shrink-0 ${
        isOpen ? 'w-64 p-4' : 'w-16 p-2.5 items-center'
      }`}
    >
      <div className="flex flex-col gap-6 w-full">
        <div className={`flex items-center ${isOpen ? 'justify-between px-1' : 'justify-center'}`}>
          {isOpen && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0">
                <BsLightningChargeFill className="text-lg" />
              </div>
              <span className="text-xl font-bold text-slate-800">Relay</span>
            </div>
          )}

          <button
            type="button"
            onClick={onToggle}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            {isOpen ? <FiChevronLeft className="text-lg" /> : <FiMenu className="text-lg" />}
          </button>
        </div>

        <div className="flex flex-col gap-1 w-full">
          {isOpen && <p className="px-3 text-[11px] font-bold text-slate-400 uppercase mb-1">Workspace</p>}

          {WORKSPACE_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center w-full rounded-xl transition relative ${
                    isOpen ? 'justify-between px-3.5 py-2.5' : 'justify-center p-2.5'
                  } ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 font-semibold'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="text-lg shrink-0" />
                  {isOpen && <span className="text-sm">{item.label}</span>}
                </div>
                {item.id === 'chat' && unreadRoomsCount > 0 && (
                  <span
                    className={`flex items-center justify-center font-bold text-white bg-indigo-600 rounded-full ${
                      isOpen ? 'min-w-5 h-5 px-1.5 text-[11px]' : 'absolute -top-1 -right-1 w-4 h-4 text-[9px]'
                    }`}
                  >
                    {unreadRoomsCount > 99 ? '99+' : unreadRoomsCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      <div className="relative w-full" ref={menuRef}>
        {showMenu && (
          <div
            className={`absolute bottom-full mb-2 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 ${
              isOpen ? 'left-0 w-full' : 'left-14 w-48'
            }`}
          >
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
            >
              <FiLogOut className="text-sm shrink-0" />
              <span>Đăng xuất</span>
            </button>
          </div>
        )}

        <div className={`pt-3 border-t border-slate-100 flex items-center w-full ${isOpen ? 'justify-between px-1' : 'justify-center'}`}>
          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            className="flex items-center gap-3 bg-transparent border-0 p-0 cursor-pointer"
          >
            <div className="relative w-9 h-9 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>

            {isOpen && (
              <div className="flex flex-col text-left truncate">
                <span className="text-xs font-semibold text-slate-800 truncate">{user?.name}</span>
                <span className="text-[10px] text-slate-400">Online</span>
              </div>
            )}
          </button>

          {isOpen && (
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className={`p-1.5 rounded-lg transition ${
                showMenu ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              <BsThreeDots className="text-lg" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
