import { User } from '../types/auth.types';
import { ChatRoom, Member } from '../types/chat.types';

export const getMemberUserId = (member: any): string => {
  if (!member) return '';
  if (member.userId && typeof member.userId === 'object' && member.userId._id) {
    return String(member.userId._id);
  }
  if (member.user && typeof member.user === 'object' && member.user._id) {
    return String(member.user._id);
  }
  if (typeof member.userId === 'string' && member.userId) {
    return String(member.userId);
  }
  if (member._id) {
    return String(member._id);
  }
  return '';
};

export const getMemberName = (member: any): string => {
  if (!member) return '';
  if (member.userId && typeof member.userId === 'object' && member.userId.name) {
    return member.userId.name;
  }
  if (member.user?.name) {
    return member.user.name;
  }
  if (member.name) {
    return member.name;
  }

  // Fallback sang email: lấy tên trước ký tự '@'
  const email =
    (member.userId && typeof member.userId === 'object' ? member.userId.email : '') ||
    member.user?.email ||
    member.email ||
    '';
  if (email && typeof email === 'string') {
    const prefix = email.split('@')[0];
    if (prefix) return prefix;
  }

  return '';
};

export const getMemberAvatar = (member: any): string | null => {
  if (!member) return null;
  return (
    (member.userId && typeof member.userId === 'object' ? member.userId.avatar : null) ||
    member.user?.avatar ||
    member.avatar ||
    null
  );
};

export const isGroupRoom = (room: ChatRoom): boolean => {
  if (room.isGroup) return true;
  return (room.members?.length ?? 0) > 2;
};

export const getRoomDisplayName = (
  room: ChatRoom | null | undefined,
  currentUserId?: string,
  fallbackMessages?: any[],
): string => {
  if (!room) return '';

  const members = room.members || [];

  // Xác định xem có phải là Direct Chat (1-1) hay không:
  const isDirect =
    room.isGroup === false ||
    members.length === 2 ||
    room.name === 'Direct Chat' ||
    !room.name;

  // 1. Tìm tên đối phương trong mảng members
  if (isDirect && currentUserId && members.length > 0) {
    const otherMember = members.find(
      (member) => getMemberUserId(member) !== String(currentUserId),
    );
    if (otherMember) {
      const name = getMemberName(otherMember);
      if (name) return name;
    }
  }

  // 2. FALLBACK 1: Kiểm tra room.lastMessage (tin nhắn gần nhất của phòng)
  if (room.lastMessage) {
    const lastMsgSender = room.lastMessage.sender || room.lastMessage.senderId;
    const lastMsgSenderId = getMemberUserId(lastMsgSender);
    const isFromOther = !currentUserId || (lastMsgSenderId && String(lastMsgSenderId) !== String(currentUserId));
    if (isFromOther) {
      const name = getMemberName(lastMsgSender);
      if (name) return name;
    }
  }

  // 3. FALLBACK 2: Kiểm tra danh sách tin nhắn fallback (fallbackMessages trong ChatBox)
  if (fallbackMessages && Array.isArray(fallbackMessages) && fallbackMessages.length > 0) {
    for (let i = fallbackMessages.length - 1; i >= 0; i--) {
      const msg = fallbackMessages[i];
      const sender = msg.sender || msg.senderId;
      const senderId = getMemberUserId(sender);
      if (currentUserId && senderId && String(senderId) === String(currentUserId)) {
        continue;
      }
      const name = getMemberName(sender);
      if (name) return name;
    }
  }

  // 4. Nếu phòng có đặt tên cụ thể (và không phải chuỗi mặc định 'Direct Chat')
  if (room.name && room.name.trim() && room.name !== 'Direct Chat' && room.name !== 'Người dùng') {
    return room.name;
  }

  // 5. Duyệt bất kỳ thành viên nào có tên
  if (members.length > 0) {
    for (const m of members) {
      if (currentUserId && getMemberUserId(m) === String(currentUserId)) continue;
      const name = getMemberName(m);
      if (name) return name;
    }
  }

  return 'Người dùng';
};

/**
 * Lấy avatar của phòng chat:
 * 1. Từ đối phương trong members.
 * 2. Fallback: từ room.lastMessage.sender.
 * 3. Fallback: từ fallbackMessages.
 */
export const getRoomAvatar = (
  room: ChatRoom | null | undefined,
  currentUserId?: string,
  fallbackMessages?: any[],
): string | null => {
  if (!room) return null;

  const members = room.members || [];
  const isDirect =
    room.isGroup === false ||
    members.length === 2 ||
    room.name === 'Direct Chat' ||
    !room.name;

  if (isDirect && currentUserId && members.length > 0) {
    const otherMember = members.find(
      (member) => getMemberUserId(member) !== String(currentUserId),
    );
    if (otherMember) {
      const avatar = getMemberAvatar(otherMember);
      if (avatar) return avatar;
    }
  }

  // Fallback sang lastMessage
  if (room.lastMessage) {
    const lastMsgSender = room.lastMessage.sender || room.lastMessage.senderId;
    const lastMsgSenderId = getMemberUserId(lastMsgSender);
    if (!currentUserId || (lastMsgSenderId && String(lastMsgSenderId) !== String(currentUserId))) {
      const avatar = getMemberAvatar(lastMsgSender);
      if (avatar) return avatar;
    }
  }

  // Fallback sang fallbackMessages
  if (fallbackMessages && Array.isArray(fallbackMessages) && fallbackMessages.length > 0) {
    for (let i = fallbackMessages.length - 1; i >= 0; i--) {
      const msg = fallbackMessages[i];
      const sender = msg.sender || msg.senderId;
      const senderId = getMemberUserId(sender);
      if (currentUserId && senderId && String(senderId) === String(currentUserId)) continue;
      const avatar = getMemberAvatar(sender);
      if (avatar) return avatar;
    }
  }

  return null;
};

export const findDirectRoomWithUser = (
  rooms: ChatRoom[],
  targetUser: User,
): ChatRoom | undefined => {
  return rooms.find((room) => {
    if (isGroupRoom(room)) return false;
    return room.members?.some(
      (member) => getMemberUserId(member) === String(targetUser._id),
    );
  });
};
