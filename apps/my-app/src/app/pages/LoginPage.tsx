import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';
import { BsChatSquareDots } from 'react-icons/bs';
import { NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useBearerTokenStore } from '../stores/auth.store';
import { getMe, loginApi } from '../services/auth.service';

const LoginSchema = z.object({
  email: z
    .string({ message: 'Email is required' })
    .trim()
    .email('Email không hợp lệ'),
  password: z
    .string({ message: 'Password is required' })
    .min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

type LoginFormInputs = z.infer<typeof LoginSchema>;

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const setToken = useBearerTokenStore((state) => state.setToken);
  const setUser = useBearerTokenStore((state) => state.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginFormInputs) => {
    try {
      setIsLoading(true);
      setServerError(null);

      const result = await loginApi(data);
      setToken(result.accessToken);

      const user = await getMe();
      setUser(user);

      toast.success('Đăng nhập thành công');
      navigate('/');
    } catch (err: any) {
      setServerError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4 select-none">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-8 shadow-xs">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <BsChatSquareDots className="text-2xl stroke-[0.3]" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Welcome back
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Sign in to continue to your workspace
          </p>
        </div>

        {serverError && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 text-xs text-center font-medium">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email Address
            </label>
            <div className="relative flex items-center">
              <FiMail className="absolute left-3.5 text-slate-400 text-sm pointer-events-none" />
              <input
                type="email"
                {...register('email')}
                placeholder="tam@gmail.com"
                className={`w-full pl-10 pr-4 py-2.5 text-xs text-slate-800 bg-white border rounded-xl focus:outline-none transition ${
                  errors.email
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-slate-200 focus:border-indigo-500'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-[11px] text-rose-500 mt-1 font-medium">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <NavLink
                to="/forgot-password"
                className="text-[11px] font-medium text-indigo-600 hover:underline"
              >
                Forgot password?
              </NavLink>
            </div>
            <div className="relative flex items-center">
              <FiLock className="absolute left-3.5 text-slate-400 text-sm pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="••••••••"
                className={`w-full pl-10 pr-10 py-2.5 text-xs text-slate-800 bg-white border rounded-xl focus:outline-none transition ${
                  errors.password
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-slate-200 focus:border-indigo-500'
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
              <p className="text-[11px] text-rose-500 mt-1 font-medium">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
            {!isLoading && <FiArrowRight className="text-sm" />}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-xs text-slate-400">
            Don't have an account?{' '}
            <NavLink
              to="/register"
              className="font-semibold text-indigo-600 hover:underline"
            >
              Sign Up
            </NavLink>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
