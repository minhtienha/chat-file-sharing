import { useBearerTokenStore } from '../stores/auth.store';

const CHAT_API_URL = 'http://localhost:3003/api';
const USER_API_URL = 'http://localhost:3001/api';

const getAuthHeaders = (isJson = false) => {
  const token = useBearerTokenStore.getState().accessToken;
  return {
    Authorization: `Bearer ${token}`,
    ...(isJson && { 'Content-Type': 'application/json' }),
  };
};

export const searchUsers = async (query: string) => {
  const res = await fetch(
    `${USER_API_URL}/users/search?q=${encodeURIComponent(query)}`,
    {
      headers: getAuthHeaders(),
    },
  );

  if (!res.ok) throw new Error('Không thể tìm kiếm user');
  return res.json();
};

export const getChatRooms = async (search?: string, page = 1, limit = 20) => {
  const params = new URLSearchParams();
  if (search?.trim()) {
    params.append('search', search.trim());
  }
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const queryString = params.toString() ? `?${params.toString()}` : '';

  const res = await fetch(`${CHAT_API_URL}/chat-rooms${queryString}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  return res.json();
};

export const createChatRoom = async (payload: {
  name: string;
  memberIds: string[];
}) => {
  const res = await fetch(`${CHAT_API_URL}/chat-rooms`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('Tạo phòng chat thất bại');
  return res.json();
};

export const getMessages = async (roomId: string, page: number, limit = 20) => {
  const res = await fetch(
    `${CHAT_API_URL}/chat-rooms/${roomId}/messages?page=${page}&limit=${limit}`,
    {
      headers: getAuthHeaders(),
    },
  );

  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  return res.json();
};

export const sendMessage = async (
  roomId: string,
  content: string,
  type: 'TEXT' | 'FILE' = 'TEXT',
) => {
  const res = await fetch(`${CHAT_API_URL}/chat-rooms/${roomId}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ content, type }),
  });

  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  return res.json();
};
