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

export const isGroupRoom = (room: ChatRoom | null | undefined): boolean => {
  if (!room) return false;
  if (room.isGroup === true) return true;
  if ((room.members?.length ?? 0) > 2) return true;

  const roomName = room.name?.trim();
  if (
    roomName &&
    roomName !== 'Direct Chat' &&
    roomName !== 'Cuộc trò chuyện' &&
    roomName !== 'Người dùng'
  ) {
    if (room.members && room.members.length > 0) {
      const isMemberName = room.members.some((m) => {
        const mName = getMemberName(m)?.trim();
        return mName && mName.toLowerCase() === roomName.toLowerCase();
      });
      if (!isMemberName) {
        return true;
      }
    } else if (room.isGroup !== false) {
      return true;
    }
  }

  return false;
};

export const getRoomDisplayName = (
  room: ChatRoom | null | undefined,
  currentUserId?: string,
  fallbackMessages?: any[],
): string => {
  if (!room) return '';

  const members = room.members || [];
  const roomName = room.name?.trim() || '';

  // 1. NHÓM CHAT / PHÒNG CÓ TÊN RIÊNG:
  if (isGroupRoom(room)) {
    // Nếu có tên phòng đặt riêng (ví dụ "học bài") -> Luôn luôn hiển thị tên phòng này
    if (
      roomName &&
      roomName !== 'Direct Chat' &&
      roomName !== 'Cuộc trò chuyện' &&
      roomName !== 'Người dùng'
    ) {
      return roomName;
    }

    // Nếu là nhóm nhưng không đặt tên riêng: Liệt kê tên các thành viên khác
    if (members.length > 0) {
      const otherNames = members
        .filter((m) => !currentUserId || getMemberUserId(m) !== String(currentUserId))
        .map((m) => getMemberName(m))
        .filter(Boolean);

      if (otherNames.length > 0) {
        return otherNames.slice(0, 3).join(', ') + (otherNames.length > 3 ? '...' : '');
      }
    }

    return 'Nhóm trò chuyện';
  }

  // 2. DIRECT CHAT (1-1):
  // Luôn luôn hiển thị tên của ĐỐI PHƯƠNG (người chat cùng, khác với currentUserId)

  // 2.1. Tìm đối phương trong mảng members
  if (currentUserId && members.length > 0) {
    const otherMember = members.find(
      (m) => getMemberUserId(m) !== String(currentUserId),
    );
    if (otherMember) {
      const name = getMemberName(otherMember);
      if (name) return name;
    }
  }

  // 2.2. Kiểm tra nếu roomName không phải tên của currentUser và không phải generic
  if (
    roomName &&
    roomName !== 'Direct Chat' &&
    roomName !== 'Cuộc trò chuyện' &&
    roomName !== 'Người dùng'
  ) {
    const currentUserMember = members.find(
      (m) => currentUserId && getMemberUserId(m) === String(currentUserId),
    );
    const myName = currentUserMember ? getMemberName(currentUserMember) : '';
    if (!myName || roomName.toLowerCase() !== myName.toLowerCase()) {
      return roomName;
    }
  }

  // 2.3. Fallback: Nếu members chưa kịp tải, tìm tin nhắn của đối phương (lastMessage hoặc fallbackMessages)
  if (room.lastMessage) {
    const lastMsgSender = room.lastMessage.sender || room.lastMessage.senderId;
    const lastMsgSenderId = getMemberUserId(lastMsgSender);
    if (currentUserId && lastMsgSenderId && String(lastMsgSenderId) !== String(currentUserId)) {
      const name = getMemberName(lastMsgSender);
      if (name) return name;
    }
  }

  if (fallbackMessages && Array.isArray(fallbackMessages) && fallbackMessages.length > 0) {
    for (let i = fallbackMessages.length - 1; i >= 0; i--) {
      const msg = fallbackMessages[i];
      const sender = msg.sender || msg.senderId;
      const senderId = getMemberUserId(sender);
      if (currentUserId && senderId && String(senderId) !== String(currentUserId)) {
        const name = getMemberName(sender);
        if (name) return name;
      }
    }
  }

  // 2.4. Duyệt bất kỳ thành viên nào trong members khác currentUserId
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
 * 1. Nhóm chat: Không lấy avatar của người gửi tin nhắn, trả về null (để render icon nhóm/chữ cái đầu)
 * 2. Direct chat 1-1: Luôn lấy avatar của đối phương
 */
export const getRoomAvatar = (
  room: ChatRoom | null | undefined,
  currentUserId?: string,
  fallbackMessages?: any[],
): string | null => {
  if (!room) return null;

  // 1. NHÓM CHAT:
  if (isGroupRoom(room)) {
    return (room as any).avatar || null;
  }

  // 2. DIRECT CHAT (1-1): Luôn lấy avatar của ĐỐI PHƯƠNG
  const members = room.members || [];

  // 2.1. Lấy từ otherMember trong members
  if (currentUserId && members.length > 0) {
    const otherMember = members.find(
      (m) => getMemberUserId(m) !== String(currentUserId),
    );
    if (otherMember) {
      const avatar = getMemberAvatar(otherMember);
      if (avatar) return avatar;
    }
  }

  // 2.2. Fallback sang lastMessage nếu từ đối phương
  if (room.lastMessage) {
    const lastMsgSender = room.lastMessage.sender || room.lastMessage.senderId;
    const lastMsgSenderId = getMemberUserId(lastMsgSender);
    if (currentUserId && lastMsgSenderId && String(lastMsgSenderId) !== String(currentUserId)) {
      const avatar = getMemberAvatar(lastMsgSender);
      if (avatar) return avatar;
    }
  }

  // 2.3. Fallback sang fallbackMessages nếu từ đối phương
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
