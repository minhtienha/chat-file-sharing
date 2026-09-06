import { useEffect, useState, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { useBearerTokenStore } from '../../stores/auth.store';
import { getMe, refreshTokenApi } from '../../services/auth.service';

export const AuthInit = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const setToken = useBearerTokenStore((state) => state.setToken);
  const setUser = useBearerTokenStore((state) => state.setUser);
  const clearAuth = useBearerTokenStore((state) => state.clearAuth);

  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    const initializeAuth = async () => {
      try {
        const newAccessToken = await refreshTokenApi();

        if (!newAccessToken) throw new Error('Không thể refresh token');

        setToken(newAccessToken);

        const user = await getMe();
        setUser(user);
      } catch (error) {
        clearAuth();
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, [setToken, setUser, clearAuth]);

  if (isInitializing) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <Outlet />;
};
