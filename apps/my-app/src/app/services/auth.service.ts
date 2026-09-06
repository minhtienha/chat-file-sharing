import { useBearerTokenStore } from '../stores/auth.store';
import { LoginPayload, RegisterPayload } from '../types/index';

const AUTH_API_URL = 'http://localhost:3000/api/auth';
const USER_API_URL = 'http://localhost:3001/api/users';

export const loginApi = async (payload: LoginPayload) => {
  const res = await fetch(`${AUTH_API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.message || 'Email hoặc mật khẩu không chính xác');
  }

  return result;
};

export const registerApi = async (payload: RegisterPayload) => {
  const res = await fetch(`${AUTH_API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.message || 'Đăng ký không thành công');
  }

  return result;
};

export const refreshTokenApi = async (): Promise<string | null> => {
  try {
    const res = await fetch(`${AUTH_API_URL}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Refresh token failed');
    }

    const data = await res.json();
    const newAccessToken = data.accessToken;

    useBearerTokenStore.getState().setToken(newAccessToken);
    return newAccessToken;
  } catch (error) {
    useBearerTokenStore.getState().clearAuth();
    return null;
  }
};

export const getMe = async () => {
  const token = useBearerTokenStore.getState().accessToken;

  const res = await fetch(`${USER_API_URL}/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP error: ${res.status}`);
  }

  return res.json();
};

export const logoutApi = async () => {
  const res = await fetch(`${AUTH_API_URL}/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Đăng xuất thất bại');
  }
  return res.json();
};
