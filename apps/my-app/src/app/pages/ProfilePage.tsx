import { useState, useRef, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiLogOut,
  FiMail,
  FiUser,
  FiCamera,
  FiLock,
  FiShield,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiSave,
} from 'react-icons/fi';
import { useBearerTokenStore } from '../stores/auth.store';
import { getSocket } from '../services/socket';
import { logoutApi, updateProfile } from '../services/auth.service';
import { uploadFiles, getPreviewUrl } from '../services/drive.service';
import { toast } from 'react-toastify';

type ActiveTab = 'profile' | 'security';

const ProfilePage = () => {
  const user = useBearerTokenStore((state) => state.user);
  const setUser = useBearerTokenStore((state) => state.setUser);
  const clearAuth = useBearerTokenStore((state) => state.clearAuth);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Họ tên không được để trống');

    setLoading(true);
    try {
      const updatedUser = await updateProfile({ name });
      setUser(updatedUser);
      toast.success('Đã cập nhật thông tin hồ sơ');
    } catch (err: any) {
      toast.error(err.message || 'Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      return toast.error('Vui lòng nhập mật khẩu mới');
    }
    if (password.length < 6) {
      return toast.error('Mật khẩu tối thiểu 6 ký tự');
    }
    if (password !== confirmPassword) {
      return toast.error('Mật khẩu xác nhận không khớp');
    }

    setLoading(true);
    try {
      await updateProfile({ password });
      setPassword('');
      setConfirmPassword('');
      toast.success('Đã thay đổi mật khẩu thành công');
    } catch (err: any) {
      toast.error(err.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return toast.error('Vui lòng chọn file hình ảnh');
    }

    try {
      setUploadingAvatar(true);
      const uploaded = await uploadFiles([file], 'avatar');
      if (uploaded && uploaded.length > 0) {
        const gridfsId = uploaded[0].gridfsFileId;
        const updatedUser = await updateProfile({ avatar: gridfsId });
        setUser(updatedUser);
        toast.success('Đã cập nhật ảnh đại diện thành công');
      }
    } catch (err) {
      toast.error('Lỗi khi tải ảnh lên');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50/60 p-4 lg:p-8 select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header trang */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Cài đặt & Hồ sơ</h1>
          <p className="text-xs text-slate-400 font-medium">
            Quản lý thông tin tài khoản, tùy chọn bảo mật và phiên đăng nhập của bạn
          </p>
        </div>

        {/* Thẻ Hồ Sơ Lớn (Profile Hero Card) */}
        <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-xs relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative group cursor-pointer shrink-0" onClick={() => !uploadingAvatar && fileInputRef.current?.click()}>
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-slate-100 shadow-md overflow-hidden bg-slate-100">
              {uploadingAvatar ? (
                <div className="flex flex-col items-center justify-center gap-1">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[9px] text-indigo-600 font-bold">Đang tải</span>
                </div>
              ) : user?.avatar ? (
                <img src={getPreviewUrl(user.avatar)} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-teal-400 to-indigo-500 text-white flex items-center justify-center font-bold">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>

            <div
              className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 rounded-full shadow-md flex items-center justify-center text-white border-2 border-white group-hover:scale-110 transition-transform"
              title="Đổi ảnh đại diện"
            >
              <FiCamera className="text-sm" />
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0 space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800 truncate">{user?.name}</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100/60 w-fit mx-auto sm:mx-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Trực tuyến
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium truncate">{user?.email}</p>
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-100/50">
                Workspace Member
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-medium">
                Relay Cloud Account
              </span>
            </div>
          </div>
        </div>

        {/* Bố cục Responsive: Desktop 2 Cột (Tabs bên trái, Nội dung bên phải) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột Tabs Điều Hướng */}
          <div className="lg:col-span-4 space-y-1">
            <div className="bg-white rounded-2xl border border-slate-200/70 p-2 shadow-xs space-y-1">
              {[
                { id: 'profile', label: 'Thông tin cá nhân', icon: FiUser },
                { id: 'security', label: 'Bảo mật & Mật khẩu', icon: FiShield },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id as ActiveTab)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`text-base ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="my-1.5 border-t border-slate-100" />

              {/* Nút Đăng xuất trực tiếp - Nhấn vào có hỏi xác nhận */}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?')) {
                    handleLogout();
                  }
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all cursor-pointer group"
                title="Đăng xuất"
              >
                <FiLogOut className="text-base text-rose-500 group-hover:scale-110 transition-transform" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>

          {/* Cột Nội Dung Chi Tiết */}
          <div className="lg:col-span-8">
            {/* TAB 1: THÔNG TIN CÁ NHÂN */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-xs space-y-6 animate-in fade-in duration-150">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-slate-800">Thông tin cá nhân</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cập nhật họ tên hiển thị trong các cuộc trò chuyện
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
                      Họ và tên
                    </label>
                    <div className="relative flex items-center">
                      <FiUser className="absolute left-3.5 text-slate-400 text-sm pointer-events-none" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Họ và tên của bạn"
                        className="w-full pl-10 pr-4 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-200/70 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
                      Địa chỉ Email
                    </label>
                    <div className="relative flex items-center">
                      <FiMail className="absolute left-3.5 text-slate-400 text-sm pointer-events-none" />
                      <input
                        type="email"
                        disabled
                        value={user?.email || ''}
                        className="w-full pl-10 pr-12 py-2.5 text-xs text-slate-500 bg-slate-100/70 border border-slate-200/60 rounded-xl cursor-not-allowed font-medium"
                      />
                      <span className="absolute right-3 text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <FiCheck />
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 ml-1">
                      Email được liên kết cố định với tài khoản Relay của bạn
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.99] text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-200 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <FiSave className="text-sm" />
                      <span>{loading ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: BẢO MẬT & MẬT KHẨU */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-xs space-y-6 animate-in fade-in duration-150">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-bold text-slate-800">Đổi mật khẩu</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Để bảo vệ tài khoản, hãy sử dụng mật khẩu mạnh tối thiểu 6 ký tự
                  </p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
                      Mật khẩu mới
                    </label>
                    <div className="relative flex items-center">
                      <FiLock className="absolute left-3.5 text-slate-400 text-sm pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-200/70 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                      >
                        {showPassword ? <FiEyeOff className="text-sm" /> : <FiEye className="text-sm" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
                      Xác nhận mật khẩu mới
                    </label>
                    <div className="relative flex items-center">
                      <FiLock className="absolute left-3.5 text-slate-400 text-sm pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-200/70 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading || !password}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.99] text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-200 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <FiSave className="text-sm" />
                      <span>{loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
