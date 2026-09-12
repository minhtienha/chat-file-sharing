import { useState, useEffect, useMemo, useRef } from 'react';
import { IoMdSearch } from 'react-icons/io';
import { FiMoreVertical, FiCheck, FiTrash2 } from 'react-icons/fi';
import Spinner from '../common/Spinner';
import UserAvatar from '../common/UserAvatar';
import { formatMessageTime } from '../../utils/formatMessageTime';
import { useBearerTokenStore } from '../../stores/auth.store';
import {
  getChatRooms,
  getRoomById,
  searchUsers,
  createChatRoom,
  markAsReadApi,
  deleteRoomApi,
} from '../../services/chatRoom.service';
import type { ChatRoom, Message, User } from '../../types/index';
import {
  findDirectRoomWithUser,
  getRoomDisplayName,
  getRoomAvatar,
  getMemberUserId,
} from '../../utils/chatNameHelper';
import { getMessagePreview, getSenderId } from '../../utils/messageContent';
import { getSocket } from '../../services/socket';
import { toast } from 'react-toastify';

interface MessageListProps {
  activeRoom: ChatRoom | null;
  setActiveRoom: (room: ChatRoom) => void;
}

const unwrapList = <T,>(data: T[] | { data?: T[] }): T[] => {
  if (Array.isArray(data)) return data;
  return data.data || [];
};

