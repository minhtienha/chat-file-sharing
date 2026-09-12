import { User } from './auth.types';

export interface Member {
  _id: string;
  userId?: string;
  user?: User;
}

export interface MessageAttachment {
  gridfsFileId: string;
  name: string;
  contentType?: string;
  size?: number;
}

export interface Message {
  _id: string;
  content?: string;
  attachments?: MessageAttachment[];
  senderId?: string | { _id: string };
  sender?: User;
  roomId?: string;
  type?: 'TEXT' | 'FILE' | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatRoom {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isPublic?: boolean;
  isGroup?: boolean;
  lastMessage?: Message;
  members?: Member[];
  unreadCount?: number;
  lastReadAt?: string;
}

export interface RoomDetailsProps {
  currentRoom: ChatRoom;
  isOpen: boolean;
}

export interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRoom: ChatRoom) => void;
}
