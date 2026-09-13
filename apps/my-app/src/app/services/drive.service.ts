import { useBearerTokenStore } from '../stores/auth.store';
import { DriveFile, ShareLinkResponse } from '../types/drive.types';

const FILE_API_URL =
  import.meta.env.VITE_FILE_API_URL || 'http://localhost:3002/api/files';

const getAuthHeaders = (isJson = false) => {
  const token = useBearerTokenStore.getState().accessToken;
  return {
    Authorization: `Bearer ${token}`,
    ...(isJson ? { 'Content-Type': 'application/json' } : {}),
  };
};

export const getMyFiles = async (page = 1, limit = 20): Promise<{ data: DriveFile[], meta: { page: number; limit: number; total: number; totalPages: number } }> => {
  const res = await fetch(`${FILE_API_URL}/my-files?page=${page}&limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Không thể tải danh sách file');
  const result = await res.json();
  
  // Backwards compatibility just in case API hasn't updated or returns old format
  if (Array.isArray(result)) {
    return { data: result, meta: { page: 1, limit: 20, total: result.length, totalPages: 1 } };
  }
  
  return result;
};

export const uploadFiles = async (
  files: FileList | File[],
  scope: 'drive' | 'chat' | 'avatar' = 'drive',
): Promise<DriveFile[]> => {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('file', file));
  formData.append('scope', scope);

  const token = useBearerTokenStore.getState().accessToken;
  const res = await fetch(`${FILE_API_URL}?scope=${scope}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) throw new Error('Tải lên file thất bại (tối đa 5MB/file)');
  return res.json();
};

export const uploadChatFiles = (files: FileList | File[]) => uploadFiles(files, 'chat');
export const uploadDriveFiles = (files: FileList | File[]) => uploadFiles(files, 'drive');
export const uploadAvatarFile = (file: File) => uploadFiles([file], 'avatar');

export const deleteFile = async (gridfsFileId: string) => {
  const res = await fetch(`${FILE_API_URL}/${gridfsFileId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Xóa file thất bại');
  return res.json();
};

export const createShareLink = async (
  fileId: string,
  expireInHours = 24,
): Promise<ShareLinkResponse> => {
  const res = await fetch(`${FILE_API_URL}/${fileId}/share`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ expireInHours }),
  });
  if (!res.ok) throw new Error('Không thể tạo link chia sẻ');
  return res.json();
};

export const updateShareLinkStatus = async (
  token: string,
  isActive: boolean,
) => {
  const res = await fetch(`${FILE_API_URL}/shared/${token}`, {
    method: 'PATCH',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ isActive }),
  });
  if (!res.ok) throw new Error('Không thể cập nhật trạng thái link chia sẻ');
  return res.json();
};

export const getFileShareLinks = async (
  fileId: string,
): Promise<ShareLinkResponse[]> => {
  const res = await fetch(`${FILE_API_URL}/${fileId}/shares`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Không thể lấy danh sách link chia sẻ');
  const data = await res.json();
  return Array.isArray(data) ? data : data.data || [];
};

export const deleteShareLink = async (token: string) => {
  const res = await fetch(`${FILE_API_URL}/shared/${token}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Không thể xóa liên kết chia sẻ');
  return res.json();
};

export const getDownloadUrl = (gridfsFileId: string) =>
  `${FILE_API_URL}/download/${gridfsFileId}`;
export const getPreviewUrl = (gridfsFileId: string) =>
  `${FILE_API_URL}/${gridfsFileId}`;
