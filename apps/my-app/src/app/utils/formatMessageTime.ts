export const formatMessageTime = (dateString?: string): string => {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 7) {
    return date.toLocaleDateString('vi-VN', { weekday: 'short' });
  }

  const isSameYear = date.getFullYear() === now.getFullYear();

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    ...(isSameYear ? {} : { year: 'numeric' }),
  });
};
