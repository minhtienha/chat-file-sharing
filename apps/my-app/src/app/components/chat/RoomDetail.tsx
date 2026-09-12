import { useState, useEffect, useMemo } from 'react';
import {
  FiX,
  FiUserPlus,
  FiLogOut,
  FiTrash2,
  FiFile,
  FiDownload,
  FiCheck,
  FiArrowLeft,
  FiImage,
  FiExternalLink,
  FiFileText,
  FiArchive,
  FiCode,
  FiUsers,
  FiSearch,
} from 'react-icons/fi';
import { ChatRoom, User } from '../../types/index';
import { useBearerTokenStore } from '../../stores/auth.store';
import {
  getRoomById,
  getRoomAttachments,
  addMembers,
  leaveRoom,
  deleteRoomEntirely,
  deleteRoomApi,
  searchUsers,
  createChatRoom,
} from '../../services/chatRoom.service';
import Spinner from '../common/Spinner';
import UserAvatar from '../common/UserAvatar';
import { getPreviewUrl, getDownloadUrl } from '../../services/drive.service';
import { formatFileSize } from '../../utils/formatFileSize';
import { getSocket } from '../../services/socket';
import { isGroupRoom } from '../../utils/chatNameHelper';

interface RoomDetailProps {
  currentRoom: ChatRoom;
  isOpen: boolean;
  onClose: () => void;
  onRoomDeleted: () => void;
  onRoomCreated?: (newRoom: ChatRoom) => void;
  refreshTrigger?: number;
}