const MessageList = ({
  activeRoom,
  setActiveRoom,
}: MessageListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [userResults, setUserResults] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Trạng thái cho Menu 3 chấm và Modal xác nhận xóa
  const [openMenuRoomId, setOpenMenuRoomId] = useState<string | null>(null);
  const [confirmDeleteRoom, setConfirmDeleteRoom] = useState<ChatRoom | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const processedMsgIdsRef = useRef<Set<string>>(new Set());

  const accessToken = useBearerTokenStore((state) => state.accessToken);
  const currentUser = useBearerTokenStore((state) => state.user);
  const socket = useMemo(() => getSocket(), []);

  // Đóng menu khi click ra ngoài (Click Outside)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuRoomId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tìm kiếm phòng chat & user
  useEffect(() => {
    if (!accessToken) return;

    const executeSearch = async () => {
      try {
        setLoading(true);
        const query = searchQuery.trim();

        // Lấy danh sách phòng chat (lọc theo tên phòng nếu có query)
        const roomsData = await getChatRooms(query);
        setRooms(unwrapList<ChatRoom>(roomsData));

        // Nếu có nhập search, tìm thêm danh sách User để có thể nhắn tin trực tiếp
        if (query) {
          setSearchingUsers(true);
          const usersData = await searchUsers(query);
          const rawUsers = unwrapList<User>(usersData);
          setUserResults(
            rawUsers.filter((u) => String(u._id) !== String(currentUser?._id)),
          );
        } else {
          setUserResults([]);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách chat:', err);
      } finally {
        setLoading(false);
        setSearchingUsers(false);
      }
    };

    if (!searchQuery.trim()) {
      executeSearch();
      return;
    }

    // Debounce tìm kiếm 300ms
    const timer = setTimeout(executeSearch, 300);
    return () => clearTimeout(timer);
  }, [accessToken, searchQuery, currentUser?._id]);

  // Lắng nghe socket: Tin nhắn mới, Đánh dấu đã đọc và Xóa phòng Realtime
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    if (currentUser?._id) {
      socket.emit('joinUser', { userId: String(currentUser._id) });
    }

    const handleNewMessage = (newMsg: Message) => {
      if (!newMsg?._id) return;

      // Deduplicate: Không xử lý lại tin nhắn đã nhận qua socket
      if (processedMsgIdsRef.current.has(newMsg._id)) {
        return;
      }
      processedMsgIdsRef.current.add(newMsg._id);
      if (processedMsgIdsRef.current.size > 200) {
        const first = processedMsgIdsRef.current.values().next().value;
        if (first) processedMsgIdsRef.current.delete(first);
      }

      const isViewingThisRoom = activeRoom && String(activeRoom._id) === String(newMsg.roomId);
      const isFromMe = String(getSenderId(newMsg.senderId || newMsg.sender)) === String(currentUser?._id);

      // Nếu đang mở xem phòng này và không phải do mình gửi -> tự động đánh dấu đã đọc
      if (isViewingThisRoom && !isFromMe) {
        markAsReadApi(newMsg.roomId).catch(() => {});
        socket.emit('markAsRead', { roomId: newMsg.roomId, userId: currentUser?._id });
      }

      setRooms((prevRooms) => {
        const targetRoomIndex = prevRooms.findIndex(
          (room) => String(room._id) === String(newMsg.roomId),
        );

        // NẾU PHÒNG CHƯA CÓ TRONG DANH SÁCH CỦA B (Phòng mới tạo) -> Tạo ngay phòng tạm thời và đồng thời gọi getRoomById
        if (targetRoomIndex === -1) {
          const senderObj =
            typeof newMsg.sender === 'object' && newMsg.sender
              ? newMsg.sender
              : typeof newMsg.senderId === 'object' && newMsg.senderId
              ? newMsg.senderId
              : null;

          const tempRoom: ChatRoom = {
            _id: String(newMsg.roomId),
            name: '',
            isGroup: false,
            members: senderObj ? [{ userId: senderObj, user: senderObj } as any] : [],
            lastMessage: newMsg,
            updatedAt: newMsg.createdAt || new Date().toISOString(),
            unreadCount: isViewingThisRoom || isFromMe ? 0 : 1,
          };

          getRoomById(String(newMsg.roomId))
            .then((res) => {
              const freshRoom: ChatRoom = 'data' in res ? res.data : res;
              if (freshRoom?._id) {
                setRooms((current) => {
                  const existingIdx = current.findIndex(
                    (r) => String(r._id) === String(freshRoom._id),
                  );
                  const updatedFresh: ChatRoom = {
                    ...freshRoom,
                    lastMessage: newMsg,
                    updatedAt: newMsg.createdAt || new Date().toISOString(),
                    unreadCount: isViewingThisRoom || isFromMe ? 0 : 1,
                  };
                  if (existingIdx !== -1) {
                    return current.map((r, idx) =>
                      idx === existingIdx ? { ...r, ...updatedFresh } : r,
                    );
                  }
                  return [updatedFresh, ...current];
                });
              }
            })
            .catch(() => {
              getChatRooms().then((roomsData) => setRooms(unwrapList<ChatRoom>(roomsData)));
            });

          return [tempRoom, ...prevRooms];
        }

        const targetRoom = prevRooms[targetRoomIndex];

        // Bảo vệ bổ sung: Nếu tin nhắn mới trùng với lastMessage hiện tại của phòng thì không tăng unreadCount
        const isDuplicateMsg =
          targetRoom.lastMessage?._id &&
          String(targetRoom.lastMessage._id) === String(newMsg._id);
        if (isDuplicateMsg) {
          return prevRooms;
        }

        const newUnreadCount =
          isViewingThisRoom || isFromMe
            ? 0
            : (targetRoom.unreadCount || 0) + 1;

        // Cập nhật thông tin sender vào members mà không làm mất các thành viên khác
        let updatedMembers = targetRoom.members ? [...targetRoom.members] : [];
        const senderObj =
          typeof newMsg.sender === 'object' && newMsg.sender
            ? newMsg.sender
            : typeof newMsg.senderId === 'object' && newMsg.senderId
            ? newMsg.senderId
            : null;

        if (senderObj && (senderObj as any)._id) {
          const senderIdStr = String((senderObj as any)._id);
          const existingMemberIdx = updatedMembers.findIndex(
            (m: any) => getMemberUserId(m) === senderIdStr,
          );
          if (existingMemberIdx !== -1) {
            updatedMembers[existingMemberIdx] = {
              ...updatedMembers[existingMemberIdx],
              user: senderObj,
              userId: senderObj,
            };
          } else if (updatedMembers.length === 0) {
            updatedMembers = [{ userId: senderObj, user: senderObj } as any];
          }
        }

        const updatedRoom: ChatRoom = {
          ...targetRoom,
          members: updatedMembers,
          lastMessage: newMsg,
          updatedAt: newMsg.createdAt || new Date().toISOString(),
          unreadCount: newUnreadCount,
        };

        // Đẩy phòng có tin nhắn mới lên đầu
        return [
          updatedRoom,
          ...prevRooms.filter((_, idx) => idx !== targetRoomIndex),
        ];
      });
    };

    const handleRoomRead = (data: { roomId: string; userId: string; lastReadAt: string }) => {
      if (String(data.userId) === String(currentUser?._id)) {
        setRooms((prev) =>
          prev.map((r) =>
            String(r._id) === String(data.roomId)
              ? { ...r, unreadCount: 0, lastReadAt: data.lastReadAt }
              : r
          )
        );
      }
    };

    const handleRoomDeleted = (data: { roomId: string; userId?: string; entirely?: boolean }) => {
      // Chỉ xử lý nếu chủ phòng giải tán nhóm (entirely: true) HOẶC chính mình bấm xóa (data.userId === currentUser._id)
      const isForMe = data.entirely || (data.userId && String(data.userId) === String(currentUser?._id));
      if (!isForMe) return;

      setRooms((prev) => prev.filter((r) => String(r._id) !== String(data.roomId)));
      if (activeRoom && String(activeRoom._id) === String(data.roomId)) {
        setActiveRoom(null as any);
      }
    };

    const handleMessageDeleted = (data: { messageId: string; roomId: string }) => {
      setRooms((prev) =>
        prev.map((r) => {
          if (String(r._id) === String(data.roomId) && r.lastMessage?._id === data.messageId) {
            return {
              ...r,
              lastMessage: {
                ...r.lastMessage,
                content: 'Tin nhắn đã bị thu hồi',
              },
            };
          }
          return r;
        })
      );
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('newRoomMessage', handleNewMessage);
    socket.on('roomRead', handleRoomRead);
    socket.on('roomDeleted', handleRoomDeleted);
    socket.on('messageDeleted', handleMessageDeleted);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('newRoomMessage', handleNewMessage);
      socket.off('roomRead', handleRoomRead);
      socket.off('roomDeleted', handleRoomDeleted);
      socket.off('messageDeleted', handleMessageDeleted);
    };
  }, [socket, activeRoom, currentUser?._id, setActiveRoom]);

  // Xử lý khi bấm chọn phòng chat
  const handleSelectRoom = async (room: ChatRoom) => {
    setActiveRoom(room);

    // Nếu phòng có tin nhắn chưa đọc -> tự động đánh dấu đã đọc
    if (room.unreadCount && room.unreadCount > 0) {
      setRooms((prev) =>
        prev.map((r) =>
          r._id === room._id
            ? { ...r, unreadCount: 0, lastReadAt: new Date().toISOString() }
            : r
        )
      );
      try {
        await markAsReadApi(room._id);
        socket.emit('markAsRead', { roomId: room._id, userId: currentUser?._id });
      } catch (err) {
        console.error('Lỗi khi tự động đánh dấu đã đọc:', err);
      }
    }
  };

  // Bật/tắt Menu 3 chấm
  const handleToggleMenu = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    setOpenMenuRoomId((prev) => (prev === roomId ? null : roomId));
  };

  // Xử lý nút "Đánh dấu đã đọc" từ menu
  const handleMarkAsRead = async (e: React.MouseEvent, room: ChatRoom) => {
    e.stopPropagation();
    setOpenMenuRoomId(null);

    // Cập nhật UI ngay lập tức
    setRooms((prev) =>
      prev.map((r) =>
        r._id === room._id
          ? { ...r, unreadCount: 0, lastReadAt: new Date().toISOString() }
          : r
      )
    );

    try {
      await markAsReadApi(room._id);
      socket.emit('markAsRead', { roomId: room._id, userId: currentUser?._id });
      toast.success('Đã đánh dấu đã đọc');
    } catch (err) {
      toast.error('Không thể đánh dấu đã đọc');
    }
  };

  // Mở modal xác nhận xóa phòng
  const handleOpenDeleteModal = (e: React.MouseEvent, room: ChatRoom) => {
    e.stopPropagation();
    setOpenMenuRoomId(null);
    setConfirmDeleteRoom(room);
  };

  // Xác nhận xóa cuộc trò chuyện
  const handleConfirmDelete = async () => {
    if (!confirmDeleteRoom) return;
    const targetRoomId = confirmDeleteRoom._id;

    try {
      await deleteRoomApi(targetRoomId);
      setRooms((prev) => prev.filter((r) => r._id !== targetRoomId));

      if (activeRoom && activeRoom._id === targetRoomId) {
        setActiveRoom(null as any);
      }

      toast.success('Đã xóa cuộc trò chuyện');
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa cuộc trò chuyện');
    } finally {
      setConfirmDeleteRoom(null);
    }
  };

  // Xử lý khi bấm vào 1 User trong kết quả tìm kiếm -> Mở Direct Chat ngay lập tức (KHÔNG POPUP)
  const handleSelectUser = async (targetUser: User) => {
    try {
      // Kiểm tra xem đã có phòng chat 1-1 với user này chưa
      const existingRoom = findDirectRoomWithUser(rooms, targetUser);

      if (existingRoom) {
        setActiveRoom(existingRoom);
        setSearchQuery('');
        return;
      }

      // Nếu chưa có, tạo mới phòng chat 1-1
      const created = (await createChatRoom({
        name: 'Direct Chat',
        memberIds: [targetUser._id],
      })) as ChatRoom | { data: ChatRoom };
      const newRoom: ChatRoom =
        'data' in created && created.data?._id ? created.data : (created as ChatRoom);

      // Đảm bảo mảng members có đầy đủ thông tin kể cả khi vừa tạo xong
      if (!newRoom.isGroup) {
        if (!newRoom.members || newRoom.members.length === 0) {
          newRoom.members = [
            { userId: currentUser, user: currentUser },
            { userId: targetUser, user: targetUser },
          ] as any;
        } else {
          const hasPopulated = newRoom.members.some(
            (m: any) => m.userId?.name || m.user?.name || m.name
          );
          if (!hasPopulated) {
            newRoom.members = [
              { userId: currentUser, user: currentUser },
              { userId: targetUser, user: targetUser },
            ] as any;
          }
        }
      }

      setRooms((prev) => [
        newRoom,
        ...prev.filter((room) => String(room._id) !== String(newRoom._id)),
      ]);
      setActiveRoom(newRoom);
      setSearchQuery('');
    } catch (err) {
      console.error('Lỗi khi tạo direct chat:', err);
    }
  };

  // Lọc kết quả tìm kiếm MỌI NGƯỜI để loại bỏ những người đã có phòng chat 1-1
  const existingDirectUserIds = useMemo(() => {
    return new Set(
      rooms
        .filter((room) => !room.isGroup && room.members?.length === 2)
        .flatMap((room) => room.members || [])
        .map((member: any) => String(member.user?._id || member.userId?._id || member.userId || member._id))
    );
  }, [rooms]);

  const filteredUserResults = useMemo(() => {
    return userResults.filter(
      (user) => !existingDirectUserIds.has(String(user._id))
    );
  }, [userResults, existingDirectUserIds]);

  return (
    <div className="w-full h-full bg-white flex flex-col p-4 select-none min-h-0">
      <div className="flex items-center justify-between mb-3.5 shrink-0 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Tin nhắn
          </h2>
          <span className="px-2 py-0.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/60 rounded-full">
            {rooms.length}
          </span>
        </div>
      </div>

      <div className="relative flex items-center mb-3.5 shrink-0">
        <IoMdSearch className="absolute left-3.5 text-slate-400 text-lg pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm phòng hoặc bạn bè..."
          className="w-full pl-10 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 bg-slate-50 border border-slate-200/70 rounded-2xl focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
        {loading ? (
          <Spinner loading={loading} />
        ) : (
          <>
            {/* Hiển thị kết quả tìm kiếm người dùng (Direct Chat) */}
            {searchQuery.trim() && (
              <div>
                <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2 px-1">
                  Mọi người ({filteredUserResults.length})
                </p>
                {searchingUsers ? (
                  <p className="text-xs text-slate-400 px-1">Đang tìm...</p>
                ) : filteredUserResults.length === 0 ? (
                  <p className="text-xs text-slate-400 px-1">Không tìm thấy ai mới</p>
                ) : (
                  <div className="space-y-1">
                    {filteredUserResults.map((user) => (
                      <button
                        type="button"
                        key={user._id}
                        onClick={() => handleSelectUser(user)}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition w-full text-left"
                      >
                        <UserAvatar name={user.name} avatar={user.avatar} size="sm" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-slate-800 truncate">{user.name}</span>
                          <span className="text-[10px] text-slate-400 truncate">{user.email}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Danh sách phòng chat */}
            <div>
              <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2 px-1">
                {searchQuery.trim() ? 'Phòng chat' : 'Gần đây'}
              </p>

              {rooms.length === 0 ? (
                <p className="text-xs text-slate-400 px-1 py-2">
                  Chưa có phòng chat nào.
                </p>
              ) : (
                <div className="space-y-1">
                  {rooms.map((item) => {
                    const isSelected = activeRoom?._id === item._id;
                    const senderId = getSenderId(
                      item.lastMessage?.senderId || item.lastMessage?.sender,
                    );
                    const isMe = String(currentUser?._id) === String(senderId);
                    const roomDisplayName = getRoomDisplayName(item, currentUser?._id);
                    const roomAvatar = getRoomAvatar(item, currentUser?._id);
                    const hasUnread = Boolean(item.unreadCount && item.unreadCount > 0);

                    return (
                      <div
                        key={item._id}
                        onClick={() => handleSelectRoom(item)}
                        className={`group relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all w-full text-left ${
                          isSelected
                            ? 'bg-indigo-50/70'
                            : 'hover:bg-slate-50/80 bg-transparent'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <UserAvatar
                            name={roomDisplayName}
                            avatar={roomAvatar}
                            size="md"
                            className="w-10 h-10"
                          />
                          {hasUnread && (
                            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-indigo-600 border-2 border-white rounded-full" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <h4
                              className={`text-sm truncate ${
                                hasUnread
                                  ? 'font-bold text-slate-900'
                                  : 'font-semibold text-slate-800'
                              }`}
                            >
                              {roomDisplayName}
                            </h4>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <span
                                className={`text-[11px] ${
                                  hasUnread
                                    ? 'font-bold text-indigo-600'
                                    : 'text-slate-400'
                                }`}
                              >
                                {formatMessageTime(item.updatedAt)}
                              </span>

                              {/* Nút 3 chấm mở menu */}
                              <div
                                className="relative"
                                ref={openMenuRoomId === item._id ? menuRef : null}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleMenu(e, item._id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 opacity-0 group-hover:opacity-100 max-sm:opacity-70 transition cursor-pointer"
                                  title="Tùy chọn"
                                >
                                  <FiMoreVertical className="text-sm" />
                                </button>

                                {/* Dropdown Menu 3 chấm */}
                                {openMenuRoomId === item._id && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-7 z-30 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 animate-in fade-in zoom-in-95 duration-100"
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => handleMarkAsRead(e, item)}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                    >
                                      <FiCheck className="text-indigo-600 text-sm" />
                                      <span>Đánh dấu đã đọc</span>
                                    </button>
                                    <div className="h-px bg-slate-100 my-1" />
                                    <button
                                      type="button"
                                      onClick={(e) => handleOpenDeleteModal(e, item)}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                    >
                                      <FiTrash2 className="text-sm" />
                                      <span>Xóa cuộc trò chuyện</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={`text-xs truncate ${
                                hasUnread
                                  ? 'font-semibold text-slate-900'
                                  : 'text-slate-400'
                              }`}
                            >
                              {isMe && (
                                <span className="font-medium text-slate-600 mr-1">
                                  Bạn:
                                </span>
                              )}
                              {getMessagePreview(item.lastMessage)}
                            </p>

                            {/* Badge số tin nhắn chưa đọc */}
                            {hasUnread && (
                              <span className="px-2 py-0.5 min-w-5 h-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
                                {item.unreadCount! > 99 ? '99+' : item.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal xác nhận xóa cuộc trò chuyện */}
      {confirmDeleteRoom && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 text-2xl">
              <FiTrash2 />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Xóa cuộc trò chuyện?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Bạn có chắc chắn muốn xóa cuộc trò chuyện với{' '}
              <span className="font-semibold text-slate-800">
                {getRoomDisplayName(confirmDeleteRoom, currentUser?._id)}
              </span>
              ? Cuộc trò chuyện này sẽ biến mất khỏi danh sách của bạn.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteRoom(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-200 transition cursor-pointer"
              >
                Xóa trò chuyện
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;
