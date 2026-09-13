import { useBearerTokenStore } from '../stores/auth.store';

const CHAT_API_URL =
  import.meta.env.VITE_CHAT_API_URL || 'http://localhost:3003/api';
const USER_API_URL =
  import.meta.env.VITE_USER_API_URL || 'http://localhost:3001/api/users';

const getAuthHeaders = (isJson = false) => {
  const token = useBearerTokenStore.getState().accessToken;
  return {
    Authorization: `Bearer ${token}`,
    ...(isJson && { 'Content-Type': 'application/json' }),
  };
};

export const searchUsers = async (query: string) => {
  const res = await fetch(
    `${USER_API_URL}/search?q=${encodeURIComponent(query)}`,
    {
      headers: getAuthHeaders(),
    },
  );
  if (!res.ok) throw new Error('Không thể tìm kiếm user');
  return res.json();
};

export const getChatRooms = async (search?: string, page = 1, limit = 20) => {
  const params = new URLSearchParams();
  if (search?.trim()) params.append('search', search.trim());
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${CHAT_API_URL}/chat-rooms${queryString}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  return res.json();
};

export const getRoomById = async (roomId: string) => {
  const res = await fetch(`${CHAT_API_URL}/chat-rooms/${roomId}`, {
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

export const addMembers = async (roomId: string, memberIds: string[]) => {
  const res = await fetch(`${CHAT_API_URL}/chat-rooms/${roomId}/members`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ memberIds }),
  });
  if (!res.ok) throw new Error('Không thể thêm thành viên');
  return res.json();
};

export const leaveRoom = async (roomId: string) => {
  const res = await fetch(`${CHAT_API_URL}/chat-rooms/${roomId}/leave`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Không thể rời phòng');
  return res.json();
};

export const deleteRoomEntirely = async (roomId: string) => {
  const res = await fetch(`${CHAT_API_URL}/chat-rooms/${roomId}/entire`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Không thể xóa nhóm');
  return res.json();
};

export const getMessages = async (roomId: string, page: number, limit = 20) => {
  const res = await fetch(
    `${CHAT_API_URL}/chat-rooms/${roomId}/messages?page=${page}&limit=${limit}`,
    { headers: getAuthHeaders() },
  );
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  return res.json();
};

export const sendMessage = async (
  roomId: string,
  content: string,
  type: 'TEXT' | 'FILE' = 'TEXT',
  attachments?: any[],
) => {
  const payload: any = {
    type,
    content: content || '',
    attachments: attachments || [],
  };

  const res = await fetch(`${CHAT_API_URL}/chat-rooms/${roomId}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `HTTP error: ${res.status}`);
  }
  return res.json();
};

export const deleteMessage = async (messageId: string) => {
  const res = await fetch(`${CHAT_API_URL}/chat-rooms/messages/${messageId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Không thể xóa tin nhắn');
  return res.json();
};

export const getRoomAttachments = async (roomId: string) => {
  const res = await fetch(`${CHAT_API_URL}/chat-rooms/${roomId}/attachments`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Không thể tải file đính kèm');
  return res.json();
};

export const markAsReadApi = async (roomId: string) => {
  const res = await fetch(`${CHAT_API_URL}/chat-rooms/${roomId}/read`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Không thể đánh dấu đã đọc');
  return res.json();
};

export const deleteRoomApi = async (roomId: string) => {
  const res = await fetch(`${CHAT_API_URL}/chat-rooms/${roomId}/leave`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Không thể xóa cuộc trò chuyện');
  return res.json();
};
