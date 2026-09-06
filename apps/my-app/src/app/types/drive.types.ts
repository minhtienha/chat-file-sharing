export interface DriveFile {
  _id: string;
  name: string;
  extension?: string;
  contentType?: string;
  size: number;
  isShared?: boolean;
  gridfsFileId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShareLinkResponse {
  _id: string;
  fileId: string;
  linkToken: string;
  expiryDate: string;
  isActive: boolean;
}
