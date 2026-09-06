import { useState, useEffect } from 'react';
import {
  FiX,
  FiCopy,
  FiCheck,
  FiClock,
  FiShare2,
  FiTrash2,
  FiPlus,
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { DriveFile, ShareLinkResponse } from '../../types/drive.types';
import {
  createShareLink,
  updateShareLinkStatus,
  getFileShareLinks,
  deleteShareLink,
} from '../../services/drive.service';

const FILE_API_URL = 'http://localhost:3002/api/files';

interface ShareModalProps {
  file: DriveFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal = ({ file, isOpen, onClose }: ShareModalProps) => {
  const [links, setLinks] = useState<ShareLinkResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expireInHours, setExpireInHours] = useState(24);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchLinks = async () => {
    if (!file) return;
    try {
      setLoading(true);
      const data = await getFileShareLinks(file._id);
      setLinks(data);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tải danh sách liên kết');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && file) {
      fetchLinks();
    }
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const handleCreate = async () => {
    try {
      setCreating(true);
      await createShareLink(file._id, expireInHours);
      toast.success('Đã tạo liên kết chia sẻ mới');
      await fetchLinks();
    } catch (err: any) {
      toast.error(err.message || 'Không thể tạo liên kết');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (token: string) => {
    const url = `${FILE_API_URL}/shared/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast.success('Đã chép link vào clipboard');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleToggle = async (token: string, currentStatus: boolean) => {
    try {
      await updateShareLinkStatus(token, !currentStatus);
      setLinks((prev) =>
        prev.map((item) =>
          item.linkToken === token
            ? { ...item, isActive: !currentStatus }
            : item,
        ),
      );
      toast.success(
        !currentStatus ? 'Đã kích hoạt liên kết' : 'Đã tạm dừng liên kết',
      );
    } catch (err: any) {
      toast.error(err.message || 'Lỗi thay đổi trạng thái');
    }
  };

  const handleDelete = async (token: string) => {
    if (
      !confirm(
        'Bạn có chắc muốn hủy bỏ liên kết này? Người có link sẽ không thể truy cập nữa.',
      )
    )
      return;
    try {
      await deleteShareLink(token);
      setLinks((prev) => prev.filter((item) => item.linkToken !== token));
      toast.success('Đã xóa liên kết thành công');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa liên kết');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FiShare2 className="text-base" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Quản lý liên kết chia sẻ
              </h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[280px]">
                {file.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        {/* Section tạo link mới */}
        <div className="py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1">
              <FiClock className="text-slate-400" />
              <span>Thời hạn liên kết</span>
            </div>
            <select
              value={expireInHours}
              onChange={(e) => setExpireInHours(Number(e.target.value))}
              className="w-full px-3 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value={1}>1 giờ</option>
              <option value={24}>24 giờ (1 ngày)</option>
              <option value={168}>7 ngày</option>
            </select>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="self-end px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <FiPlus className="text-sm" />
            <span>{creating ? 'Đang tạo...' : 'Tạo link mới'}</span>
          </button>
        </div>

        {/* Danh sách link đã tạo */}
        <div className="pt-4">
          <p className="text-xs font-bold text-slate-500 mb-2">
            Các liên kết hiện có ({links.length})
          </p>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Đang tải danh sách...
              </p>
            ) : links.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Chưa có liên kết chia sẻ nào cho tệp này
              </p>
            ) : (
              links.map((link) => {
                const isExpired = new Date() > new Date(link.expiryDate);
                return (
                  <div
                    key={link._id}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-700 truncate max-w-[180px]">
                          .../shared/{link.linkToken.slice(0, 10)}...
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${
                            isExpired
                              ? 'bg-rose-50 text-rose-600'
                              : link.isActive
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isExpired
                            ? 'Hết hạn'
                            : link.isActive
                              ? 'Đang bật'
                              : 'Tạm dừng'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Hết hạn:{' '}
                        {new Date(link.expiryDate).toLocaleString('vi-VN')}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Bật/tắt */}
                      {!isExpired && (
                        <button
                          onClick={() =>
                            handleToggle(link.linkToken, link.isActive)
                          }
                          className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer ${
                            link.isActive ? 'bg-indigo-600' : 'bg-slate-300'
                          }`}
                          title={
                            link.isActive
                              ? 'Tạm dừng truy cập'
                              : 'Bật lại truy cập'
                          }
                        >
                          <span
                            className={`block w-3 h-3 rounded-full bg-white transition-transform transform ${
                              link.isActive
                                ? 'translate-x-3.5'
                                : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      )}

                      {/* Copy */}
                      <button
                        onClick={() => handleCopy(link.linkToken)}
                        disabled={!link.isActive || isExpired}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition disabled:opacity-30 cursor-pointer"
                        title="Sao chép liên kết"
                      >
                        {copiedToken === link.linkToken ? (
                          <FiCheck className="text-sm text-emerald-600" />
                        ) : (
                          <FiCopy className="text-sm" />
                        )}
                      </button>

                      {/* Xóa link */}
                      <button
                        onClick={() => handleDelete(link.linkToken)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition cursor-pointer"
                        title="Xóa vĩnh viễn liên kết"
                      >
                        <FiTrash2 className="text-sm" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
