import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BsLightningChargeFill,
  BsChatDots,
  BsFolder2,
  BsPerson,
  BsShieldCheck,
  BsQuestionCircle,
  BsThreeDots,
} from 'react-icons/bs';
import { FiChevronLeft, FiLogOut, FiMenu } from 'react-icons/fi';
import { useBearerTokenStore } from '../../stores/auth.store';
import { getSocket } from '../../services/socket';

interface SideBarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SideBar = ({ isOpen, onClose }: SideBarProps) => {
  const { user, clearAuth } = useBearerTokenStore();
  const navigate = useNavigate();

  const [roomCount, setRoomCount] = useState<number>(0);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRoomsCount = async () => {
      try {
        const token = useBearerTokenStore.getState().accessToken;
        if (!token) return;

        const res = await fetch('http://localhost:3003/api/chat-rooms', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          const rooms = Array.isArray(data) ? data : data.data || [];
          setRoomCount(rooms.length);
        }
      } catch (error) {
        console.error('Lỗi khi tải số lượng phòng chat:', error);
      }
    };

    fetchRoomsCount();
  }, []);

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
      await fetch('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
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
      className={`h-screen bg-white border-r border-slate-200 flex flex-col justify-between transition-all duration-400 ease-in-out select-none shrink-0 ${
        isOpen ? 'w-64 p-4' : 'w-16 p-2.5 items-center'
      }`}
    >
      <div className="flex flex-col gap-6 w-full">
        <div
          className={`flex items-center ${
            isOpen ? 'justify-between px-1' : 'justify-center'
          }`}
        >
          {isOpen && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-indigo-200 shrink-0">
                <BsLightningChargeFill className="text-lg" />
              </div>
              <span className="text-xl font-bold text-slate-800 tracking-tight whitespace-nowrap">
                Relay
              </span>
            </div>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
            title={isOpen ? 'Thu gọn sidebar' : 'Mở rộng sidebar'}
          >
            {isOpen ? (
              <FiChevronLeft className="text-lg" />
            ) : (
              <FiMenu className="text-lg" />
            )}
          </button>
        </div>

        <div className="flex flex-col gap-1 w-full">
          {isOpen && (
            <p className="px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-1">
              Workspace
            </p>
          )}

          <button
            className={`flex items-center w-full rounded-xl bg-indigo-50/70 text-indigo-600 font-semibold transition cursor-pointer relative ${
              isOpen ? 'justify-between px-3.5 py-2.5' : 'justify-center p-2.5'
            }`}
            title="Chat"
          >
            <div className="flex items-center gap-3">
              <BsChatDots className="text-lg shrink-0" />
              {isOpen && (
                <span className="text-sm whitespace-nowrap">Chat</span>
              )}
            </div>
            {roomCount > 0 && (
              <span
                className={`flex items-center justify-center font-bold text-white bg-indigo-600 rounded-full ${
                  isOpen
                    ? 'min-w-5 h-5 px-1.5 text-[11px]'
                    : 'absolute -top-1 -right-1 w-4 h-4 text-[9px]'
                }`}
              >
                {roomCount > 99 ? '99+' : roomCount}
              </span>
            )}
          </button>

          <button
            className={`flex items-center w-full rounded-xl text-slate-500 font-medium hover:bg-slate-50 hover:text-slate-700 transition cursor-pointer ${
              isOpen ? 'gap-3 px-3.5 py-2.5' : 'justify-center p-2.5'
            }`}
            title="My Drive"
          >
            <BsFolder2 className="text-lg shrink-0" />
            {isOpen && (
              <span className="text-sm whitespace-nowrap">My Drive</span>
            )}
          </button>

          <button
            className={`flex items-center w-full rounded-xl text-slate-500 font-medium hover:bg-slate-50 hover:text-slate-700 transition cursor-pointer ${
              isOpen ? 'gap-3 px-3.5 py-2.5' : 'justify-center p-2.5'
            }`}
            title="Profile & Settings"
          >
            <BsPerson className="text-lg shrink-0" />
            {isOpen && (
              <span className="text-sm whitespace-nowrap">
                Profile & Settings
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col gap-1 w-full">
          {isOpen && (
            <p className="px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-1">
              Tools
            </p>
          )}

          <button
            className={`flex items-center w-full rounded-xl text-slate-500 font-medium hover:bg-slate-50 hover:text-slate-700 transition cursor-pointer ${
              isOpen ? 'gap-3 px-3.5 py-2.5' : 'justify-center p-2.5'
            }`}
            title="Security"
          >
            <BsShieldCheck className="text-lg shrink-0" />
            {isOpen && (
              <span className="text-sm whitespace-nowrap">Security</span>
            )}
          </button>

          <button
            className={`flex items-center w-full rounded-xl text-slate-500 font-medium hover:bg-slate-50 hover:text-slate-700 transition cursor-pointer ${
              isOpen ? 'gap-3 px-3.5 py-2.5' : 'justify-center p-2.5'
            }`}
            title="Help center"
          >
            <BsQuestionCircle className="text-lg shrink-0" />
            {isOpen && (
              <span className="text-sm whitespace-nowrap">Help center</span>
            )}
          </button>
        </div>
      </div>

      <div className="relative w-full" ref={menuRef}>
        {showMenu && (
          <div
            className={`absolute bottom-full mb-2 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 ${
              isOpen ? 'left-0 w-full' : 'left-14 w-48'
            }`}
          >
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {user?.name || 'Tài khoản'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {user?.email || ''}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            >
              <FiLogOut className="text-sm shrink-0" />
              <span>Đăng xuất</span>
            </button>
          </div>
        )}

        <div
          className={`pt-3 border-t border-slate-100 flex items-center w-full ${
            isOpen ? 'justify-between px-1' : 'justify-center'
          }`}
        >
          <div
            onClick={() => setShowMenu((prev) => !prev)}
            className="flex items-center gap-3 min-w-0 cursor-pointer"
            title={!isOpen ? user?.name || 'Tài khoản' : undefined}
          >
            <div className="relative w-9 h-9 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>

            {isOpen && (
              <div className="flex flex-col text-left truncate">
                <span className="text-xs font-semibold text-slate-800 truncate">
                  {user?.name || 'Người dùng'}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  Online
                </span>
              </div>
            )}
          </div>

          {isOpen && (
            <button
              onClick={() => setShowMenu((prev) => !prev)}
              className={`p-1.5 rounded-lg transition cursor-pointer shrink-0 ${
                showMenu
                  ? 'bg-slate-100 text-slate-700'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
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

export default SideBar;
