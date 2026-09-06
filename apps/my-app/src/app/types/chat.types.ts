import { User } from './auth.types';

export interface Member {
  _id: string;
  user: User;
}

export interface Message {
  _id: string;
  content: string;
  senderId?: string;
  sender?: User;
  roomId?: string;
  type?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatRoom {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isPublic: boolean;
  lastMessage?: Message;
  members?: Member[];
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
