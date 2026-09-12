import { useState, useRef, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLogOut, FiMail, FiUser, FiEdit2, FiCamera } from 'react-icons/fi';
import { useBearerTokenStore } from '../stores/auth.store';
import { getSocket } from '../services/socket';
import { logoutApi, updateProfile } from '../services/auth.service';
import { uploadFiles, getPreviewUrl } from '../services/drive.service';
import { toast } from 'react-toastify';

const ProfilePage = () => {
  const user = useBearerTokenStore((state) => state.user);
  const setUser = useBearerTokenStore((state) => state.setUser);
  const clearAuth = useBearerTokenStore((state) => state.clearAuth);
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch (err) {} 
    finally {
      const socket = getSocket();
      if (socket?.connected) socket.disconnect();
      clearAuth();
      navigate('/login');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Họ tên không được để trống');
    
    setLoading(true);
    try {
      const payload: any = { name };
      if (password.trim()) payload.password = password;

      const updatedUser = await updateProfile(payload);
      setUser(updatedUser);
      setIsEditing(false);
      setPassword('');
      toast.success('Cập nhật thông tin thành công');
    } catch (err: any) {
      toast.error(err.message || 'Cập nhật thất bại');
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
      const uploaded = await uploadFiles([file]);
      if (uploaded && uploaded.length > 0) {
        const gridfsId = uploaded[0].gridfsFileId;
        const updatedUser = await updateProfile({ avatar: gridfsId });
        setUser(updatedUser);
        toast.success('Đã cập nhật ảnh đại diện');
      }
    } catch (err) {
      toast.error('Lỗi khi tải ảnh lên');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
        
        {/* Avatar Section */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4 group cursor-pointer" onClick={() => !uploadingAvatar && fileInputRef.current?.click()}>
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-white shadow-md overflow-hidden ${!user?.avatar ? 'bg-gradient-to-tr from-teal-400 to-indigo-500 text-white' : 'bg-slate-100'}`}>
              {uploadingAvatar ? (
                <span className="text-sm font-normal text-white/80">Đang tải...</span>
              ) : user?.avatar ? (
                <img src={getPreviewUrl(user.avatar)} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name ? user.name.charAt(0).toUpperCase() : 'U'
              )}
            </div>
            
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-slate-600 border border-slate-100 group-hover:text-indigo-600 group-hover:scale-110 transition-transform">
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
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">{user?.name}</h1>
          <p className="text-xs font-medium text-slate-400 mt-1">{user?.email}</p>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Họ và tên</label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-400 outline-none transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Mật khẩu mới (Tùy chọn)</label>
              <input
                type="password"
                placeholder="Để trống nếu không muốn đổi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-400 outline-none transition"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setIsEditing(false); setName(user?.name || ''); }}
                className="flex-1 py-2.5 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition text-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition text-sm shadow-sm"
              >
                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-500">
                  <FiUser />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Họ và tên</p>
                  <p className="text-sm font-semibold text-slate-700">{user?.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditing(true)} 
                className="p-2 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition"
              >
                <FiEdit2 className="text-sm" />
              </button>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-500">
                <FiMail />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                <p className="text-sm font-semibold text-slate-700">{user?.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-8 w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
            >
              <FiLogOut className="text-base" />
              Đăng xuất tài khoản
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
