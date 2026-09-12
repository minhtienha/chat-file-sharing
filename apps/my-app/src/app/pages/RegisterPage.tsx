import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FiUser,
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
} from 'react-icons/fi';
import { BsChatSquareDots } from 'react-icons/bs';
import { NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { registerApi } from '../services/auth.service';

const RegisterSchema = z.object({
  name: z
    .string({ message: 'Name is required' })
    .trim()
    .min(2, 'Tên tối thiểu 2 ký tự'),
  email: z
    .string({ message: 'Email is required' })
    .trim()
    .email('Email không hợp lệ'),
  password: z
    .string({ message: 'Password is required' })
    .min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

type RegisterFormInputs = z.infer<typeof RegisterSchema>;

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(RegisterSchema),
  });

  const onSubmit = async (data: RegisterFormInputs) => {
    try {
      setIsLoading(true);
      setServerError(null);

      await registerApi(data);
      toast.success('Đăng ký thành công');
      navigate('/login');
    } catch (err: any) {
      setServerError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100 p-4 select-none relative overflow-hidden">
      {/* Hiệu ứng ánh sáng nền mờ ảo */}
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-teal-100/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-xl border border-slate-200/70 rounded-3xl p-8 sm:p-9 shadow-xl shadow-slate-200/50">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center mb-3 shadow-md shadow-indigo-200">
            <BsChatSquareDots className="text-2xl" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            Tạo tài khoản mới
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Bắt đầu trải nghiệm trò chuyện và chia sẻ tệp tốc độ cao
          </p>
        </div>

        {serverError && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs text-center font-medium">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
              Họ và tên
            </label>
            <div className="relative flex items-center">
              <FiUser className="absolute left-3.5 text-slate-400 text-sm pointer-events-none" />
              <input
                type="text"
                {...register('name')}
                placeholder="Nguyễn Văn A"
                className={`w-full pl-10 pr-4 py-2.5 text-xs text-slate-800 bg-slate-50/50 border rounded-xl focus:bg-white focus:outline-none transition-all ${
                  errors.name
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                    : 'border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                }`}
              />
            </div>
            {errors.name && (
              <p className="text-[11px] text-rose-500 mt-1.5 font-medium ml-1">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
              Địa chỉ Email
            </label>
            <div className="relative flex items-center">
              <FiMail className="absolute left-3.5 text-slate-400 text-sm pointer-events-none" />
              <input
                type="email"
                {...register('email')}
                placeholder="nguyenvana@gmail.com"
                className={`w-full pl-10 pr-4 py-2.5 text-xs text-slate-800 bg-slate-50/50 border rounded-xl focus:bg-white focus:outline-none transition-all ${
                  errors.email
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                    : 'border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-[11px] text-rose-500 mt-1.5 font-medium ml-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
              Mật khẩu
            </label>
            <div className="relative flex items-center">
              <FiLock className="absolute left-3.5 text-slate-400 text-sm pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="••••••••"
                className={`w-full pl-10 pr-10 py-2.5 text-xs text-slate-800 bg-slate-50/50 border rounded-xl focus:bg-white focus:outline-none transition-all ${
                  errors.password
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                    : 'border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                {showPassword ? (
                  <FiEyeOff className="text-sm" />
                ) : (
                  <FiEye className="text-sm" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-rose-500 mt-1.5 font-medium ml-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.99] text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isLoading && (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</span>
            {!isLoading && <FiArrowRight className="text-sm" />}
          </button>
        </form>

        <div className="text-center mt-6 pt-5 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Đã có tài khoản?{' '}
            <NavLink
              to="/login"
              className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              Đăng nhập
            </NavLink>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
