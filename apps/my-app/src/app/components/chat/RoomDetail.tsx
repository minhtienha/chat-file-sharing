import { useState, useEffect } from 'react';
import { FiX, FiUserPlus, FiLogOut, FiTrash2, FiFile, FiDownload, FiCheck } from 'react-icons/fi';
import { ChatRoom, User } from '../../types/index';
import { useBearerTokenStore } from '../../stores/auth.store';
import {
  getRoomById,
  getRoomAttachments,
  addMembers,
  leaveRoom,
  deleteRoomEntirely,
  searchUsers,
  createChatRoom,
} from '../../services/chatRoom.service';
import Spinner from '../common/Spinner';
import { getPreviewUrl, getDownloadUrl } from '../../services/drive.service';

interface RoomDetailProps {
  currentRoom: ChatRoom;
  isOpen: boolean;
  onClose: () => void;
  onRoomDeleted: () => void;
  onRoomCreated?: (newRoom: ChatRoom) => void;
}

export const RoomDetail = ({ currentRoom, isOpen, onClose, onRoomDeleted, onRoomCreated }: RoomDetailProps) => {
  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'MEDIA' | 'FILES'>('MEMBERS');
  const [members, setMembers] = useState<User[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const currentUser = useBearerTokenStore((state) => state.user);
  const isCreator = currentRoom.createdBy === currentUser?._id;
  const isGroupChat = members.length > 2 || currentRoom.isGroup;

  // Modal State cho Tạo nhóm / Thêm thành viên
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [modalSearchResults, setModalSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !currentRoom?._id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const roomData = await getRoomById(currentRoom._id);
        const mems = roomData?.members?.map((m: any) => m.user || m.userId).filter((u: any) => Boolean(u && typeof u === 'object')) || [];
        setMembers(mems);

        const atts = await getRoomAttachments(currentRoom._id);
        setAttachments(atts || []);
      } catch (err) {
        console.error('Lỗi lấy chi tiết phòng:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isOpen, currentRoom?._id]);

  // Debounce search in Modal
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
        // Lọc người đã có trong phòng và chính mình
        const filtered = data.filter(
          (u: User) => !members.some((m) => m._id === u._id) && u._id !== currentUser?._id
        );
        setModalSearchResults(filtered);
      } catch (err) {}
      finally { setIsSearching(false); }
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
      const selectedIds = selectedUsers.map(u => u._id);

      if (isGroupChat) {
        // Nếu đã là Group: Thêm trực tiếp vào phòng hiện tại
        await addMembers(currentRoom._id, selectedIds);
        setMembers((prev) => [...prev, ...selectedUsers]);
        setShowAddModal(false);
      } else {
        // Nếu là Direct Chat (1-1): Tạo nhóm mới
        const partner = members.find(m => m._id !== currentUser?._id);
        const allMemberIds = [
          partner?._id, // Người trong phòng 1-1
          ...selectedIds
        ].filter(Boolean) as string[];

        const finalGroupName = groupName.trim() || 'Nhóm mới';

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

  const handleLeave = async () => {
    if (!window.confirm('Bạn có chắc muốn rời nhóm?')) return;
    try {
      await leaveRoom(currentRoom._id);
      onRoomDeleted();
    } catch (err) {
      alert('Lỗi rời phòng');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Hành động này sẽ xóa phòng với TẤT CẢ mọi người. Tiếp tục?')) return;
    try {
      await deleteRoomEntirely(currentRoom._id);
      onRoomDeleted();
    } catch (err) {
      alert('Lỗi xóa phòng');
    }
  };

  if (!isOpen) return null;

  const mediaFiles = attachments.filter((a) => a.contentType?.startsWith('image/'));
  const otherFiles = attachments.filter((a) => !a.contentType?.startsWith('image/'));

  return (
    <>
      {/* Nền xám mờ trên Mobile */}
      <div className="fixed inset-0 bg-slate-900/20 z-40 lg:hidden" onClick={onClose} />

      {/* Drawer / Panel chính */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white border-l border-slate-100 shadow-2xl lg:static lg:w-80 lg:shadow-none lg:z-auto flex flex-col transition-transform">
        <div className="h-14 lg:h-16 border-b border-slate-100 flex items-center justify-between px-4 shrink-0 bg-white">
          <h3 className="font-semibold text-slate-800">Thông tin phòng</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-50 text-slate-500">
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Các Tab */}
        <div className="flex px-4 pt-4 pb-2 border-b border-slate-100 gap-4 shrink-0 bg-white">
          {['MEMBERS', 'MEDIA', 'FILES'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`text-xs font-semibold pb-2 border-b-2 transition ${
                activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab === 'MEMBERS' ? 'Thành viên' : tab === 'MEDIA' ? 'Ảnh' : 'Tài liệu'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 relative">
          {loading ? (
            <Spinner loading={loading} />
          ) : (
            <div className="p-4 space-y-6">
              
              {/* TAB THÀNH VIÊN */}
              {activeTab === 'MEMBERS' && (
                <div className="space-y-4">
                  {/* Nút Tạo Nhóm / Thêm thành viên mở Modal */}
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="w-full flex items-center gap-3 p-3 bg-white border border-slate-200 border-dashed rounded-xl text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition font-medium text-sm"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <FiUserPlus />
                    </div>
                    {isGroupChat ? 'Thêm thành viên mới' : 'Tạo nhóm mới từ đoạn chat'}
                  </button>

                  <div className="space-y-1 bg-white rounded-xl border border-slate-100 overflow-hidden">
                    {members.map((m) => {
                      const displayName = m.name || m.email?.split('@')[0] || 'Thành viên';
                      return (
                        <div key={m._id} className="flex items-center justify-between p-3 border-b border-slate-50 last:border-0">
                          <div className="flex items-center gap-3 min-w-0">
                            {m.avatar ? (
                              <img
                                src={m.avatar}
                                alt={displayName}
                                className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center text-xs shrink-0">
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-700 truncate">
                                {displayName} {m._id === currentUser?._id && <span className="text-slate-400 font-normal">(Bạn)</span>}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">{currentRoom.createdBy === m._id ? 'Chủ phòng' : 'Thành viên'}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Danger Zone */}
                  <div className="pt-4 space-y-2">
                    {isGroupChat && (
                      <button
                        onClick={handleLeave}
                        className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 transition text-sm font-semibold"
                      >
                        <FiLogOut /> Rời nhóm
                      </button>
                    )}

                    {(!isGroupChat || isCreator) && (
                      <button
                        onClick={handleDelete}
                        className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-white bg-rose-500 hover:bg-rose-600 transition text-sm font-semibold shadow-sm"
                      >
                        <FiTrash2 /> {isGroupChat ? 'Xóa nhóm' : 'Xóa phòng & lịch sử'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB ẢNH (MEDIA) */}
              {activeTab === 'MEDIA' && (
                <div className="grid grid-cols-3 gap-2">
                  {mediaFiles.length === 0 ? (
                    <p className="text-xs text-slate-400 col-span-3 text-center py-4">Chưa có ảnh nào.</p>
                  ) : (
                    mediaFiles.map((file) => (
                      <a key={file.gridfsFileId} href={getPreviewUrl(file.gridfsFileId)} target="_blank" rel="noreferrer" className="aspect-square bg-slate-200 rounded-lg overflow-hidden border border-slate-100 hover:opacity-90 transition">
                        <img src={getPreviewUrl(file.gridfsFileId)} alt={file.name} className="w-full h-full object-cover" />
                      </a>
                    ))
                  )}
                </div>
              )}

              {/* TAB TÀI LIỆU (FILES) */}
              {activeTab === 'FILES' && (
                <div className="space-y-2">
                  {otherFiles.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Chưa có tài liệu nào.</p>
                  ) : (
                    otherFiles.map((file) => (
                      <a
                        key={file.gridfsFileId}
                        href={getDownloadUrl(file.gridfsFileId)}
                        className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition"
                      >
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                          <FiFile className="text-xl" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                          <p className="text-[10px] text-slate-400">{file.size ? (file.size / 1024).toFixed(1) + ' KB' : 'File'}</p>
                        </div>
                        <FiDownload className="text-slate-400 hover:text-indigo-600 shrink-0" />
                      </a>
                    ))
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      {/* Modal: Thêm thành viên / Tạo nhóm */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">
                {isGroupChat ? 'Thêm thành viên' : 'Tạo nhóm chat'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg">
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              {!isGroupChat && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Tên nhóm mới</label>
                  <input
                    type="text"
                    placeholder="VD: Nhóm siêu cấp..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-400 focus:bg-white outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Tìm kiếm người dùng</label>
                <input
                  type="text"
                  placeholder="Nhập tên để tìm kiếm..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-400 focus:bg-white outline-none"
                />
              </div>

              {/* Danh sách người được chọn */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map(u => (
                    <div key={u._id} className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-lg font-medium border border-indigo-100">
                      {u.name}
                      <button onClick={() => toggleSelectUser(u)} className="hover:text-rose-500"><FiX /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Kết quả tìm kiếm */}
              <div className="space-y-1">
                {isSearching ? (
                  <p className="text-xs text-slate-400 text-center py-4">Đang tìm...</p>
                ) : modalSearch.trim() && modalSearchResults.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Không tìm thấy người dùng</p>
                ) : (
                  modalSearchResults.map(u => {
                    const isSelected = selectedUsers.some(su => su._id === u._id);
                    return (
                      <button
                        key={u._id}
                        onClick={() => toggleSelectUser(u)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition border ${
                          isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-500 text-white font-bold flex items-center justify-center text-xs shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-semibold text-slate-700">{u.name}</p>
                            <p className="text-[10px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                        {isSelected && <FiCheck className="text-indigo-600" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition"
              >
                Hủy
              </button>
              <button
                disabled={selectedUsers.length === 0 || isSubmitting}
                onClick={handleConfirmAddMembers}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default RoomDetail;