export const RoomDetail = ({
  currentRoom,
  isOpen,
  onClose,
  onRoomDeleted,
  onRoomCreated,
  refreshTrigger = 0,
}: RoomDetailProps) => {
  const [activeTab, setActiveTab] = useState<'MEDIA' | 'FILES'>('MEDIA');
  const [members, setMembers] = useState<User[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Lightbox xem ảnh/media phóng to
  const [previewMedia, setPreviewMedia] = useState<any | null>(null);

  // Modal danh sách thành viên nhóm
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  const currentUser = useBearerTokenStore((state) => state.user);
  const isCreator = currentRoom.createdBy === currentUser?._id;
  const isGroupChat = Boolean(isGroupRoom(currentRoom) || members.length > 2);

  // Thông tin đối phương trong chat 1-1
  const partner = useMemo(() => {
    return members.find((m) => String(m._id) !== String(currentUser?._id));
  }, [members, currentUser?._id]);

  const partnerName = partner?.name || (currentRoom.name && currentRoom.name !== 'Direct Chat' ? currentRoom.name : 'đối phương');
  const partnerAvatar = partner?.avatar;

  // Modal State cho Tạo nhóm / Thêm thành viên
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [modalSearchResults, setModalSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tải thông tin phòng và danh sách tệp đính kèm
  useEffect(() => {
    if (!isOpen || !currentRoom?._id) return;

    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [roomData, atts] = await Promise.all([
          getRoomById(currentRoom._id).catch(() => null),
          getRoomAttachments(currentRoom._id).catch(() => []),
        ]);

        if (!isMounted) return;

        if (roomData?.members) {
          const mems = roomData.members
            .map((m: any) => m.user || m.userId)
            .filter((u: any) => Boolean(u && typeof u === 'object'));
          setMembers(mems);
        }

        setAttachments(Array.isArray(atts) ? atts : []);
      } catch (err) {
        console.error('Lỗi khi lấy chi tiết phòng:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentRoom?._id, refreshTrigger]);

  // Lắng nghe socket Realtime: Nếu có tin nhắn mới chứa file, tự động cập nhật danh sách
  useEffect(() => {
    if (!isOpen || !currentRoom?._id) return;
    const socket = getSocket();

    const handleNewMessage = (data: any) => {
      const msg = data?.message || data;
      const msgRoomId = msg?.roomId?._id || msg?.roomId;
      if (String(msgRoomId) === String(currentRoom._id)) {
        getRoomAttachments(currentRoom._id)
          .then((atts) => {
            if (Array.isArray(atts)) setAttachments(atts);
          })
          .catch(() => {});
      }
    };

    socket.on('newMessage', handleNewMessage);
    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, [isOpen, currentRoom?._id]);

  // Phân loại tệp: Ảnh/Media vs Tài liệu
  const isMediaFile = (file: any): boolean => {
    const type = file.contentType || file.mimeType || '';
    if (type.startsWith('image/') || type.startsWith('video/')) {
      return true;
    }
    const name = (file.name || file.filename || '').toLowerCase();
    return /\.(jpe?g|png|gif|webp|bmp|svg|mp4|mov|webm|avi|mkv|heic)$/i.test(name);
  };

  const mediaFiles = useMemo(() => {
    return attachments.filter(isMediaFile);
  }, [attachments]);

  const documentFiles = useMemo(() => {
    return attachments.filter((a) => !isMediaFile(a));
  }, [attachments]);

  // Debounce search in Modal thêm thành viên
  useEffect(() => {
    if (!showAddModal) {
      setModalSearch('');
      setModalSearchResults([]);
      setSelectedUsers([]);
      setGroupName('');
      return;
    }
    if (!modalSearch.trim()) {
      setModalSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchUsers(modalSearch);
        const data = Array.isArray(res) ? res : res.data || [];
        const filtered = data.filter(
          (u: User) => !members.some((m) => m._id === u._id) && u._id !== currentUser?._id
        );
        setModalSearchResults(filtered);
      } catch (err) {
        // Bỏ qua lỗi tìm kiếm
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [modalSearch, members, currentUser?._id, showAddModal]);

  const toggleSelectUser = (user: User) => {
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u._id === user._id);
      if (exists) return prev.filter((u) => u._id !== user._id);
      return [...prev, user];
    });
  };

  const handleConfirmAddMembers = async () => {
    if (selectedUsers.length === 0) return;
    setIsSubmitting(true);
    try {
      const selectedIds = selectedUsers.map((u) => u._id);

      if (isGroupChat) {
        await addMembers(currentRoom._id, selectedIds);
        setMembers((prev) => [...prev, ...selectedUsers]);
        setShowAddModal(false);
      } else {
        const allMemberIds = [partner?._id, ...selectedIds].filter(Boolean) as string[];
        const finalGroupName = groupName.trim() || `Nhóm với ${partnerName}`;

        const created = await createChatRoom({
          name: finalGroupName,
          memberIds: allMemberIds,
        });

        const newRoom = 'data' in created ? created.data : created;
        setShowAddModal(false);
        if (onRoomCreated) onRoomCreated(newRoom);
      }
    } catch (error) {
      alert('Đã xảy ra lỗi, vui lòng thử lại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const isGroup = isGroupChat;
    const confirmMsg = isGroup
      ? (isCreator ? 'Bạn có chắc chắn muốn xóa nhóm này? Toàn bộ tin nhắn và phòng sẽ bị xóa.' : 'Bạn có chắc chắn muốn rời khỏi nhóm?')
      : 'Bạn có chắc chắn muốn xóa đoạn chat này không?';

    if (!window.confirm(confirmMsg)) return;

    try {
      if (isGroup) {
        if (isCreator) {
          await deleteRoomEntirely(currentRoom._id);
        } else {
          await leaveRoom(currentRoom._id);
        }
      } else {
        // Chat 1-1: Xóa phía người dùng (soft delete / leave)
        await deleteRoomApi(currentRoom._id);
      }
      onClose();
      onRoomDeleted();
    } catch (err: any) {
      alert(err?.message || 'Đã xảy ra lỗi khi xóa');
    }
  };

  // Icon và màu sắc cho các định dạng file tài liệu
  const getFileStyle = (filename: string) => {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    if (['pdf'].includes(ext)) {
      return { icon: <FiFileText className="text-xl" />, bg: 'bg-rose-50 text-rose-600', badge: 'PDF' };
    }
    if (['doc', 'docx'].includes(ext)) {
      return { icon: <FiFileText className="text-xl" />, bg: 'bg-blue-50 text-blue-600', badge: 'DOC' };
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return { icon: <FiFileText className="text-xl" />, bg: 'bg-emerald-50 text-emerald-600', badge: 'XLS' };
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return { icon: <FiArchive className="text-xl" />, bg: 'bg-amber-50 text-amber-600', badge: 'ZIP' };
    }
    if (['js', 'ts', 'tsx', 'jsx', 'json', 'py', 'html', 'css'].includes(ext)) {
      return { icon: <FiCode className="text-xl" />, bg: 'bg-purple-50 text-purple-600', badge: ext.toUpperCase() };
    }
    return { icon: <FiFile className="text-xl" />, bg: 'bg-indigo-50 text-indigo-600', badge: 'FILE' };
  };

  // Danh sách thành viên nhóm được lọc theo ô tìm kiếm
  const filteredGroupMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return members;
    const q = memberSearchQuery.toLowerCase();
    return members.filter(
      (m) => m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)
    );
  }, [members, memberSearchQuery]);

  if (!isOpen) return null;

  return (
    <>
      {/* Khung Drawer / Sidebar chi tiết phòng */}
      <div className="fixed inset-0 z-50 bg-white flex flex-col lg:static lg:w-80 lg:inset-auto lg:border-l lg:border-slate-100 lg:z-auto transition-transform select-none">
        
        {/* Header Drawer */}
        <div className="h-14 lg:h-16 border-b border-slate-100 flex items-center justify-between px-4 shrink-0 bg-white shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-2 -ml-1 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer shrink-0"
              title="Quay lại"
            >
              <FiArrowLeft className="text-xl" />
            </button>
            <h3 className="font-bold text-slate-800 text-sm lg:text-base truncate">
              Thông tin cuộc trò chuyện
            </h3>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="hidden lg:flex p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            title="Đóng"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Nội dung chi tiết */}
        <div className="flex-1 overflow-y-auto bg-slate-50/60 p-4 space-y-5">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Spinner loading={loading} />
            </div>
          ) : (
            <>
              {/* KHỐI PROFILE / THÔNG TIN ĐẦU TRANG */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-3xl border border-slate-100 shadow-xs text-center">
                <div className="relative mb-3">
                  {isGroupChat ? (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xl shadow-md border-2 border-white">
                      <FiUsers className="text-2xl" />
                    </div>
                  ) : (
                    <UserAvatar
                      name={partnerName}
                      avatar={partnerAvatar}
                      size="xl"
                      className="border-2 border-white shadow-md"
                    />
                  )}
                  {!isGroupChat && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                  )}
                </div>

                <h4 className="font-bold text-slate-900 text-base leading-snug truncate max-w-full px-2">
                  {isGroupChat ? (currentRoom.name || 'Nhóm trò chuyện') : partnerName}
                </h4>

                <p className="text-xs text-slate-400 mt-0.5">
                  {isGroupChat ? `${members.length} thành viên` : 'Đang hoạt động'}
                </p>
              </div>

              {/* KHỐI HÀNH ĐỘNG (ACTION MENU) NHƯ TRONG ẢNH */}
              <div className="bg-white rounded-3xl border border-slate-100 p-1.5 shadow-xs space-y-1">
                {/* 1. NẾU LÀ CHAT 1-1: Tạo nhóm chat với [Tên] */}
                {!isGroupChat && (
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl hover:bg-slate-50 transition text-slate-700 font-medium text-xs text-left cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FiUsers className="text-base" />
                    </div>
                    <span className="truncate font-semibold text-slate-800">
                      Tạo nhóm chat với {partnerName}
                    </span>
                  </button>
                )}

                {/* 2. NẾU LÀ NHÓM: Nút xem thành viên & Thêm thành viên */}
                {isGroupChat && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowMembersModal(true)}
                      className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl hover:bg-slate-50 transition text-slate-700 font-medium text-xs text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <FiUsers className="text-base" />
                        </div>
                        <span className="font-semibold text-slate-800 truncate">
                          Xem thành viên
                        </span>
                      </div>
                      <span className="px-2 py-0.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 rounded-full border border-indigo-100">
                        {members.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAddModal(true)}
                      className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl hover:bg-slate-50 transition text-slate-700 font-medium text-xs text-left cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FiUserPlus className="text-base" />
                      </div>
                      <span className="font-semibold text-slate-800 truncate">
                        Thêm thành viên vào nhóm
                      </span>
                    </button>
                  </>
                )}

                <div className="my-1 border-t border-slate-100/80" />

                {/* 3. NÚT XÓA ĐOẠN CHAT / RỜI NHÓM (MÀU ĐỎ NHƯ HÌNH) */}
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl hover:bg-rose-50/70 transition text-rose-600 font-semibold text-xs text-left cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {isGroupChat && !isCreator ? <FiLogOut className="text-base" /> : <FiTrash2 className="text-base" />}
                  </div>
                  <span>
                    {isGroupChat ? (isCreator ? 'Xóa nhóm' : 'Rời nhóm') : 'Xóa đoạn chat'}
                  </span>
                </button>
              </div>

              {/* KHỐI FILE & MEDIA CHIA SẺ */}
              <div className="bg-white rounded-3xl border border-slate-100 p-4 shadow-xs space-y-4">
                {/* 2 Tabs: Ảnh vs Tài liệu */}
                <div className="flex bg-slate-50 p-1 rounded-2xl gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('MEDIA')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      activeTab === 'MEDIA'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Ảnh ({mediaFiles.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('FILES')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      activeTab === 'FILES'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Tài liệu ({documentFiles.length})
                  </button>
                </div>

                {/* TAB ẢNH & MEDIA */}
                {activeTab === 'MEDIA' && (
                  <div>
                    {mediaFiles.length === 0 ? (
                      <div className="text-center py-8 px-2 text-slate-400">
                        <FiImage className="text-3xl mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-medium">Chưa có ảnh nào được chia sẻ</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {mediaFiles.map((file, idx) => {
                          const fileId = file.gridfsFileId || file.fileId;
                          const previewUrl = getPreviewUrl(fileId);
                          const isVideo = file.contentType?.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name || '');

                          return (
                            <div
                              key={fileId || idx}
                              onClick={() => setPreviewMedia(file)}
                              className="aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200/60 hover:opacity-90 hover:scale-[1.02] transition duration-200 shadow-xs relative group cursor-pointer"
                            >
                              {isVideo ? (
                                <video
                                  src={previewUrl}
                                  className="w-full h-full object-cover pointer-events-none"
                                />
                              ) : (
                                <img
                                  src={previewUrl}
                                  alt={file.name || 'Ảnh đính kèm'}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              )}
                              <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <span className="p-1.5 rounded-full bg-white/90 text-slate-800 shadow-sm text-xs">
                                  <FiExternalLink />
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB TÀI LIỆU */}
                {activeTab === 'FILES' && (
                  <div>
                    {documentFiles.length === 0 ? (
                      <div className="text-center py-8 px-2 text-slate-400">
                        <FiFile className="text-3xl mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-medium">Chưa có tài liệu nào được gửi</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {documentFiles.map((file, idx) => {
                          const fileId = file.gridfsFileId || file.fileId;
                          const downloadUrl = getDownloadUrl(fileId);
                          const style = getFileStyle(file.name || 'file');

                          return (
                            <div
                              key={fileId || idx}
                              className="flex items-center gap-3 p-2.5 bg-slate-50/70 border border-slate-200/60 rounded-2xl hover:border-indigo-200 hover:bg-white transition"
                            >
                              <div className={`w-9 h-9 rounded-xl ${style.bg} flex items-center justify-center shrink-0`}>
                                {style.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-800 truncate" title={file.name}>
                                  {file.name || 'Tệp đính kèm'}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {formatFileSize(file.size)}
                                </p>
                              </div>
                              <a
                                href={downloadUrl}
                                download={file.name || 'download'}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                                title="Tải về máy"
                              >
                                <FiDownload className="text-base shrink-0" />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL XEM THÀNH VIÊN NHÓM (DÀNH CHO NHÓM CHAT) */}
      {showMembersModal && isGroupChat && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FiUsers className="text-base" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Thành viên nhóm ({members.length})
                </h3>
              </div>
              <button
                onClick={() => setShowMembersModal(false)}
                className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-xl transition cursor-pointer"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            {/* Ô tìm kiếm thành viên trong nhóm */}
            {members.length > 4 && (
              <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                <div className="relative flex items-center">
                  <FiSearch className="absolute left-3.5 text-slate-400 text-sm pointer-events-none" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Tìm thành viên trong nhóm..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Danh sách thành viên */}
            <div className="p-3 flex-1 overflow-y-auto space-y-1">
              {filteredGroupMembers.map((m) => {
                const displayName = m.name || m.email?.split('@')[0] || 'Thành viên';
                const isMe = m._id === currentUser?._id;
                const isOwner = currentRoom.createdBy === m._id;

                return (
                  <div
                    key={m._id}
                    className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar name={displayName} avatar={m.avatar} size="md" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate flex items-center gap-1.5">
                          <span className="truncate">{displayName}</span>
                          {isMe && <span className="text-indigo-500 font-medium shrink-0">(Bạn)</span>}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{m.email}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-lg shrink-0 border ${
                        isOwner
                          ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                          : 'bg-slate-50 text-slate-500 border-slate-100'
                      }`}
                    >
                      {isOwner ? 'Chủ phòng' : 'Thành viên'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer Modal: Nút Thêm thành viên */}
            <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setShowMembersModal(false);
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition cursor-pointer"
              >
                <FiUserPlus />
                <span>Thêm thành viên</span>
              </button>

              <button
                onClick={() => setShowMembersModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal cho Ảnh / Media */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-md flex flex-col p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="flex items-center justify-between text-white pb-3 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 pr-4">
              <h4 className="text-sm font-semibold truncate text-slate-100">{previewMedia.name}</h4>
              <p className="text-xs text-slate-400">{formatFileSize(previewMedia.size)}</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={getDownloadUrl(previewMedia.gridfsFileId || previewMedia.fileId)}
                download={previewMedia.name}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition cursor-pointer"
                title="Tải xuống"
              >
                <FiDownload className="text-base" />
              </a>
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition cursor-pointer"
                title="Đóng"
              >
                <FiX className="text-lg" />
              </button>
            </div>
          </div>

          <div
            className="flex-1 flex items-center justify-center min-h-0 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {previewMedia.contentType?.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(previewMedia.name || '') ? (
              <video
                src={getPreviewUrl(previewMedia.gridfsFileId || previewMedia.fileId)}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-2xl shadow-2xl"
              />
            ) : (
              <img
                src={getPreviewUrl(previewMedia.gridfsFileId || previewMedia.fileId)}
                alt={previewMedia.name}
                className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl"
              />
            )}
          </div>
        </div>
      )}

      {/* Modal: Thêm thành viên / Tạo nhóm */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">
                {isGroupChat ? 'Thêm thành viên vào nhóm' : `Tạo nhóm chat với ${partnerName}`}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-xl transition cursor-pointer"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              {!isGroupChat && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Tên nhóm mới</label>
                  <input
                    type="text"
                    placeholder={`VD: Nhóm với ${partnerName}...`}
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Tìm kiếm bạn bè</label>
                <input
                  type="text"
                  placeholder="Nhập tên người dùng cần thêm..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition"
                />
              </div>

              {/* Danh sách người được chọn */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((u) => (
                    <div
                      key={u._id}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-xl font-medium border border-indigo-100"
                    >
                      {u.name}
                      <button onClick={() => toggleSelectUser(u)} className="hover:text-rose-500 cursor-pointer">
                        <FiX />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Kết quả tìm kiếm */}
              <div className="space-y-1">
                {isSearching ? (
                  <p className="text-xs text-slate-400 text-center py-4">Đang tìm kiếm...</p>
                ) : modalSearch.trim() && modalSearchResults.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Không tìm thấy người dùng</p>
                ) : (
                  modalSearchResults.map((u) => {
                    const isSelected = selectedUsers.some((su) => su._id === u._id);
                    return (
                      <button
                        key={u._id}
                        onClick={() => toggleSelectUser(u)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl transition border cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-200'
                            : 'bg-white border-transparent hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <UserAvatar name={u.name} avatar={u.avatar} size="sm" />
                          <div className="text-left">
                            <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                            <p className="text-[10px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                        {isSelected && <FiCheck className="text-indigo-600 font-bold" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                disabled={selectedUsers.length === 0 || isSubmitting}
                onClick={handleConfirmAddMembers}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer shadow-sm shadow-indigo-100"
              >
                {isSubmitting ? 'Đang xử lý...' : isGroupChat ? 'Thêm vào nhóm' : 'Tạo nhóm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RoomDetail;
