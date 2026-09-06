import { useState, useEffect } from 'react';
import { FiX, FiSearch, FiCheck } from 'react-icons/fi';
import { HiOutlineUserGroup } from 'react-icons/hi2';
import { searchUsers, createChatRoom } from '../../services/chatRoom.service';
import { CreateRoomModalProps, User } from '../../types/index';

export const CreateRoomModal = ({
  isOpen,
  onClose,
  onSuccess,
}: CreateRoomModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await searchUsers(searchTerm);
        setSearchResults(Array.isArray(data) ? data : data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, isOpen]);

  // Reset state khi đóng mở modal
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSearchResults([]);
      setSelectedUsers([]);
      setGroupName('');
    }
  }, [isOpen]);

  const toggleSelectUser = (user: User) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u._id === user._id)
        ? prev.filter((u) => u._id !== user._id)
        : [...prev, user],
    );
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;

    try {
      setSubmitting(true);
      const isGroup = selectedUsers.length > 1;
      const roomName = isGroup ? groupName.trim() : 'Direct Chat';

      const newRoom = await createChatRoom({
        name: roomName,
        memberIds: selectedUsers.map((u) => u._id),
      });

      onSuccess(newRoom);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isGroup = selectedUsers.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <HiOutlineUserGroup className="text-lg" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Tạo cuộc trò chuyện
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Ô nhập tên nhóm (chỉ hiện khi chọn từ 2 người trở lên) */}
          {isGroup && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Tên nhóm
              </label>
              <input
                type="text"
                placeholder="Nhập tên nhóm trò chuyện..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Ô tìm kiếm User */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Thành viên ({selectedUsers.length} đã chọn)
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên hoặc email..."
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Danh sách User tìm được */}
          <div className="max-h-56 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-1">
            {loading ? (
              <p className="text-center text-xs text-slate-400 py-6">
                Đang tìm kiếm...
              </p>
            ) : searchResults.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">
                Không tìm thấy người dùng nào
              </p>
            ) : (
              searchResults.map((user) => {
                const isSelected = selectedUsers.some(
                  (u) => u._id === user._id,
                );
                return (
                  <div
                    key={user._id}
                    onClick={() => toggleSelectUser(user)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                      isSelected
                        ? 'bg-indigo-50/70 text-indigo-700'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-xs font-semibold truncate">
                          {user.name}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">
                          {user.email}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <FiCheck className="text-[10px] stroke-[3]" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleCreate}
            disabled={
              submitting ||
              selectedUsers.length === 0 ||
              (isGroup && !groupName.trim())
            }
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition cursor-pointer"
          >
            {submitting ? 'Đang tạo...' : isGroup ? 'Tạo nhóm' : 'Nhắn tin'}
          </button>
        </div>
      </div>
    </div>
  );
};
