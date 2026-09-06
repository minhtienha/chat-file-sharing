import { useBearerTokenStore } from '../stores/auth.store';
import { DriveFile, ShareLinkResponse } from '../types/drive.types';

const FILE_API_URL = 'http://localhost:3002/api/files';

const getAuthHeaders = (isJson = false) => {
  const token = useBearerTokenStore.getState().accessToken;
  return {
    Authorization: `Bearer ${token}`,
    ...(isJson ? { 'Content-Type': 'application/json' } : {}),
  };
};

export const getMyFiles = async (): Promise<DriveFile[]> => {
  const res = await fetch(`${FILE_API_URL}/my-files`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Không thể tải danh sách file');
  const data = await res.json();
  return Array.isArray(data) ? data : data.data || [];
};

export const uploadFiles = async (
  files: FileList | File[],
): Promise<DriveFile[]> => {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('file', file));

  const token = useBearerTokenStore.getState().accessToken;
  const res = await fetch(`${FILE_API_URL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) throw new Error('Tải lên file thất bại (tối đa 5MB/file)');
  return res.json();
};

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
