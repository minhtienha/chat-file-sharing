export const getRoomDisplayName = (
  room: any,
  currentUserId?: string,
): string => {
  if (!room) return '';

  const members = room.members || [];
  const isDirect = members.length === 2;

  if (isDirect && currentUserId) {
    const otherMember = members.find(
      (m: any) => (m.userId || m.user?._id) !== currentUserId,
    );
    if (otherMember?.user?.name) {
      return otherMember.user.name;
    }
  }

  return room.name || 'Cuộc trò chuyện';
};
